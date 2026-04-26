import { ZodError } from 'zod'
import type { QueryGraphResponse, QueryRequest, QueryResponse, Suggestion, LibraryItem } from '../types/lexai'
import { normalizeQueryGraphResponse, normalizeQueryResponse } from './lexaiNormalizers'

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

if (import.meta.env.PROD && !configuredApiBaseUrl) {
  throw new Error('Missing VITE_API_BASE_URL. Configure it in the deployment environment.')
}

// Localhost fallback is dev-only. Production deploys must configure VITE_API_BASE_URL.
export const API_BASE_URL = (configuredApiBaseUrl || 'http://127.0.0.1:8010').replace(/\/+$/, '')

export interface HealthResponse {
  status?: string
  service?: string
}

async function readErrorMessage(response: Response): Promise<string> {
  const fallback = response.statusText || 'Request failed'
  const text = await response.text().catch(() => '')

  if (!text) {
    return fallback
  }

  try {
    const body = JSON.parse(text) as {
      detail?: unknown
      message?: unknown
      error?: unknown
    }
    const detail = body.detail ?? body.message ?? body.error

    if (typeof detail === 'string') {
      return detail
    }

    if (detail != null) {
      return JSON.stringify(detail)
    }
  } catch {
    return text
  }

  return fallback
}

function summarizeValidationError(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues
      .slice(0, 5)
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : 'root'
        return `${path}: ${issue.message}`
      })
      .join('; ')
  }

  if (error instanceof Error) {
    return error.message
  }

  return ''
}

function normalizeApiResponse<T>(endpoint: string, raw: unknown, normalize: (raw: unknown) => T): T {
  try {
    return normalize(raw)
  } catch (error) {
    const summary = summarizeValidationError(error)
    const detail = summary ? ` ${summary}` : ''
    throw new Error(`LexAI API response validation failed for ${endpoint}.${detail}`, { cause: error })
  }
}

async function requestRawJson(path: string, init?: RequestInit): Promise<unknown> {
  const method = init?.method ?? 'GET'
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
        ...init?.headers,
      },
    })
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : ''
    throw new Error(
      `Cannot reach LexAI backend at ${API_BASE_URL} for ${method} ${path}.${detail} Check that the backend is running and VITE_API_BASE_URL does not include /api.`,
      { cause: error },
    )
  }

  if (!response.ok) {
    const message = await readErrorMessage(response)
    throw new Error(`LexAI API ${method} ${path} failed (${response.status}): ${message}`)
  }

  try {
    return await response.json()
  } catch {
    throw new Error(`LexAI API ${method} ${path} returned invalid JSON.`)
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  return (await requestRawJson(path, init)) as T
}

export function getHealth(): Promise<HealthResponse> {
  return requestJson<HealthResponse>('/api/health')
}

export async function postQuery(request: QueryRequest): Promise<QueryResponse> {
  const endpoint = '/api/query'
  const raw = await requestRawJson(endpoint, {
    method: 'POST',
    body: JSON.stringify(request),
  })
  return normalizeApiResponse(endpoint, raw, normalizeQueryResponse)
}

export async function getQuery(queryId: string): Promise<QueryResponse> {
  const endpoint = `/api/query/${encodeURIComponent(queryId)}`
  const raw = await requestRawJson(endpoint)
  return normalizeApiResponse(endpoint, raw, normalizeQueryResponse)
}

export async function getQueryGraph(queryId: string): Promise<QueryGraphResponse> {
  const endpoint = `/api/query/${encodeURIComponent(queryId)}/graph`
  const raw = await requestRawJson(endpoint)
  return normalizeApiResponse(endpoint, raw, normalizeQueryGraphResponse)
}

export function getSuggestions(): Promise<Suggestion[]> {
  return requestJson<Suggestion[]>('/api/suggestions')
}

export function getLibrary(): Promise<LibraryItem[]> {
  return requestJson<LibraryItem[]>('/api/library')
}

export function getProductGraph(): Promise<{ nodes: unknown[]; edges: unknown[] }> {
  return requestJson<{ nodes: unknown[]; edges: unknown[] }>('/api/product/graph')
}

export function getExploreGraph(): Promise<{ nodes: unknown[]; edges: string[][] }> {
  return requestJson<{ nodes: unknown[]; edges: string[][] }>('/api/graph/explore')
}

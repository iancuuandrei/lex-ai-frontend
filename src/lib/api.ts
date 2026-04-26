import type { QueryGraphResponse, QueryRequest, QueryResponse } from '../types/lexai'

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/+$/, '')

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

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? 'GET'
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const message = await readErrorMessage(response)
    throw new Error(`LexAI API ${method} ${path} failed (${response.status}): ${message}`)
  }

  return response.json() as Promise<T>
}

export function postQuery(request: QueryRequest): Promise<QueryResponse> {
  return requestJson<QueryResponse>('/api/query', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export function getQuery(queryId: string): Promise<QueryResponse> {
  return requestJson<QueryResponse>(`/api/query/${encodeURIComponent(queryId)}`)
}

export function getQueryGraph(queryId: string): Promise<QueryGraphResponse> {
  return requestJson<QueryGraphResponse>(`/api/query/${encodeURIComponent(queryId)}/graph`)
}

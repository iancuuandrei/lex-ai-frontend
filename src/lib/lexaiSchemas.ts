import { z } from 'zod'

const metadataSchema = z.record(z.string(), z.unknown())
const nullableMetadataSchema = metadataSchema.nullable().optional()

const stringLikeSchema = z.union([z.string(), z.number()]).transform((value) => String(value))
const optionalStringSchema = stringLikeSchema.nullable().optional()
const optionalBooleanSchema = z.boolean().nullable().optional()
const optionalNumberSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : value
}, z.number().nullable().optional())

export const WarningListSchema = z.preprocess((value) => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) return [value]
  return []
}, z.array(z.union([z.string(), z.number(), z.boolean()]).transform((value) => String(value))))

export const QueryRequestSchema = z.object({
  question: z.string(),
  jurisdiction: z.string(),
  date: z.string(),
  mode: z.string(),
  debug: z.boolean().optional(),
}).passthrough()

export const AnswerPayloadSchema = z.object({
  short_answer: z.string().nullable().optional(),
  detailed_answer: z.string().nullable().optional(),
  confidence: optionalNumberSchema,
  not_legal_advice: optionalBooleanSchema,
  refusal_reason: z.string().nullable().optional(),
}).passthrough()

export const CitationSchema = z.object({
  id: optionalStringSchema,
  citation_id: optionalStringSchema,
  unit_id: optionalStringSchema,
  legal_unit_id: optionalStringSchema,
  evidence_unit_id: optionalStringSchema,
  node_id: optionalStringSchema,
  label: optionalStringSchema,
  title: optionalStringSchema,
  source: optionalStringSchema,
  act_title: optionalStringSchema,
  article: z.union([z.string(), z.number()]).nullable().optional(),
  paragraph: z.union([z.string(), z.number()]).nullable().optional(),
  excerpt: z.string().nullable().optional(),
  quote: z.string().nullable().optional(),
  raw_text: z.string().nullable().optional(),
  snippet: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  source_url: z.string().nullable().optional(),
  verified: optionalBooleanSchema,
  metadata: nullableMetadataSchema,
}).passthrough()

export const EvidenceUnitSchema = z.object({
  id: optionalStringSchema,
  unit_id: optionalStringSchema,
  node_id: optionalStringSchema,
  type: optionalStringSchema,
  label: optionalStringSchema,
  title: optionalStringSchema,
  source: optionalStringSchema,
  excerpt: z.string().nullable().optional(),
  raw_text: z.string().nullable().optional(),
  score: optionalNumberSchema,
  metadata: nullableMetadataSchema,
  law_id: optionalStringSchema,
  law_title: optionalStringSchema,
  status: optionalStringSchema,
  hierarchy_path: z.union([z.array(z.string()), z.string()]).nullable().optional(),
  article_number: z.union([z.string(), z.number()]).nullable().optional(),
  paragraph_number: z.union([z.string(), z.number()]).nullable().optional(),
  letter_number: z.union([z.string(), z.number()]).nullable().optional(),
  point_number: z.union([z.string(), z.number()]).nullable().optional(),
  legal_domain: optionalStringSchema,
  source_url: z.string().nullable().optional(),
  support_role: optionalStringSchema,
  retrieval_score: optionalNumberSchema,
  rerank_score: optionalNumberSchema,
  score_breakdown: nullableMetadataSchema,
  why_selected: z.string().nullable().optional(),
}).passthrough()

export const VerifierPayloadSchema = z.object({
  status: optionalStringSchema,
  summary: z.string().nullable().optional(),
  rationale: z.string().nullable().optional(),
  confidence: optionalNumberSchema,
  metadata: nullableMetadataSchema,
  groundedness_score: optionalNumberSchema,
  claims_total: optionalNumberSchema,
  claims_supported: optionalNumberSchema,
  claims_weakly_supported: optionalNumberSchema,
  claims_unsupported: optionalNumberSchema,
  citations_checked: optionalNumberSchema,
  verifier_passed: optionalBooleanSchema,
  warnings: WarningListSchema.nullable().optional(),
  repair_applied: optionalBooleanSchema,
  refusal_reason: z.string().nullable().optional(),
}).passthrough()

export const GraphNodeSchema = z.object({
  id: stringLikeSchema,
  label: optionalStringSchema,
  type: optionalStringSchema,
  node_type: optionalStringSchema,
  metadata: nullableMetadataSchema,
}).passthrough()

export const GraphEdgeSchema = z.object({
  id: optionalStringSchema,
  source: stringLikeSchema,
  target: stringLikeSchema,
  type: optionalStringSchema,
  edge_type: optionalStringSchema,
  label: optionalStringSchema,
  metadata: nullableMetadataSchema,
  weight: optionalNumberSchema,
  confidence: optionalNumberSchema,
  explanation: z.string().nullable().optional(),
}).passthrough()

const GraphPayloadObjectSchema = z.object({
  nodes: z.array(GraphNodeSchema).default([]),
  edges: z.array(GraphEdgeSchema).default([]),
}).passthrough()

export const GraphPayloadSchema = z.preprocess((value) => value ?? {}, GraphPayloadObjectSchema)

export const QueryResponseSchema = z.object({
  query_id: stringLikeSchema,
  question: stringLikeSchema,
  answer: AnswerPayloadSchema,
  citations: z.array(CitationSchema).default([]),
  evidence_units: z.array(EvidenceUnitSchema).default([]),
  verifier: VerifierPayloadSchema.nullable().optional(),
  graph: GraphPayloadSchema.default({ nodes: [], edges: [] }),
  debug: metadataSchema.nullable().optional(),
  warnings: WarningListSchema.default([]),
}).passthrough()

export const ReasoningPathItemSchema = z.object({
  node_id: optionalStringSchema,
  edge_id: optionalStringSchema,
  label: optionalStringSchema,
  description: optionalStringSchema,
  metadata: nullableMetadataSchema,
}).passthrough()

export const QueryGraphResponseSchema = z.object({
  query_id: stringLikeSchema,
  question: stringLikeSchema,
  graph: GraphPayloadSchema.default({ nodes: [], edges: [] }),
  highlighted_node_ids: z.array(stringLikeSchema).default([]),
  highlighted_edge_ids: z.array(stringLikeSchema).default([]),
  cited_unit_ids: z.array(stringLikeSchema).default([]),
  reasoning_path: z.array(z.union([stringLikeSchema, ReasoningPathItemSchema])).default([]),
  verifier_summary: z.union([z.string(), metadataSchema]).nullable().optional(),
}).passthrough()

export const SuggestionSchema = z.object({
  id: stringLikeSchema,
  text: stringLikeSchema,
}).passthrough()

export const LibraryItemSchema = z.object({
  id: stringLikeSchema,
  title: stringLikeSchema,
  description: stringLikeSchema,
  type: stringLikeSchema,
}).passthrough()

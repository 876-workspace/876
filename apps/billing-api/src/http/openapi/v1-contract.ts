import type { ZodType } from 'zod'
import 'zod-openapi'

import {
  v1ComponentSchemas,
  v1OperationContracts,
  v1OperationMetadata,
} from '@/http/openapi/v1-contract.generated'

export type V1HttpMethod =
  | 'delete'
  | 'get'
  | 'head'
  | 'options'
  | 'patch'
  | 'post'
  | 'put'
export type V1OperationPath = keyof typeof v1OperationMetadata
export type V1ComponentSchemaName = keyof typeof v1ComponentSchemas

type V1OperationMetadata = {
  summary: string
  description?: string
  operationId?: string
  tags: readonly string[]
}

export type V1OpenApiOperation = Record<string, unknown> & {
  security?: unknown
  requestBody?: unknown
  responses?: Record<string, unknown>
}

export function v1Operation(
  method: V1HttpMethod,
  path: string
): V1OperationMetadata {
  const openApiPath = path.replace(/:([A-Za-z0-9_]+)/g, '{$1}')
  const key = `${method.toUpperCase()} ${openApiPath}` as V1OperationPath
  const metadata = v1OperationMetadata[key]
  if (!metadata) throw new Error(`Unknown Billing v1 operation: ${key}`)
  return metadata as V1OperationMetadata
}

function operationKey(method: V1HttpMethod, path: string): V1OperationPath {
  const openApiPath = path.replace(/:([A-Za-z0-9_]+)/g, '{$1}')
  return `${method.toUpperCase()} ${openApiPath}` as V1OperationPath
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

/**
 * Projects frozen request/response rendering only after route-owned security,
 * response statuses, and legacy body visibility agree with the v1 contract.
 */
export function renderV1OperationCompatibility(options: {
  method: V1HttpMethod
  path: string
  operation: V1OpenApiOperation
  hasRuntimeBody: boolean
  documentBody: boolean
}): V1OpenApiOperation {
  const key = operationKey(options.method, options.path)
  const frozen = v1OperationContracts[key] as V1OpenApiOperation | undefined
  if (!frozen) return options.operation

  const metadata = v1OperationMetadata[key] as V1OperationMetadata
  const withMetadata: V1OpenApiOperation = {
    ...options.operation,
    summary: metadata.summary,
    tags: [...metadata.tags],
  }
  if (metadata.description === undefined) delete withMetadata.description
  else withMetadata.description = metadata.description
  if (metadata.operationId === undefined) delete withMetadata.operationId
  else withMetadata.operationId = metadata.operationId
  const securityMatches =
    canonicalJson(options.operation.security) === canonicalJson(frozen.security)
  const actualStatuses = Object.keys(options.operation.responses ?? {}).sort()
  const frozenStatuses = Object.keys(frozen.responses ?? {}).sort()
  const statusesMatch =
    canonicalJson(actualStatuses) === canonicalJson(frozenStatuses)
  const frozenHasBody = frozen.requestBody !== undefined
  const bodyVisibilityMatches = options.hasRuntimeBody
    ? frozenHasBody === options.documentBody
    : !frozenHasBody

  if (!securityMatches || !statusesMatch || !bodyVisibilityMatches)
    return withMetadata

  return {
    ...frozen,
    security: options.operation.security,
    responses: frozen.responses,
  }
}

/**
 * Retains the runtime behavior of a Zod validator while rendering its frozen
 * FastAPI-era JSON Schema through zod-openapi.
 */
export function v1Schema<TSchema extends ZodType>(
  schema: TSchema,
  name: V1ComponentSchemaName
): TSchema {
  const frozenSchema = v1ComponentSchemas[name]
  return schema.meta({
    id: name,
    override: ({ jsonSchema }: { jsonSchema: Record<string, unknown> }) => {
      for (const key of Object.keys(jsonSchema)) delete jsonSchema[key]
      Object.assign(jsonSchema, frozenSchema)
    },
  }) as TSchema
}

/** Restore dialect markers that zod-openapi intentionally strips after overrides. */
export function applyV1ComponentCompatibility<TDocument>(
  document: TDocument
): TDocument {
  const openApi = document as {
    paths?: Record<string, unknown>
    components?: { schemas?: Record<string, Record<string, unknown>> }
  }
  openApi.components ??= {}
  const actualSchemas = openApi.components.schemas ?? {}
  const referencedPaths = JSON.stringify(openApi.paths ?? {})
  const compatibleSchemas: Record<string, Record<string, unknown>> = {
    ...v1ComponentSchemas,
  }
  for (const [name, schema] of Object.entries(actualSchemas))
    if (
      !(name in compatibleSchemas) &&
      referencedPaths.includes(`#/components/schemas/${name}`)
    )
      compatibleSchemas[name] = schema

  openApi.components.schemas = compatibleSchemas
  return document
}

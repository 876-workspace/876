import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

type JsonObject = Record<string, unknown>
type HttpMethod =
  | 'delete'
  | 'get'
  | 'head'
  | 'options'
  | 'patch'
  | 'post'
  | 'put'
type OperationKey = `${Uppercase<HttpMethod>} ${string}`

type ValueMismatch = {
  field: string
  operation: OperationKey
}

type StatusMismatch = {
  operation: OperationKey
  missing: string[]
  extra: string[]
}

type SchemaMismatch = {
  operation: OperationKey
  location: string
}

export type OpenApiContractComparison = {
  expectedOperations: number
  actualOperations: number
  documentMismatches: string[]
  missingComponentSchemas: string[]
  extraComponentSchemas: string[]
  changedComponentSchemas: string[]
  missingOperations: OperationKey[]
  extraOperations: OperationKey[]
  valueMismatches: ValueMismatch[]
  statusMismatches: StatusMismatch[]
  schemaMismatches: SchemaMismatch[]
}

const HTTP_METHODS = new Set<HttpMethod>([
  'delete',
  'get',
  'head',
  'options',
  'patch',
  'post',
  'put',
])

const EXACT_OPERATION_FIELDS = [
  'operationId',
  'summary',
  'description',
  'tags',
  'security',
  'parameters',
] as const

const EXACT_DOCUMENT_FIELDS = ['openapi', 'info', 'servers'] as const

function operations(documentValue: unknown): Map<OperationKey, JsonObject> {
  const result = new Map<OperationKey, JsonObject>()
  const document = documentValue as JsonObject
  const paths = document.paths as JsonObject

  for (const [path, pathItemValue] of Object.entries(paths)) {
    const pathItem = pathItemValue as JsonObject
    for (const [methodValue, operationValue] of Object.entries(pathItem)) {
      const method = methodValue as HttpMethod
      if (!HTTP_METHODS.has(method)) continue

      result.set(
        `${method.toUpperCase() as Uppercase<HttpMethod>} ${path}`,
        operationValue as JsonObject
      )
    }
  }

  return result
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as JsonObject).sort(
      ([left], [right]) => left.localeCompare(right)
    )
    return `{${entries
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function responseMap(operation: JsonObject): JsonObject {
  return (operation.responses as JsonObject | undefined) ?? {}
}

function jsonSchema(contentOwner: unknown): unknown {
  const owner = contentOwner as JsonObject | undefined
  const content = owner?.content as JsonObject | undefined
  const json = content?.['application/json'] as JsonObject | undefined
  return json?.schema
}

function withoutJsonSchema(contentOwner: unknown): unknown {
  if (contentOwner === undefined) return undefined
  const owner = contentOwner as JsonObject
  const content = (owner.content as JsonObject | undefined) ?? {}
  const json = content['application/json'] as JsonObject | undefined
  if (!json) return owner

  const jsonMetadata = { ...json }
  delete jsonMetadata.schema
  return {
    ...owner,
    content: {
      ...content,
      'application/json': jsonMetadata,
    },
  }
}

function compareSchemas(
  operation: OperationKey,
  expected: JsonObject,
  actual: JsonObject
): SchemaMismatch[] {
  const mismatches: SchemaMismatch[] = []
  const expectedBody = jsonSchema(expected.requestBody)
  const actualBody = jsonSchema(actual.requestBody)
  if (canonicalJson(expectedBody) !== canonicalJson(actualBody))
    mismatches.push({ operation, location: 'requestBody.application/json' })

  const expectedResponses = responseMap(expected)
  const actualResponses = responseMap(actual)
  const sharedStatuses = Object.keys(expectedResponses).filter((status) =>
    Object.hasOwn(actualResponses, status)
  )
  for (const status of sharedStatuses) {
    const expectedSchema = jsonSchema(expectedResponses[status])
    const actualSchema = jsonSchema(actualResponses[status])
    if (canonicalJson(expectedSchema) !== canonicalJson(actualSchema))
      mismatches.push({
        operation,
        location: `response.${status}.application/json`,
      })
  }

  return mismatches
}

export function compareOpenApiContracts(
  expectedDocument: unknown,
  actualDocument: unknown
): OpenApiContractComparison {
  const expectedRoot = expectedDocument as JsonObject
  const actualRoot = actualDocument as JsonObject
  const expected = operations(expectedDocument)
  const actual = operations(actualDocument)
  const documentMismatches: string[] = EXACT_DOCUMENT_FIELDS.filter(
    (field) =>
      canonicalJson(expectedRoot[field]) !== canonicalJson(actualRoot[field])
  )
  const expectedComponents =
    (expectedRoot.components as JsonObject | undefined) ?? {}
  const actualComponents =
    (actualRoot.components as JsonObject | undefined) ?? {}
  if (
    canonicalJson(expectedComponents.securitySchemes) !==
    canonicalJson(actualComponents.securitySchemes)
  )
    documentMismatches.push('components.securitySchemes')
  const expectedSchemas =
    (expectedComponents.schemas as JsonObject | undefined) ?? {}
  const actualSchemas =
    (actualComponents.schemas as JsonObject | undefined) ?? {}
  const missingComponentSchemas = Object.keys(expectedSchemas).filter(
    (name) => !Object.hasOwn(actualSchemas, name)
  )
  const extraComponentSchemas = Object.keys(actualSchemas).filter(
    (name) => !Object.hasOwn(expectedSchemas, name)
  )
  const changedComponentSchemas = Object.keys(expectedSchemas).filter(
    (name) =>
      Object.hasOwn(actualSchemas, name) &&
      canonicalJson(expectedSchemas[name]) !==
        canonicalJson(actualSchemas[name])
  )
  const missingOperations = [...expected.keys()].filter(
    (key) => !actual.has(key)
  )
  const extraOperations = [...actual.keys()].filter((key) => !expected.has(key))
  const valueMismatches: ValueMismatch[] = []
  const statusMismatches: StatusMismatch[] = []
  const schemaMismatches: SchemaMismatch[] = []

  for (const [key, expectedOperation] of expected) {
    const actualOperation = actual.get(key)
    if (!actualOperation) continue

    for (const field of EXACT_OPERATION_FIELDS) {
      if (
        canonicalJson(expectedOperation[field]) !==
        canonicalJson(actualOperation[field])
      )
        valueMismatches.push({ operation: key, field })
    }

    if (
      canonicalJson(withoutJsonSchema(expectedOperation.requestBody)) !==
      canonicalJson(withoutJsonSchema(actualOperation.requestBody))
    )
      valueMismatches.push({
        operation: key,
        field: 'requestBody metadata',
      })

    const expectedResponses = responseMap(expectedOperation)
    const actualResponses = responseMap(actualOperation)
    const expectedStatuses = Object.keys(expectedResponses)
    const actualStatuses = Object.keys(actualResponses)
    const missing = expectedStatuses.filter(
      (status) => !actualStatuses.includes(status)
    )
    const extra = actualStatuses.filter(
      (status) => !expectedStatuses.includes(status)
    )
    if (missing.length > 0 || extra.length > 0)
      statusMismatches.push({ operation: key, missing, extra })

    for (const status of expectedStatuses.filter((candidate) =>
      actualStatuses.includes(candidate)
    )) {
      if (
        canonicalJson(withoutJsonSchema(expectedResponses[status])) !==
        canonicalJson(withoutJsonSchema(actualResponses[status]))
      )
        valueMismatches.push({
          operation: key,
          field: `responses.${status} metadata`,
        })
    }

    schemaMismatches.push(
      ...compareSchemas(key, expectedOperation, actualOperation)
    )
  }

  return {
    expectedOperations: expected.size,
    actualOperations: actual.size,
    documentMismatches,
    missingComponentSchemas: missingComponentSchemas.sort(),
    extraComponentSchemas: extraComponentSchemas.sort(),
    changedComponentSchemas: changedComponentSchemas.sort(),
    missingOperations: missingOperations.sort(),
    extraOperations: extraOperations.sort(),
    valueMismatches,
    statusMismatches,
    schemaMismatches,
  }
}

export function openApiContractsMatch(
  comparison: OpenApiContractComparison
): boolean {
  return (
    comparison.missingOperations.length === 0 &&
    comparison.extraOperations.length === 0 &&
    comparison.documentMismatches.length === 0 &&
    comparison.missingComponentSchemas.length === 0 &&
    comparison.extraComponentSchemas.length === 0 &&
    comparison.changedComponentSchemas.length === 0 &&
    comparison.valueMismatches.length === 0 &&
    comparison.statusMismatches.length === 0 &&
    comparison.schemaMismatches.length === 0
  )
}

function groupedValueMismatches(
  mismatches: ValueMismatch[]
): Map<string, OperationKey[]> {
  const groups = new Map<string, OperationKey[]>()
  for (const mismatch of mismatches) {
    const affected = groups.get(mismatch.field) ?? []
    affected.push(mismatch.operation)
    groups.set(mismatch.field, affected)
  }
  return groups
}

function appendList(
  lines: string[],
  label: string,
  entries: string[],
  limit = 20
): void {
  lines.push(`${label}: ${entries.length}`)
  lines.push(...entries.slice(0, limit).map((entry) => `  - ${entry}`))
  if (entries.length > limit)
    lines.push(`  ... and ${entries.length - limit} more`)
}

export function formatOpenApiContractComparison(
  comparison: OpenApiContractComparison
): string {
  const lines = [
    `Frozen operations: ${comparison.expectedOperations}; Express operations: ${comparison.actualOperations}`,
  ]
  appendList(
    lines,
    'Document metadata mismatches',
    comparison.documentMismatches
  )
  appendList(
    lines,
    'Missing component schemas',
    comparison.missingComponentSchemas
  )
  appendList(lines, 'Extra component schemas', comparison.extraComponentSchemas)
  appendList(
    lines,
    'Changed component schemas',
    comparison.changedComponentSchemas
  )
  appendList(lines, 'Missing operations', comparison.missingOperations)
  appendList(lines, 'Extra operations', comparison.extraOperations)

  for (const [field, affected] of groupedValueMismatches(
    comparison.valueMismatches
  )) {
    appendList(lines, `${field} mismatches`, affected.sort())
  }

  appendList(
    lines,
    'status-code mismatches',
    comparison.statusMismatches.map(
      (mismatch) =>
        `${mismatch.operation}: missing [${mismatch.missing.join(', ')}], extra [${mismatch.extra.join(', ')}]`
    )
  )

  const requestSchemas = comparison.schemaMismatches.filter(
    ({ location }) => location === 'requestBody.application/json'
  )
  const responseSchemas = comparison.schemaMismatches.filter(
    ({ location }) => location !== 'requestBody.application/json'
  )
  appendList(
    lines,
    'request schema mismatches',
    requestSchemas.map(({ operation, location }) => `${operation}: ${location}`)
  )
  appendList(
    lines,
    'response schema mismatches',
    responseSchemas.map(
      ({ operation, location }) => `${operation}: ${location}`
    )
  )

  return lines.join('\n')
}

export async function loadFrozenBillingContract(): Promise<JsonObject> {
  const path = fileURLToPath(
    new URL('../../../billing/contracts/v1/openapi.json', import.meta.url)
  )
  return JSON.parse(await readFile(path, 'utf8')) as JsonObject
}

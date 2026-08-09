import {
  createDocument,
  type ZodOpenApiOperationObject,
  type ZodOpenApiPathsObject,
} from 'zod-openapi'

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'

type RegisteredOperation = {
  method: HttpMethod
  path: string
  operation: ZodOpenApiOperationObject
}

const operations: RegisteredOperation[] = []

export function registerOperation(entry: RegisteredOperation): void {
  operations.push(entry)
}

export function resetRegistryForTest(): void {
  operations.length = 0
}

export function toOpenApiPath(expressPath: string): string {
  return expressPath.replace(/:([A-Za-z0-9_]+)/g, '{$1}')
}

export const TAGS = [
  {
    name: 'Tenants',
    description: 'Tenant (courier org workspace) management.',
  },
  { name: 'System', description: 'Health and liveness checks.' },
] as const

export const SECURITY_SCHEMES = {
  ApiKey: {
    type: 'apiKey',
    in: 'header',
    name: 'X-876-API-Key',
    description: 'App API key (`876_app_secret_…`).',
  },
  BearerToken: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'OAuth access token.',
  },
  InternalKey: {
    type: 'apiKey',
    in: 'header',
    name: 'x-internal-key',
    description: 'Secret service key. Server-to-server only.',
  },
} as const

export function buildOpenApiDocument(options: {
  version: string
  serverUrl: string
}) {
  const paths: ZodOpenApiPathsObject = {}
  for (const { method, path, operation } of operations) {
    paths[path] ??= {}
    ;(paths[path] as Record<string, unknown>)[method] = operation
  }
  return createDocument({
    openapi: '3.1.0',
    info: {
      title: '876 Couriers API',
      version: options.version,
      description:
        'Courier bounded context — tenants and downstream resources.',
    },
    servers: [{ url: options.serverUrl, description: 'Local dev' }],
    tags: TAGS as unknown as { name: string; description: string }[],
    components: { securitySchemes: SECURITY_SCHEMES },
    paths,
  })
}

export function registeredOperationCount(): number {
  return operations.length
}

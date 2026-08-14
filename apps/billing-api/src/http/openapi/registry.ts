import {
  createDocument,
  type ZodOpenApiOperationObject,
  type ZodOpenApiPathsObject,
} from 'zod-openapi'

import { applyV1ComponentCompatibility } from '@/http/openapi/v1-contract'

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'
export type RegistryKind = 'public' | 'internal'

type RegisteredOperation = {
  method: HttpMethod
  path: string
  operation: ZodOpenApiOperationObject
}

const registries: Record<RegistryKind, RegisteredOperation[]> = {
  public: [],
  internal: [],
}

export function registerOperation(
  registry: RegistryKind,
  entry: RegisteredOperation
): void {
  const duplicate = registries[registry].some(
    (candidate) =>
      candidate.method === entry.method && candidate.path === entry.path
  )
  if (duplicate) {
    const existing = registries[registry].find(
      (candidate) =>
        candidate.method === entry.method && candidate.path === entry.path
    )
    if (existing?.operation.operationId === entry.operation.operationId) return

    throw new Error(
      `Duplicate ${registry} operation: ${entry.method} ${entry.path}`
    )
  }
  registries[registry].push(entry)
}

export function resetRegistryForTest(): void {
  registries.public.length = 0
  registries.internal.length = 0
}

export function toOpenApiPath(expressPath: string): string {
  return expressPath.replace(/:([A-Za-z0-9_]+)/g, '{$1}')
}

const securitySchemes = {
  tenantOAuth: {
    type: 'oauth2',
    description:
      'Delegated 876 access token for an active Billing organization member.',
    flows: {
      authorizationCode: {
        authorizationUrl: 'http://127.0.0.1:4000/api/v1/oauth/authorize',
        tokenUrl: 'http://127.0.0.1:4000/api/v1/oauth/token',
        scopes: {},
      },
    },
  },
  appApiKey: { type: 'apiKey', in: 'header', name: 'x-876-api-key' },
  internalKey: { type: 'apiKey', in: 'header', name: 'x-internal-key' },
  schedulerKey: { type: 'apiKey', in: 'header', name: 'x-scheduler-key' },
} as const

export function buildOpenApiDocument(options: {
  registry: RegistryKind
  identityApiUrl: string
}) {
  const paths: ZodOpenApiPathsObject = {}
  for (const { method, path, operation } of registries[options.registry]) {
    paths[path] ??= {}
    ;(paths[path] as Record<string, unknown>)[method] = operation
  }

  const identityUrl = options.identityApiUrl.replace(/\/+$/, '')
  const schemes = {
    ...securitySchemes,
    tenantOAuth: {
      ...securitySchemes.tenantOAuth,
      flows: {
        authorizationCode: {
          ...securitySchemes.tenantOAuth.flows.authorizationCode,
          authorizationUrl: `${identityUrl}/api/v1/oauth/authorize`,
          tokenUrl: `${identityUrl}/api/v1/oauth/token`,
        },
      },
    },
  }

  const document = createDocument({
    openapi: '3.1.0',
    info: {
      title:
        options.registry === 'public'
          ? '876 Billing API'
          : '876 Billing Internal API',
      version: options.registry === 'public' ? '0.1.0' : '1.0.0',
      description:
        options.registry === 'public'
          ? 'Owns Billing database access, financial business rules, provider integrations, and versioned HTTP contracts.'
          : 'Server-only Billing scheduling and projection operations.',
    },
    servers: [{ url: options.registry === 'public' ? '/api/v1' : '/internal' }],
    components: { securitySchemes: schemes },
    paths,
  })
  return options.registry === 'public'
    ? applyV1ComponentCompatibility(document)
    : document
}

export function registeredOperations(
  registry: RegistryKind
): ReadonlyArray<RegisteredOperation> {
  return registries[registry]
}

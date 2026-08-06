import {
  createDocument,
  type ZodOpenApiOperationObject,
  type ZodOpenApiPathsObject,
} from 'zod-openapi'

/**
 * The OpenAPI document is assembled from operations that routes register as
 * they are defined, so a route cannot exist undocumented. Nothing here is
 * hand-written except the tag prose below.
 */

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'

type RegisteredOperation = {
  method: HttpMethod
  /** OpenAPI-style path, e.g. `/users/{id}`. */
  path: string
  operation: ZodOpenApiOperationObject
}

const operations: RegisteredOperation[] = []

export function registerOperation(entry: RegisteredOperation): void {
  operations.push(entry)
}

/** Test-only: drop registrations so a suite can assert on a known set. */
export function resetRegistryForTest(): void {
  operations.length = 0
}

/** Express `/users/:id/apps/:appId` → OpenAPI `/users/{id}/apps/{appId}`. */
export function toOpenApiPath(expressPath: string): string {
  return expressPath.replace(/:([A-Za-z0-9_]+)/g, '{$1}')
}

export const TAGS = [
  {
    name: 'Auth',
    description:
      'Password, magic-OTP, social login, email verification, session management, and password recovery flows.',
  },
  {
    name: 'OAuth',
    description:
      'OAuth 2.0 + OIDC provider endpoints: authorize, token exchange, userinfo, revocation, and consent.',
    externalDocs: {
      description: 'OAuth 2.0 RFC 6749',
      url: 'https://datatracker.ietf.org/doc/html/rfc6749',
    },
  },
  {
    name: 'Users',
    description:
      'User resource management, feature-flag grants, and OAuth grant inspection.',
  },
  {
    name: 'Organizations',
    description: 'Organization CRUD and nested membership management.',
  },
  {
    name: 'Memberships',
    description: 'Membership CRUD — user ↔ organization relationships.',
  },
  {
    name: 'Features',
    description: 'Platform feature-flag registry synced with PostHog.',
  },
  {
    name: 'Registered Apps',
    description:
      'OAuth application registration — create and list third-party apps.',
  },
  { name: 'System', description: 'Health and liveness checks.' },
] as const

/**
 * Security schemes, one per auth tier
 * (.claude/rules/platform-services.md → publishable vs secret).
 */
export const SECURITY_SCHEMES = {
  ApiKey: {
    type: 'apiKey',
    in: 'header',
    name: 'X-876-API-Key',
    description:
      'App API key (`876_app_secret_…`). Publishable tier — never admin scope.',
  },
  BearerToken: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'OAuth access token identifying a user session.',
  },
  InternalKey: {
    type: 'apiKey',
    in: 'header',
    name: 'x-internal-key',
    description:
      'Secret service key. Server-to-server only; never reaches a browser.',
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
      title: '876 API',
      version: options.version,
      description:
        'Identity, accounts, organizations, OAuth, and platform data for the 876 platform.',
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

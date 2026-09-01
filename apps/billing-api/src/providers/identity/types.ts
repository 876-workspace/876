export type IdentityApp = { id: string }

export type TokenIntrospection = {
  active: boolean
  subject: string | null
  appId: string | null
  scopes: ReadonlySet<string>
}

export type OrganizationRole = 'super_admin' | 'admin' | 'staff'

export type OrganizationMembership = {
  role: OrganizationRole
}

export type IdentityFailureReason =
  'configuration' | 'invalid-response' | 'network' | 'timeout' | 'upstream'

export class IdentityUnavailableError extends Error {
  readonly attempts: number
  readonly path: string
  readonly reason: IdentityFailureReason
  readonly status: number | null

  constructor(options: {
    attempts: number
    path: string
    reason: IdentityFailureReason
    status?: number | null
  }) {
    super('The identity service could not verify the request.')
    this.name = 'IdentityUnavailableError'
    this.attempts = options.attempts
    this.path = options.path
    this.reason = options.reason
    this.status = options.status ?? null
  }
}

export function isIdentityUnavailableError(
  error: unknown
): error is IdentityUnavailableError {
  return error instanceof IdentityUnavailableError
}

export type IdentityGateway = {
  appForApiKey(apiKey: string): Promise<IdentityApp | null>
  introspect(token: string): Promise<TokenIntrospection>
  organizationMembership(
    token: string,
    organizationId: string
  ): Promise<OrganizationMembership | null>
}

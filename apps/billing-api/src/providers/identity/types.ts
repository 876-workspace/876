export type IdentityApp = { id: string }

export type TokenIntrospection = {
  active: boolean
  subject: string | null
  appId: string | null
  scopes: ReadonlySet<string>
}

export type OrganizationRole = 'owner' | 'admin' | 'member'

export type OrganizationMembership = {
  role: OrganizationRole
}

export type IdentityGateway = {
  appForApiKey(apiKey: string): Promise<IdentityApp | null>
  introspect(token: string): Promise<TokenIntrospection>
  organizationMembership(
    token: string,
    organizationId: string
  ): Promise<OrganizationMembership | null>
}

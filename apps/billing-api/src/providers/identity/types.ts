export type IdentityApp = { id: string }

export type TokenIntrospection = {
  active: boolean
  subject: string | null
  appId: string | null
  scopes: ReadonlySet<string>
}

export type IdentityGateway = {
  appForApiKey(apiKey: string): Promise<IdentityApp | null>
  introspect(token: string): Promise<TokenIntrospection>
  userBelongsToOrganization(
    token: string,
    organizationId: string
  ): Promise<boolean>
}

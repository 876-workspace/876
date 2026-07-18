const BILLING_INTEGRATION_SCOPES = [
  'billing.organizations.read',
  'billing.customers.read',
  'billing.customers.write',
] as const

/** RFC 9728 metadata for clients discovering Billing's OAuth resource server. */
export function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const authorizationServer =
    process.env.BILLING_OAUTH_ISSUER ??
    process.env.API_URL ??
    'http://localhost:4000'

  return Response.json(
    {
      resource: `${requestUrl.origin}/api/v1`,
      authorization_servers: [authorizationServer.replace(/\/$/, '')],
      scopes_supported: BILLING_INTEGRATION_SCOPES,
      bearer_methods_supported: ['header'],
    },
    {
      headers: {
        'cache-control': 'public, max-age=300',
      },
    }
  )
}

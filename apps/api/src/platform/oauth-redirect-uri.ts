const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])
const RESERVED_SCHEMES = new Set([
  'about',
  'data',
  'file',
  'http',
  'https',
  'javascript',
])
const URI_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*$/

export type OAuthRedirectClientType = 'public' | 'confidential' | string

/**
 * Validates the transport shape of an OAuth redirect URI.
 *
 * Exact redirect registration is enforced separately. This helper answers only
 * whether the registered URI is safe for the client's credential model:
 *
 * - HTTPS is valid for every client.
 * - HTTP is valid only for loopback development/native clients.
 * - Private-use URI schemes are valid only for public clients and must use a
 *   reverse-domain-style scheme to reduce collisions between installed apps.
 *
 * OAuth redirect endpoints must not contain fragments. User-info is rejected
 * because credentials embedded in a callback URI have no legitimate use here.
 */
export function isOAuthRedirectUriSafe(
  uri: string,
  clientType: OAuthRedirectClientType
): boolean {
  try {
    const parsed = new URL(uri)
    if (parsed.hash || parsed.username || parsed.password) return false

    if (parsed.protocol === 'https:') return true

    if (parsed.protocol === 'http:') {
      return LOOPBACK_HOSTS.has(parsed.hostname)
    }

    if (clientType !== 'public') return false

    const scheme = parsed.protocol.slice(0, -1).toLowerCase()
    if (!URI_SCHEME_PATTERN.test(scheme)) return false
    if (RESERVED_SCHEMES.has(scheme)) return false

    // RFC 8252 recommends schemes based on a domain name under the app
    // publisher's control. Requiring a dot encodes that safer convention and
    // avoids generic schemes such as `projects://` that are easy to collide.
    return scheme.includes('.')
  } catch {
    return false
  }
}

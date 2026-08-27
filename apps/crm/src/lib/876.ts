import 'server-only'

import { create876ServerClient } from '@876/client/server'

import { getAuthSession, isSignedSession } from './auth/session'

/**
 * Builds the request-scoped 876 client for CRM.
 *
 * Two credentials, for two different jobs:
 *
 * - The **CRM service** is reached with CRM's own internal key — this app owns
 *   that bounded context, so its requests, notes, and customer profiles are
 *   server-to-server calls.
 * - The **core platform** is reached with CRM's app API key plus the signed-in
 *   user's access token. Org-scoped reads there (`/organizations/:id/members`,
 *   `/organizations/:id/departments`) are session tier — an app key alone is
 *   answered `auth/no-session`, and no key at all is answered
 *   `api-key/missing`.
 *
 * That second half is why this is a factory rather than a module singleton: an
 * access token belongs to a request, not to a process. It is also why the
 * client used to come back with an empty member directory — it was built with
 * no platform credential at all, so every member and department list silently
 * resolved to `[]` and note authors rendered as raw `user_…` ids.
 *
 * Not signed in is not an error here. Every caller already runs behind
 * `requireCrmContext()` or `getCrmApiContext()`, which redirect or answer 401
 * before a request is made; throwing a second time would only turn their
 * handled cases into unhandled ones.
 */
export async function get876Client() {
  const session = await getAuthSession()
  const accessToken = isSignedSession(session) ? session.accessToken : undefined

  return create876ServerClient({
    app: 'crm',
    baseUrl: process.env.API_URL,
    apiKey: process.env.CRM_API_876_KEY,
    accessToken,
    services: {
      crm: {
        baseUrl: process.env.CRM_API_URL,
        internalKey: process.env.CRM_INTERNAL_KEY,
      },
    },
  })
}

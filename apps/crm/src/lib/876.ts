import 'server-only'

import { create876ServerClient } from '@876/client/server'

import { getAuthSession, isSignedSession } from './auth/session'

/**
 * Builds the request-scoped 876 client for CRM.
 *
 * Three service authorities are composed here, each for a different job:
 *
 * - The **CRM service** is reached with CRM's own internal key — this app owns
 *   that bounded context, so requests, notes, and CRM customer profiles are
 *   trusted server-to-server calls.
 * - The **core platform** is reached with CRM's app API key plus the signed-in
 *   user's access token. Org-scoped identity reads are session tier.
 * - The **Work service** is reached with the same CRM app key plus that signed
 *   user token. Work verifies CRM's app assignment/entitlement and the user's
 *   effective app permissions; the CRM web app never receives WORK_INTERNAL_KEY.
 *
 * The Work session client is what makes canonical `$876.tasks`, `$876.events`,
 * `$876.calendars`, `$876.myWork`, etc. real resources in the CRM application.
 * CRM's `requestTasks`, `requestReminders`, and `requestEvents` remain contextual
 * CRM projections for request-specific UX and backwards compatibility.
 *
 * This is a factory rather than a module singleton because an access token
 * belongs to one request, not to the process. Not signed in is not an error
 * here: callers already run behind `requireCrmContext()` or `getCrmApiContext()`
 * and will redirect/answer 401 before using a session-only resource.
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
      work: {
        session: {
          baseUrl: process.env.WORK_API_URL,
          apiKey: process.env.CRM_API_876_KEY,
          accessToken,
        },
      },
    },
  })
}

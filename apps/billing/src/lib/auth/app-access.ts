import 'server-only'

import { create876WorkspaceSessionClient } from '@876/workspace/session'

import { getAuthSession, isSignedSession } from './session'
import { getWorkspaceContext } from './billing-context'

export const APP_ASSIGN_PERMISSION = 'apps:assign'

export async function getBillingWorkspace() {
  const session = await getAuthSession()
  if (!isSignedSession(session) || !session.accessToken) return null

  return create876WorkspaceSessionClient({
    baseUrl: process.env.API_URL?.trim() || 'http://localhost:4000',
    apiKey: process.env.BILLING_API_876_KEY?.trim(),
    accessToken: session.accessToken,
  })
}

export async function requireAppAccessManager(): Promise<
  | { orgId: string; response: null }
  | { orgId: null; response: Response }
> {
  const context = await getWorkspaceContext()
  if (!context)
    return {
      orgId: null,
      response: Response.json(
        {
          data: null,
          error: {
            code: 'billing/unauthorized',
            message: 'Unauthorized.',
          },
        },
        { status: 401 }
      ),
    }

  const workspace = await getBillingWorkspace()
  if (!workspace)
    return {
      orgId: null,
      response: Response.json(
        {
          data: null,
          error: {
            code: 'billing/unauthorized',
            message: 'Unauthorized.',
          },
        },
        { status: 401 }
      ),
    }

  const result = await workspace.members.retrieveMe(context.orgId)
  if (result.error || !result.data)
    return {
      orgId: null,
      response: Response.json(
        {
          data: null,
          error: {
            code: 'billing/access-unavailable',
            message: 'Access could not be verified. Try again.',
          },
        },
        { status: 503 }
      ),
    }

  if (!result.data.permissions.includes(APP_ASSIGN_PERMISSION))
    return {
      orgId: null,
      response: Response.json(
        {
          data: null,
          error: {
            code: 'billing/forbidden',
            message: 'You do not have permission to manage app access.',
          },
        },
        { status: 403 }
      ),
    }

  return { orgId: context.orgId, response: null }
}

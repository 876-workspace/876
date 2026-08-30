import 'server-only'

import { create876WorkspaceSessionClient } from '@876/workspace/session'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

/** Workspace authority belongs to the signed-in Enterprise user, so this is request-scoped. */
export async function getWorkspace() {
  const session = await getAuthSession()
  if (!isSignedSession(session))
    throw new Error(
      'A signed-in session is required to create the workspace client.'
    )

  return create876WorkspaceSessionClient({
    baseUrl: process.env.API_URL,
    apiKey: process.env.API_876_KEY,
    accessToken: session.accessToken,
    fetch,
  })
}

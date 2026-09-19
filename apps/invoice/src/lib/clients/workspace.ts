import 'server-only'

import { create876WorkspaceSessionClient } from '@876/workspace/session'
import { redirect } from 'next/navigation'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

const baseUrl = process.env.API_URL?.trim() || 'http://localhost:4000'
const apiKey = process.env.INVOICE_API_876_KEY?.trim()

/** Core Workspace authority is bound to the signed-in Invoice user, so it is request-scoped. */
export async function getWorkspace() {
  const session = await getAuthSession()
  if (!isSignedSession(session) || !session.accessToken) redirect('/login')

  return create876WorkspaceSessionClient({
    baseUrl,
    apiKey,
    accessToken: session.accessToken,
  })
}

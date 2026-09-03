import 'server-only'

import { create876AccountClient } from '@876/account'
import { redirect } from 'next/navigation'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

const baseUrl = process.env.API_URL?.trim() || 'http://localhost:4000'
const apiKey = process.env.PROJECTS_API_876_KEY?.trim()

/** Account session authority is bound to the signed-in Projects user per request. */
export async function getAccount() {
  const session = await getAuthSession()
  if (!isSignedSession(session) || !session.accessToken) redirect('/login')

  return create876AccountClient({
    baseUrl,
    apiKey,
    accessToken: session.accessToken,
  })
}

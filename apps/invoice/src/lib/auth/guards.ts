import 'server-only'

import { redirect } from 'next/navigation'

import { getAuthSession, isSignedSession } from './session'

export async function requireValidSession(returnTo = '/'): Promise<void> {
  const session = await getAuthSession()
  if (!isSignedSession(session)) {
    redirect(`/login?return_to=${encodeURIComponent(returnTo)}`)
  }
}

import 'server-only'

import { create876WorkSessionClient } from '@876/work/session'
import { headers } from 'next/headers'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

/** Request-scoped Work client using Invoice's app identity plus the acting user. */
export async function getWork() {
  const session = await getAuthSession()
  const requestId = (await headers()).get('x-request-id') ?? undefined

  return create876WorkSessionClient({
    baseUrl: process.env.WORK_API_URL,
    apiKey: process.env.INVOICE_API_876_KEY,
    accessToken: isSignedSession(session) ? session.accessToken : undefined,
    requestId,
  })
}

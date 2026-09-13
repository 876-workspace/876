import 'server-only'

import { cookies } from 'next/headers'
import { cache } from 'react'

import { verifySession876 } from './session-cookie'

export type CommerceSession = {
  userId: string
  orgId: string | null
  accessToken: string | undefined
} | null

export const getCommerceSession = cache(async function getCommerceSession(): Promise<CommerceSession> {
  const cookie = (await cookies()).get(
    process.env.SESSION_COOKIE_NAME ?? '876-session'
  )
  if (!cookie?.value) return null

  const session = await verifySession876(cookie.value)
  if (!session?.userId) return null

  return {
    userId: session.userId,
    orgId: session.orgId ?? null,
    accessToken: session.accessToken,
  }
})

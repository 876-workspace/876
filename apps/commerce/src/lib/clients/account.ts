import 'server-only'

import { create876AccountClient } from '@876/account'
import { redirect } from 'next/navigation'

import { getCommerceSession } from '@/lib/auth/session'

const baseUrl = process.env.API_URL?.trim() || 'http://localhost:4000'
const apiKey = process.env.COMMERCE_API_876_KEY?.trim()

/** Account session authority is bound to the signed-in Commerce user per request. */
export async function getAccount() {
  const session = await getCommerceSession()
  if (!session?.accessToken) redirect('/login')

  return create876AccountClient({
    baseUrl,
    apiKey,
    accessToken: session.accessToken,
  })
}

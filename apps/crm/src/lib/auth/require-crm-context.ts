import 'server-only'

import { redirect } from 'next/navigation'

import { getCrmContextResult } from './context'

export async function requireCrmContext() {
  const result = await getCrmContextResult()
  if (result.status === 'signed-out') redirect('/login')
  if (result.status === 'no-organization') redirect('/onboarding')
  if (result.status !== 'ok') redirect('/unavailable')

  return result.context
}

import { redirect } from 'next/navigation'

import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'

import { getManageContext } from '@/lib/auth/manage-context'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export default async function LegacyAppRedirect({
  params,
}: {
  params: Promise<{ rest?: string[] }>
}) {
  const { rest = [] } = await params
  if (rest[0] === 'onboarding') redirect('/onboarding')

  const session = await getAuthSession()
  if (!isSignedSession(session)) redirect(`/login?${AUTH_RETURN_TO_PARAM}=/`)

  const ctx = await getManageContext()
  if (!ctx) redirect('/onboarding')

  const suffix = rest.length ? `/${rest.join('/')}` : ''
  redirect(`/org/${ctx.orgSlug}${suffix}`)
}

import { redirect } from 'next/navigation'

import { getManageContext } from '@/lib/auth/manage-context'
import { requireValidSession } from '@/lib/auth/guards'

export default async function HomePage() {
  // Validates the account against the identity API, not just the sealed cookie,
  // so a deleted or disabled account is signed out to /login instead of being
  // routed on to onboarding.
  await requireValidSession('/')

  const ctx = await getManageContext()
  if (!ctx) redirect('/onboarding')

  redirect(`/${ctx.orgSlug}`)
}

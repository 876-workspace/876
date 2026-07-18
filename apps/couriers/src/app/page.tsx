import { redirect } from 'next/navigation'

import { getManageContext } from '@/lib/auth/manage-context'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export default async function HomePage() {
  const session = await getAuthSession()
  if (!isSignedSession(session)) redirect('/login')

  const ctx = await getManageContext()
  if (!ctx) redirect('/onboarding')

  redirect(`/org/${ctx.orgSlug}`)
}

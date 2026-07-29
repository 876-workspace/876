import { redirect } from 'next/navigation'

import { getManageContext } from '@/lib/auth/manage-context'

export default async function OrgDashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const ctx = await getManageContext(orgSlug)
  if (!ctx) return null

  if (!ctx.tenant) redirect('/onboarding')

  return null
}

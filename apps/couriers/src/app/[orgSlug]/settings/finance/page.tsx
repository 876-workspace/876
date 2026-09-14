import { notFound } from 'next/navigation'

import { getManageContext } from '@/lib/auth/manage-context'

import { FinancePageContent } from './_components/finance-page'

export const metadata = { title: 'Finance — Settings' }

type Props = { params: Promise<{ orgSlug: string }> }

export default async function FinanceSettingsPage({ params }: Props) {
  const { orgSlug } = await params
  const context = await getManageContext(orgSlug)
  if (!context) notFound()

  return (
    <FinancePageContent
      orgSlug={orgSlug}
      orgId={context.orgId}
      canManage={context.role === 'super-admin' || context.role === 'admin'}
    />
  )
}

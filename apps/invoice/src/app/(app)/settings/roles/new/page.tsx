import { redirect } from 'next/navigation'

import { getInvoiceContextResult } from '@/lib/auth/context'
import { resolveInvoiceFinanceAccess } from '@/lib/auth/finance-access'

import { CreateRoleSection } from '../_components/roles-section'

export const metadata = { title: 'New role - Invoice settings' }

export default async function NewRolePage() {
  const context = await getInvoiceContextResult()
  if (context.status !== 'ok') redirect('/no-access')
  const access = await resolveInvoiceFinanceAccess(context.context.orgId, context.context.userId, context.context.role)
  if (access.status !== 'ok' || !access.viewer.permissions.includes('roles:write')) redirect('/no-access')
  return <CreateRoleSection />
}

import { Suspense, type ReactNode } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AppError } from '@876/ui/app-error'

import { getInvoiceContextResult } from '@/lib/auth/context'
import { resolveInvoiceFinanceAccess } from '@/lib/auth/finance-access'

import { RolesListData } from './_components/roles-list-data'
import { InvoiceRolesShell } from './_components/roles-section'
import { ROLES_READ_PERMISSION } from '../_lib/settings-nav'

export const metadata: Metadata = {
  title: 'Roles',
}

export default async function RolesLayout({
  children,
}: {
  children: ReactNode
}) {
  const context = await getInvoiceContextResult()
  if (context.status === 'signed-out') redirect('/login')
  if (context.status === 'no-organization') redirect('/onboarding')
  if (context.status === 'unavailable')
    return (
      <AppError
        title="Roles could not be loaded"
        error={{
          code: 'invoice/access-unavailable',
          message: 'Access could not be verified. Try again.',
        }}
        variant="section"
      />
    )

  const access = await resolveInvoiceFinanceAccess(
    context.context.orgId,
    context.context.userId,
    context.context.role
  )
  if (access.status === 'unavailable')
    return (
      <AppError
        title="Roles could not be loaded"
        error={{
          code: access.code,
          message: 'Finance access could not be verified. Try again.',
        }}
        variant="section"
      />
    )
  if (!access.viewer.permissions.includes(ROLES_READ_PERMISSION))
    redirect('/no-access')

  return (
    <InvoiceRolesShell
      canCreate={access.viewer.permissions.includes('roles:write')}
      list={
        <Suspense fallback={<div className="flex h-full min-h-0 flex-col" />}>
          <RolesListData organizationId={context.context.orgId} />
        </Suspense>
      }
    >
      {children}
    </InvoiceRolesShell>
  )
}

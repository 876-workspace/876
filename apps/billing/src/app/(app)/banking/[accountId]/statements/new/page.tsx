import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import {
  Page,
  PageBreadcrumb,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@876/ui/page'

import { StatementImportForm } from '@/features/banking/components/statement-import-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

type Props = { params: Promise<{ accountId: string }> }

export const metadata: Metadata = {
  title: 'Import Bank Statement',
}

export default async function ImportBankStatementPage({ params }: Props) {
  const context = await requirePagePermission('banking:write')
  const { accountId } = await params
  const account = await service.bankAccounts.retrieve(context.tenant.id, accountId)
  if (!account) notFound()

  return (
    <Page>
      <PageBreadcrumb
        href={`/banking/${account.id}`}
        label={account.name}
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>Import bank statement</PageTitle>
        <PageDescription>
          Map a CSV or TSV statement, review the normalized transactions, then
          import them as external bank evidence. Importing does not create
          accounting transactions by itself.
        </PageDescription>
      </PageHeader>
      <StatementImportForm accountId={account.id} currency={account.currency} />
    </Page>
  )
}

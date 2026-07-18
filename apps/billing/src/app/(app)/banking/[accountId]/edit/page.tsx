import { notFound } from 'next/navigation'

import {
  Page,
  PageBreadcrumb,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@876/ui/page'

import { BankAccountForm } from '@/components/bank-account-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

type Props = { params: Promise<{ accountId: string }> }

export default async function EditBankAccountPage({ params }: Props) {
  const context = await requirePagePermission('banking:write')
  const { accountId } = await params
  const [account, currencies] = await Promise.all([
    service.bankAccounts.retrieve(context.tenant.id, accountId),
    service.currencies.list(context.tenant.id),
  ])
  if (!account) notFound()

  return (
    <Page>
      <PageBreadcrumb
        href={`/banking/${account.id}`}
        label={account.name}
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>Edit bank account</PageTitle>
        <PageDescription>
          Archive historical accounts instead of deleting their activity.
        </PageDescription>
      </PageHeader>
      <BankAccountForm
        initial={account}
        currencies={currencies.map(({ currency }) => ({
          value: currency.code,
          label: `${currency.name} (${currency.code})`,
        }))}
      />
    </Page>
  )
}

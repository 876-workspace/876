import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import {
  Page,
  PageBreadcrumb,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@876/ui/page'

import { BankAccountForm } from '@/features/banking/components/bank-account-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { getBilling } from '@/lib/clients/billing'

type Props = { params: Promise<{ accountId: string }> }

export const metadata: Metadata = {
  title: 'Edit Bank Account',
}

export default async function EditBankAccountPage({ params }: Props) {
  const [context, billing, { accountId }] = await Promise.all([
    requirePagePermission('banking:write'),
    getBilling(),
    params,
  ])
  const [account, currencies, banks] = await Promise.all([
    service.bankAccounts.retrieve(context.tenant.id, accountId),
    service.currencies.list(context.tenant.id),
    billing.bankDirectory.listBanks('JM'),
  ])
  if (!account) notFound()

  const branches = account.directoryBankId
    ? await billing.bankDirectory.listBranches(account.directoryBankId)
    : null
  const directoryError = banks.error ?? branches?.error ?? null

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
        initialBanks={banks.data?.data ?? []}
        initialBranches={branches?.data?.data ?? []}
        initialDirectoryError={directoryError?.message ?? null}
        countryCode="JM"
      />
    </Page>
  )
}

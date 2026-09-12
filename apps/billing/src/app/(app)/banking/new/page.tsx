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
import { getBilling } from '@/lib/services/billing'

export const metadata = { title: 'New Bank Account' }

export default async function NewBankAccountPage() {
  const [context, billing] = await Promise.all([
    requirePagePermission('banking:write'),
    getBilling(),
  ])
  const [currencies, banks] = await Promise.all([
    service.currencies.list(context.tenant.id),
    billing.bankDirectory.listBanks('JM'),
  ])

  return (
    <Page>
      <PageBreadcrumb href="/banking" label="Banking" className="mb-4" />
      <PageHeader className="mb-8">
        <PageTitle>New bank account</PageTitle>
        <PageDescription>
          Track one financial account in a single enabled currency.
        </PageDescription>
      </PageHeader>
      <BankAccountForm
        currencies={currencies.map(({ currency }) => ({
          value: currency.code,
          label: `${currency.name} (${currency.code})`,
        }))}
        initialBanks={banks.data?.data ?? []}
        initialDirectoryError={banks.error?.message ?? null}
        countryCode="JM"
      />
    </Page>
  )
}

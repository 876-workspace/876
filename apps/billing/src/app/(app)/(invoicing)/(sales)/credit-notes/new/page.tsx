import Link from 'next/link'
import { ChevronRightIcon } from '@876/ui/icons'
import { Page, PageHeader, PageTitle } from '@876/ui/page'

import { CreditNoteCreateForm } from './credit-note-create-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = { title: 'New Credit Note' }

export default async function NewCreditNotePage() {
  const context = await requirePagePermission('sales:write')

  const [customers, items, currencies] = await Promise.all([
    service.customers.list(context.tenant.id),
    service.items.list(context.tenant.id),
    service.currencies.list(context.tenant.id),
  ])

  return (
    <Page>
      <nav className="mb-5 flex items-center gap-1.5 text-sm">
        <Link
          href="/credit-notes"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Credit Notes
        </Link>
        <ChevronRightIcon className="text-muted-foreground size-4" />
        <span className="font-medium">New Credit Note</span>
      </nav>

      <PageHeader>
        <PageTitle>New Credit Note</PageTitle>
      </PageHeader>

      <CreditNoteCreateForm
        defaultCurrency={context.tenant.defaultCurrency}
        customers={customers.map((c) => ({ value: c.id, label: c.name }))}
        items={items.map((i) => ({ value: i.id, label: i.name }))}
        currencies={currencies.map(({ currency }) => ({
          value: currency.code,
          label: `${currency.name} (${currency.code})`,
        }))}
      />
    </Page>
  )
}

import Link from 'next/link'
import { ChevronRightIcon } from '@876/ui/icons'
import { Page, PageDescription, PageHeader, PageTitle } from '@876/ui/page'

import { CustomerImportWizard } from './customer-import-wizard'
import { requirePagePermission } from '@/lib/auth/billing-context'

export const metadata = { title: 'Import Customers' }

export default async function ImportCustomersPage() {
  await requirePagePermission('customers:write')

  return (
    <Page>
      <nav className="mb-5 flex items-center gap-1.5 text-sm">
        <Link
          href="/customers"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Customers
        </Link>
        <ChevronRightIcon className="text-muted-foreground size-4" />
        <span className="font-medium">Import</span>
      </nav>

      <PageHeader>
        <PageTitle>Import Customers</PageTitle>
        <PageDescription>
          Upload a CSV, TSV, or Excel file to add customers in bulk.
        </PageDescription>
      </PageHeader>

      <CustomerImportWizard />
    </Page>
  )
}

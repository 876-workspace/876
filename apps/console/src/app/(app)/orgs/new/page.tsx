import Link from 'next/link'
import { ChevronRightIcon } from '@876/ui/icons'

import { CreateOrgForm } from './create-org-form'
import { Page, PageHeader, PageTitle, PageDescription } from '@876/ui/page'

export const metadata = { title: 'New Organization' }

export default function NewOrganizationPage() {
  return (
    <Page>
      <nav className="mb-5 flex items-center gap-1.5 text-sm">
        <Link
          href="/org"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Organizations
        </Link>
        <ChevronRightIcon className="text-muted-foreground size-4" />
        <span className="font-medium">New Organization</span>
      </nav>

      <PageHeader>
        <PageTitle>New Organization</PageTitle>
        <PageDescription>
          Create a new organization on the platform.
        </PageDescription>
      </PageHeader>

      <CreateOrgForm />
    </Page>
  )
}

import Link from 'next/link'
import { ChevronRightIcon } from '@876/ui/icons'
import { Page, PageDescription, PageHeader, PageTitle } from '@876/ui/page'

import { CreateAppForm } from './create-app-form'

export const metadata = { title: 'New Application' }

export default function NewAppPage() {
  return (
    <Page>
      <nav className="mb-5 flex items-center gap-1.5 text-sm">
        <Link
          href="/apps"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Apps
        </Link>
        <ChevronRightIcon className="text-muted-foreground size-4" />
        <span className="font-medium">New Application</span>
      </nav>

      <PageHeader>
        <PageTitle>New Application</PageTitle>
        <PageDescription>
          Register a first-party or external application.
        </PageDescription>
      </PageHeader>

      <CreateAppForm />
    </Page>
  )
}

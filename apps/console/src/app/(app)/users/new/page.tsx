import Link from 'next/link'
import { ChevronRightIcon } from '@876/ui/icons'

import { CreateUserForm } from './create-user-form'
import { Page, PageHeader, PageTitle } from '@876/ui/page'

export const metadata = { title: 'New User' }

export default function NewUserPage() {
  return (
    <Page>
      <nav className="mb-5 flex items-center gap-1.5 text-sm">
        <Link
          href="/users"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Users
        </Link>
        <ChevronRightIcon className="text-muted-foreground size-4" />
        <span className="font-medium">New User</span>
      </nav>

      <PageHeader>
        <PageTitle>New User</PageTitle>
      </PageHeader>

      <CreateUserForm />
    </Page>
  )
}

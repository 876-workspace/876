import type { Metadata } from 'next'
import { Settings } from '@876/ui/icons'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { Page, PageHeader, PageTitle } from '@876/ui/page'

export const metadata: Metadata = {
  title: 'Settings | 876',
  robots: { index: false, follow: false },
}

export default async function OrganizationSettingsPage() {
  return (
    <Page>
      <PageHeader>
        <PageTitle>Settings</PageTitle>
      </PageHeader>

      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Settings />
          </EmptyMedia>
          <EmptyTitle>Coming soon</EmptyTitle>
        </EmptyHeader>
      </Empty>
    </Page>
  )
}

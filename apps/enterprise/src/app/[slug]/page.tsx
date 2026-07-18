import type { Metadata } from 'next'
import { LayoutDashboard } from '@876/ui/icons'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { Page, PageHeader, PageTitle } from '@876/ui/page'

export const metadata: Metadata = {
  title: 'Workspace | 876',
  robots: { index: false, follow: false },
}

export default function OrganizationHomePage() {
  return (
    <Page>
      <PageHeader>
        <PageTitle>Overview</PageTitle>
      </PageHeader>

      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LayoutDashboard />
          </EmptyMedia>
          <EmptyTitle>Coming soon</EmptyTitle>
        </EmptyHeader>
      </Empty>
    </Page>
  )
}

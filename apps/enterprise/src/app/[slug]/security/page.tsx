import type { Metadata } from 'next'
import { ShieldCheck } from '@876/ui/icons'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { Page, PageHeader, PageTitle } from '@876/ui/page'

export const metadata: Metadata = {
  title: 'Security | 876',
  robots: { index: false, follow: false },
}

export default function OrganizationSecurityPage() {
  return (
    <Page>
      <PageHeader>
        <PageTitle>Security</PageTitle>
      </PageHeader>

      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShieldCheck />
          </EmptyMedia>
          <EmptyTitle>Coming soon</EmptyTitle>
        </EmptyHeader>
      </Empty>
    </Page>
  )
}

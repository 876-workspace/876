import type { Metadata } from 'next'
import { Page, PageHeader, PageTitle } from '@876/ui/page'
import { requireOrgMembership, requireSession } from '@/lib/auth/guards'

export const metadata: Metadata = {
  title: 'Profile | 876',
  robots: { index: false, follow: false },
}

export default async function OrganizationProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const sessionUser = await requireSession(`/${slug}/profile`)
  const { user } = await requireOrgMembership(sessionUser.id, slug)
  const displayName =
    (user.firstName ?? [user.lastName].filter(Boolean).join(' ')) || user.email

  return (
    <Page>
      <PageHeader>
        <PageTitle>Hi, {displayName} 👋</PageTitle>
      </PageHeader>
    </Page>
  )
}

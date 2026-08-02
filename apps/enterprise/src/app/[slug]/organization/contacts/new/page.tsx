import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

import { ErrorState } from '@/components/patterns/error-state'
import { get876ServerClient } from '@/lib/876/server'
import { requireOrgPermission, requireSession } from '@/lib/auth/guards'

import { ContactForm } from '../_components/contact-form'

export default async function NewContactPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const sessionUser = await requireSession(`/${slug}/organization/contacts/new`)
  const { membership } = await requireOrgPermission(
    sessionUser.id,
    slug,
    'org:update'
  )

  const orgId = membership.organization.id
  const client = await get876ServerClient()
  const membersResult = await client.organizationMembers.list(orgId)
  if (membersResult.error) {
    return (
      <Page>
        <PageBreadcrumb
          href={`/${slug}/organization/contacts`}
          label="Contacts"
          className="mb-4"
        />
        <PageHeader>
          <PageTitle>Add</PageTitle>
        </PageHeader>
        <ErrorState error={membersResult.error} />
      </Page>
    )
  }

  const members = membersResult.data.data.map((member) => {
    const name = [member.first_name, member.last_name].filter(Boolean).join(' ')
    const label = name
      ? member.email
        ? `${name} (${member.email})`
        : name
      : (member.email ?? member.user_id)
    return { user_id: member.user_id, label }
  })

  return (
    <Page>
      <PageBreadcrumb
        href={`/${slug}/organization/contacts`}
        label="Contacts"
        className="mb-4"
      />
      <PageHeader>
        <PageTitle>Add</PageTitle>
      </PageHeader>

      <ContactForm slug={slug} members={members} />
    </Page>
  )
}

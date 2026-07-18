import { notFound } from 'next/navigation'

import { isNotFoundError } from '@876/admin'
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

import { ErrorState } from '@/components/enterprise/error-state'
import { getAdminClient } from '@/lib/auth/admin-client'
import { requireOrgPermission, requireSession } from '@/lib/auth/guards'

import { ContactForm } from '../../contact-form'

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ slug: string; contactId: string }>
}) {
  const { slug, contactId } = await params
  const sessionUser = await requireSession(
    `/${slug}/organization/contacts/${contactId}/edit`
  )
  const { membership } = await requireOrgPermission(
    sessionUser.id,
    slug,
    'org:update'
  )

  const orgId = membership.organization.id
  const client = await getAdminClient()
  const [contactResult, membersResult] = await Promise.all([
    client.orgs.contacts.retrieve(orgId, contactId),
    client.orgs.members.list(orgId, { limit: 100 }),
  ])

  if (isNotFoundError(contactResult.error)) notFound()

  const loadError = contactResult.error ?? membersResult.error
  if (loadError || !contactResult.data || !membersResult.data) {
    return (
      <Page>
        <PageBreadcrumb
          href={`/${slug}/organization/contacts`}
          label="Contacts"
          className="mb-4"
        />
        <PageHeader>
          <PageTitle>Edit</PageTitle>
        </PageHeader>
        <ErrorState
          error={
            loadError ?? { code: 'admin/error', message: 'An error occurred.' }
          }
        />
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
        <PageTitle>Edit</PageTitle>
      </PageHeader>

      <ContactForm slug={slug} contact={contactResult.data} members={members} />
    </Page>
  )
}

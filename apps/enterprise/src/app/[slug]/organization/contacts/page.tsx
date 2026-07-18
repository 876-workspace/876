import Link from 'next/link'

import { Badge } from '@876/ui/badge'
import { buttonVariants } from '@876/ui/button'
import { Empty, EmptyHeader, EmptyTitle } from '@876/ui/empty'
import { Plus } from '@876/ui/icons'
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

import { ErrorState } from '@/components/enterprise/error-state'
import { getAdminClient } from '@/lib/auth/admin-client'
import {
  hasOrgPermission,
  requireOrgPermission,
  requireSession,
} from '@/lib/auth/guards'

export default async function OrganizationContactsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const sessionUser = await requireSession(`/${slug}/organization/contacts`)
  const { membership } = await requireOrgPermission(
    sessionUser.id,
    slug,
    'org:read'
  )

  const canManage = hasOrgPermission(membership, 'org:update')

  const client = await getAdminClient()
  const contactsResult = await client.orgs.contacts.list(
    membership.organization.id
  )
  const contacts = contactsResult.data?.data ?? []

  return (
    <Page>
      <PageBreadcrumb
        href={`/${slug}/organization`}
        label="Organization"
        className="mb-4"
      />
      <PageHeader className="flex items-center justify-between gap-4">
        <PageTitle>Contacts</PageTitle>
        {canManage && (
          <Link
            href={`/${slug}/organization/contacts/new`}
            className={buttonVariants({ variant: 'info' })}
          >
            <Plus aria-hidden="true" className="size-3.5" />
            Add
          </Link>
        )}
      </PageHeader>

      {contactsResult.error ? (
        <ErrorState error={contactsResult.error} />
      ) : contacts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No contacts</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((contact) => {
            const fullName = [contact.first_name, contact.last_name]
              .filter(Boolean)
              .join(' ')

            const cardContent = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium">{fullName}</span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {contact.is_primary && (
                      <Badge variant="outline">Primary</Badge>
                    )}
                    {contact.user_id && <Badge variant="outline">Member</Badge>}
                  </div>
                </div>
                <div className="text-muted-foreground mt-2 space-y-0.5 text-xs">
                  <div className="capitalize">{contact.type}</div>
                  {contact.title && <div>{contact.title}</div>}
                  {contact.email && <div>{contact.email}</div>}
                  {contact.phone && <div>{contact.phone}</div>}
                  {!contact.phone && contact.mobile && (
                    <div>{contact.mobile}</div>
                  )}
                </div>
              </>
            )

            return canManage ? (
              <Link
                key={contact.id}
                href={`/${slug}/organization/contacts/${contact.id}/edit`}
                className="876-card hover:border-876-accent-fg/30 block p-5 transition-colors"
              >
                {cardContent}
              </Link>
            ) : (
              <div key={contact.id} className="876-card p-5">
                {cardContent}
              </div>
            )
          })}
        </div>
      )}
    </Page>
  )
}

import Link from 'next/link'

import type { AdminOrganization } from '@876/admin'
import { buttonVariants } from '@876/ui/button'
import { Pencil } from '@876/ui/icons'
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

import { ErrorState } from '@/components/enterprise/error-state'
import { getAdminClient } from '@/lib/auth/admin-client'
import {
  hasOrgPermission,
  requireOrgPermission,
  requireSession,
} from '@/lib/auth/guards'

import { SECTIONS } from '../organization-sections'

export default async function OrganizationDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const sessionUser = await requireSession(`/${slug}/organization/details`)
  const { membership } = await requireOrgPermission(
    sessionUser.id,
    slug,
    'org:read'
  )

  const client = await getAdminClient()
  const orgResult = await client.orgs.retrieve(membership.organization.id)

  const canManage = hasOrgPermission(membership, 'org:update')

  return (
    <Page>
      <PageBreadcrumb
        href={`/${slug}/organization`}
        label="Organization"
        className="mb-4"
      />
      <PageHeader className="flex items-center justify-between gap-4">
        <PageTitle>Details</PageTitle>
        {canManage && !orgResult.error && (
          <Link
            href={`/${slug}/organization/edit`}
            className={buttonVariants({ variant: 'outline' })}
          >
            <Pencil aria-hidden="true" className="size-3.5" />
            Edit
          </Link>
        )}
      </PageHeader>

      {orgResult.error ? (
        <ErrorState error={orgResult.error} />
      ) : (
        <div className="max-w-3xl space-y-5">
          {SECTIONS.map((section) => {
            const Icon = section.icon
            return (
              <section key={section.title} className="876-card p-5">
                <h2 className="text-foreground mb-4 flex items-center gap-2 text-sm font-medium">
                  <span className="bg-876-accent-surface text-876-accent-fg flex size-6 shrink-0 items-center justify-center rounded-md">
                    <Icon aria-hidden="true" className="size-3.5" />
                  </span>
                  {section.title}
                </h2>
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  {section.fields.map((field) => {
                    const value =
                      (orgResult.data[field.key as keyof AdminOrganization] as
                        | string
                        | null) ?? ''
                    return (
                      <div key={field.key}>
                        <dt className="text-muted-foreground text-xs font-medium">
                          {field.label}
                        </dt>
                        <dd
                          className={
                            value
                              ? `mt-0.5 text-sm ${field.code ? 'font-mono uppercase' : ''}`
                              : 'text-muted-foreground mt-0.5 text-sm'
                          }
                        >
                          {value || '—'}
                        </dd>
                      </div>
                    )
                  })}
                </dl>
              </section>
            )
          })}
        </div>
      )}
    </Page>
  )
}

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageBreadcrumb } from '@876/ui/page'

import { resolveOrg } from '../_data'
import { EditOrgForm } from './edit-org-form'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Organization not found' }
  return { title: `${org.name ?? org.slug} • Edit - Organizations` }
}

export default async function EditOrgPage({ params }: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return (
    <div className="mx-auto max-w-3xl">
      <PageBreadcrumb
        href={`/orgs/${org.slug}`}
        label="Organization"
        className="mb-4 -ml-2.5"
      />
      <h1 className="876-page-title">Edit {org.name ?? org.slug}</h1>
      <p className="text-muted-foreground mt-1 mb-6 text-sm">
        Update the organization&apos;s identity, contact info, and address.
      </p>
      <EditOrgForm org={org} />
    </div>
  )
}

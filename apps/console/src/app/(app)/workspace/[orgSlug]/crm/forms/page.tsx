import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EmptyWorkspaceView } from '@/features/orgs/components/empty-workspace-view'
import { resolveOrg } from '@/features/orgs/org-data'

type Props = { params: Promise<{ orgSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Forms' }

  return { title: `${org.name ?? org.slug} • Forms - CRM` }
}

export default async function CrmWorkspaceFormsPage({ params }: Props) {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <EmptyWorkspaceView
      title="Forms"
      description="No request forms are published in this workspace yet."
      iconKey="forms"
    />
  )
}

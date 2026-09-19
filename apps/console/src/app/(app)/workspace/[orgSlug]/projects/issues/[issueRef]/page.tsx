import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { IssueDetailData } from '@/features/projects/components/issue-detail-data'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { projects } from '@/lib/clients/projects'

import { resolveOrg } from '@/features/orgs/org-data'
import { projectsBase } from '@/features/orgs/app-workspaces'

type Props = {
  params: Promise<{ orgSlug: string; issueRef: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, issueRef } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Issue' }

  const result = await projects.issues.retrieve(org.id, issueRef)
  if (!result.data) return { title: 'Issue' }

  return {
    title: `${result.data.identifier}: ${result.data.title} • Issues - Organizations`,
  }
}

export default async function OrganizationIssueDetailPage({ params }: Props) {
  const { orgSlug, issueRef } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <Suspense fallback={<IssueDetailFallback />}>
      <IssueDetailSection
        organizationId={org.id}
        orgSlug={orgSlug}
        issueRef={issueRef}
      />
    </Suspense>
  )
}

async function IssueDetailSection({
  organizationId,
  orgSlug,
  issueRef,
}: {
  organizationId: string
  orgSlug: string
  issueRef: string
}) {
  const session = await getAuthSession()
  const actorUserId = isSignedSession(session) ? session.user.id : null

  return (
    <IssueDetailData
      organizationId={organizationId}
      base={projectsBase(orgSlug)}
      issueRef={issueRef}
      actorUserId={actorUserId}
    />
  )
}

function IssueDetailFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-28" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-7 w-80" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
        <Skeleton className="h-72 rounded-lg" />
      </div>
    </div>
  )
}

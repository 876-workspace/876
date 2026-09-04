import { AppError } from '@876/ui/app-error'
import { buttonVariants } from '@876/ui/button'
import { ArrowLeft } from '@876/ui/icons'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { CreateFormSkeleton } from '@/features/projects/components/create-form-skeleton'
import { IssueCreateForm } from '@/features/projects/components/issue-create-form'
import { requireSession } from '@/lib/auth/guards'
import { projects } from '@/lib/services/projects'

import { resolveOrg } from '@/features/orgs/org-data'
import { projectsBase } from '@/features/orgs/app-workspaces'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'New Issue • Issues - Organizations' }
}

export default async function NewIssuePage({ params }: Props) {
  const { orgSlug } = await params
  const base = projectsBase(orgSlug)

  return (
    <div className="space-y-6">
      <Link
        href={`${base}/issues`}
        className={buttonVariants({
          variant: 'outline',
          size: 'sm',
          className: 'inline-flex items-center gap-1.5',
        })}
      >
        <ArrowLeft className="size-3.5" />
        Back to issues
      </Link>

      <Suspense fallback={<CreateFormSkeleton rows={5} />}>
        <IssueCreateFormData orgSlug={orgSlug} />
      </Suspense>
    </div>
  )
}

async function IssueCreateFormData({ orgSlug }: { orgSlug: string }) {
  const base = projectsBase(orgSlug)
  const [org, sessionUser] = await Promise.all([
    resolveOrg(orgSlug),
    requireSession(`${base}/issues/new`),
  ])
  if (!org) notFound()

  const result = await projects.projects.list(org.id, {})
  // A failed list is not an empty one — see the platform route.
  if (result.error)
    return (
      <AppError
        title="Projects could not be loaded"
        error={result.error}
        variant="banner"
        showCode
      />
    )

  return (
    <IssueCreateForm
      organizationId={org.id}
      base={base}
      projects={(result.data?.data ?? []).map((project) => ({
        id: project.id,
        name: project.name,
        key: project.key,
      }))}
      currentUserId={sessionUser.id}
    />
  )
}

import { AppError } from '@876/ui/app-error'
import { buttonVariants } from '@876/ui/button'
import { ArrowLeft } from '@876/ui/icons'
import { Page } from '@876/ui/page'
import Link from 'next/link'
import { Suspense } from 'react'

import { CreateFormSkeleton } from '@/features/projects/components/create-form-skeleton'
import { IssueCreateForm } from '@/features/projects/components/issue-create-form'
import { requireSession } from '@/lib/auth/guards'
import { projects } from '@/lib/services/projects'

import { requirePlatformProjectsOrgId } from '../../_lib/base'
import { PLATFORM_PROJECTS_BASE } from '../../_lib/paths'

export const metadata = { title: 'New Issue • Issues' }

export default function PlatformNewIssuePage() {
  return (
    <Page className="space-y-6">
      <Link
        href={`${PLATFORM_PROJECTS_BASE}/issues`}
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
        <IssueCreateFormData />
      </Suspense>
    </Page>
  )
}

async function IssueCreateFormData() {
  // Independent: the organization lookup does not need the session, so they
  // start together rather than one after the other.
  const [organizationId, sessionUser] = await Promise.all([
    requirePlatformProjectsOrgId(),
    requireSession(`${PLATFORM_PROJECTS_BASE}/issues/new`),
  ])

  const result = await projects.projects.list(organizationId, {})
  // A failed list is not an empty one. Rendering the form's "create a project
  // first" state here would tell the operator something untrue.
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
      organizationId={organizationId}
      base={PLATFORM_PROJECTS_BASE}
      projects={(result.data?.data ?? []).map((project) => ({
        id: project.id,
        name: project.name,
        key: project.key,
      }))}
      currentUserId={sessionUser.id}
    />
  )
}

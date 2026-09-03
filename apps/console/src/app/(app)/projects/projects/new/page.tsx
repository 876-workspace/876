import { buttonVariants } from '@876/ui/button'
import { ArrowLeft } from '@876/ui/icons'
import { Page } from '@876/ui/page'
import Link from 'next/link'
import { Suspense } from 'react'

import { CreateFormSkeleton } from '@/features/projects/components/create-form-skeleton'
import { ProjectCreateForm } from '@/features/projects/components/project-create-form'

import { requirePlatformProjectsOrgId } from '../../_lib/base'
import { PLATFORM_PROJECTS_BASE } from '../../_lib/paths'

export const metadata = { title: 'New Project • Projects' }

export default function PlatformNewProjectPage() {
  return (
    <Page className="space-y-6">
      <Link
        href={`${PLATFORM_PROJECTS_BASE}/projects`}
        className={buttonVariants({
          variant: 'outline',
          size: 'sm',
          className: 'inline-flex items-center gap-1.5',
        })}
      >
        <ArrowLeft className="size-3.5" />
        Back to projects
      </Link>

      <Suspense fallback={<CreateFormSkeleton />}>
        <ProjectCreateFormData />
      </Suspense>
    </Page>
  )
}

async function ProjectCreateFormData() {
  const organizationId = await requirePlatformProjectsOrgId()

  return (
    <ProjectCreateForm
      organizationId={organizationId}
      base={PLATFORM_PROJECTS_BASE}
    />
  )
}

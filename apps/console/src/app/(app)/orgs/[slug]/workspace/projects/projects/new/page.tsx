import { buttonVariants } from '@876/ui/button'
import { ArrowLeft } from '@876/ui/icons'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { CreateFormSkeleton } from '@/features/projects/components/create-form-skeleton'
import { ProjectCreateForm } from '@/features/projects/components/project-create-form'

import { resolveOrg } from '../../../../_data'
import { workspaceProjectsBase } from '../../_lib/base'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'New Project • Projects - Organizations' }
}

export default async function NewProjectPage({ params }: Props) {
  // `params` carries no I/O, so awaiting it here keeps the chrome immediate.
  const { slug } = await params
  const base = workspaceProjectsBase(slug)

  return (
    <div className="space-y-6">
      <Link
        href={`${base}/projects`}
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
        <ProjectCreateFormData slug={slug} />
      </Suspense>
    </div>
  )
}

async function ProjectCreateFormData({ slug }: { slug: string }) {
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return (
    <ProjectCreateForm
      organizationId={org.id}
      base={workspaceProjectsBase(slug)}
    />
  )
}

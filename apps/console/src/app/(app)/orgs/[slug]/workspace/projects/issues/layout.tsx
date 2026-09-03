import { Suspense, type ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { notFound } from 'next/navigation'

import { IssuesData } from '@/features/projects/components/issues-data'
import { ISSUES_SKELETON_COLUMNS } from '@/features/projects/components/issues-skeleton-columns'

import { resolveOrg } from '../../../_data'
import { workspaceProjectsBase } from '../_lib/base'
import { IssuesSection } from './_components/issues-section'

type Props = {
  children: ReactNode
  params: Promise<{ slug: string }>
}

const WORKSPACE_CONTENT_HEIGHT =
  'min-h-[32rem] h-[calc(100svh-11rem)] sm:h-[calc(100svh-12rem)] lg:h-[calc(100svh-13rem)]'

export default async function OrganizationIssuesLayout({
  children,
  params,
}: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return (
    <div className={WORKSPACE_CONTENT_HEIGHT}>
      <IssuesSection
        slug={slug}
        list={
          <Suspense
            fallback={
              <DataTableSkeleton columns={ISSUES_SKELETON_COLUMNS} rows={5} />
            }
          >
            <IssuesData
              organizationId={org.id}
              base={workspaceProjectsBase(slug)}
            />
          </Suspense>
        }
      >
        {children}
      </IssuesSection>
    </div>
  )
}

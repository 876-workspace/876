import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { projects } from '@/lib/services/projects'
import { LabelsTable } from '@876/projects-ui/labels-list'

import { resolveOrg } from '../../../app/(app)/orgs/[slug]/_data'

export async function LabelsData({ slug }: { slug: string }) {
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const result = await projects.labels.list(org.id)

  return (
    <div className="space-y-3">
      {result.error ? (
        <AppError
          title="Label data could not be loaded"
          error={result.error}
          variant="banner"
          showCode
        />
      ) : null}
      <LabelsTable labels={result.data?.data ?? []} />
    </div>
  )
}

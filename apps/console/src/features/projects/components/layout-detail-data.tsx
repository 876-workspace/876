import Link from 'next/link'

import { AppError } from '@876/ui/app-error'
import { LayoutSummary } from '@876/projects-ui/layouts/layout-summary'
import { notFound } from 'next/navigation'

import { projects } from '@/lib/services/projects'

const SYSTEM_FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  state: 'State',
  priority: 'Priority',
  assignee: 'Assignee',
  dueDate: 'Due date',
  startDate: 'Start date',
  estimate: 'Estimate',
  labels: 'Labels',
  phase: 'Phase',
  taskList: 'Task list',
}

/**
 * The data half of the Layout detail, shared by every host. Read-only: the
 * shared `LayoutSummary` with catalog-resolved field labels, no edit
 * affordances.
 */
export async function LayoutDetailData({
  organizationId,
  base,
  layoutId,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
  layoutId: string
}) {
  const layoutResult = await projects.layouts.retrieve(
    organizationId,
    decodeURIComponent(layoutId)
  )

  if (layoutResult.error?.code === 'projects/layout-not-found') notFound()

  if (layoutResult.error || !layoutResult.data) {
    return (
      <AppError
        title="Layout could not be loaded"
        error={layoutResult.error}
        variant="banner"
        showCode
      />
    )
  }

  const layout = layoutResult.data
  const fieldsResult = await projects.projectCustomFields.list(organizationId)

  const fieldLabels: Record<string, string> = { ...SYSTEM_FIELD_LABELS }
  for (const field of fieldsResult.data?.data ?? []) {
    fieldLabels[`cf:${field.key}`] = field.label
  }

  return (
    <div className="space-y-6">
      {fieldsResult.error ? (
        <AppError
          title="Some layout details could not be loaded"
          error={fieldsResult.error}
          variant="banner"
          showCode
        />
      ) : null}
      <LayoutSummary layout={layout} fieldLabels={fieldLabels} />
      <Link
        href={`${base}/layouts`}
        className="text-muted-foreground text-sm hover:underline"
      >
        Back to layouts
      </Link>
    </div>
  )
}

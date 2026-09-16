import { AppError } from '@876/ui/app-error'
import { PhaseDetail } from '@876/projects-ui/phase-detail'
import { notFound } from 'next/navigation'

import { projects } from '@/lib/services/projects'

/**
 * The data half of the Phase detail, shared by every host. Read-only: no
 * edit/clone affordances, so `editHref`/`cloneHref` stay unset.
 */
export async function PhaseDetailData({
  organizationId,
  phaseId,
}: {
  organizationId: string
  phaseId: string
}) {
  const phaseResult = await projects.milestones.retrieve(
    organizationId,
    phaseId
  )

  if (phaseResult.error?.code === 'projects/milestone-not-found') notFound()

  if (phaseResult.error || !phaseResult.data) {
    return (
      <AppError
        title="Phase could not be loaded"
        error={phaseResult.error}
        variant="banner"
        showCode
      />
    )
  }

  const phase = phaseResult.data
  const [
    projectResult,
    summaryResult,
    commentsResult,
    eventsResult,
    fieldsResult,
    valuesResult,
  ] = await Promise.all([
    projects.projects.retrieve(organizationId, phase.projectId),
    projects.milestones.summary.retrieve(organizationId, phase.id),
    projects.milestones.comments.list(organizationId, phase.id),
    projects.milestones.events.list(organizationId, phase.id),
    projects.milestones.customFields.list(organizationId),
    projects.milestones.customFields.values.list(organizationId, phase.id),
  ])

  const enrichmentError =
    projectResult.error ??
    summaryResult.error ??
    commentsResult.error ??
    eventsResult.error ??
    fieldsResult.error ??
    valuesResult.error

  return (
    <div className="space-y-6">
      {enrichmentError ? (
        <AppError
          title="Some phase details could not be loaded"
          error={enrichmentError}
          variant="banner"
          showCode
        />
      ) : null}
      <PhaseDetail
        phase={phase}
        project={projectResult.data}
        summary={summaryResult.data}
        events={eventsResult.data?.data ?? []}
        fields={fieldsResult.data?.data ?? []}
        fieldValues={valuesResult.data?.data ?? []}
      />
    </div>
  )
}

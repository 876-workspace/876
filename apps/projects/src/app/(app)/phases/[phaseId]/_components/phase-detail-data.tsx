import { PhaseDetail } from '@876/projects-ui/phase-detail'
import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { ClientVisibleToggle } from '@/features/collaboration/components/client-visible-toggle'
import { FollowData } from '@/features/collaboration/components/follow-data'
import { AttachmentsData } from '@/features/projects/components/attachments-data'
import { PhaseComments } from '@/features/projects/components/phase-comments'
import { PhaseCustomFieldsForm } from '@/features/projects/components/phase-custom-fields-form'
import { loadMemberLabels } from '@/features/projects/member-labels'
import { projects } from '@/lib/services/projects'
import {
  getPhaseVisibility,
  listPhaseCommentVisibility,
} from '@/lib/visibility'

export async function PhaseDetailData({
  orgId,
  phaseId,
  currentUserId,
  canEdit,
  canCreate,
}: {
  orgId: string
  phaseId: string
  currentUserId: string
  canEdit: boolean
  canCreate: boolean
}) {
  const phaseResult = await projects.milestones.retrieve(orgId, phaseId)

  if (phaseResult.error?.code === 'projects/milestone-not-found') notFound()
  if (phaseResult.error || !phaseResult.data)
    return (
      <AppError
        title="The phase could not be loaded"
        error={
          phaseResult.error ?? {
            code: 'projects/phase-unavailable',
            message: 'The phase could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  const phase = phaseResult.data
  const [
    projectResult,
    summary,
    comments,
    events,
    fields,
    values,
    members,
    phaseVisible,
    commentVisibility,
  ] = await Promise.all([
    projects.projects.retrieve(orgId, phase.projectId),
    projects.milestones.summary.retrieve(orgId, phase.id),
    projects.milestones.comments.list(orgId, phase.id),
    projects.milestones.events.list(orgId, phase.id),
    projects.milestones.customFields.list(orgId),
    projects.milestones.customFields.values.list(orgId, phase.id),
    loadMemberLabels(orgId),
    canEdit ? getPhaseVisibility(orgId, phase.id) : Promise.resolve(null),
    canEdit
      ? listPhaseCommentVisibility(orgId, phase.id)
      : Promise.resolve({} as Readonly<Record<string, boolean>>),
  ])

  const enrichmentError =
    projectResult.error ??
    summary.error ??
    comments.error ??
    events.error ??
    fields.error ??
    values.error ??
    members.error

  return (
    <div className="space-y-6">
      {enrichmentError ? (
        <AppError
          title="Some phase details could not be loaded"
          error={enrichmentError}
          variant="banner"
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <FollowData
          orgId={orgId}
          userId={currentUserId}
          subjectType="phase"
          subjectId={phase.id}
        />
        {canEdit && phaseVisible !== null ? (
          <ClientVisibleToggle
            endpoint={`/api/phases/${encodeURIComponent(phase.id)}/visibility`}
            initialVisible={phaseVisible}
            label={phase.name}
          />
        ) : null}
      </div>

      <PhaseDetail
        phase={phase}
        project={projectResult.data ?? null}
        summary={summary.data ?? null}
        events={events.data?.data ?? []}
        fields={fields.data?.data ?? []}
        fieldValues={values.data?.data ?? []}
        ownerLabels={members.labels}
        editHref={
          canEdit ? `/phases/${encodeURIComponent(phase.id)}/edit` : undefined
        }
        cloneHref={
          canCreate
            ? `/phases/${encodeURIComponent(phase.id)}/clone`
            : undefined
        }
      />

      <PhaseCustomFieldsForm
        phaseId={phase.id}
        fields={fields.data?.data ?? []}
        fieldValues={values.data?.data ?? []}
        canEdit={canEdit}
      />

      <PhaseComments
        phaseId={phase.id}
        comments={comments.data?.data ?? []}
        currentUserId={currentUserId}
        userLabels={members.labels}
        canEdit={canEdit}
        clientVisibilityById={commentVisibility}
        commentVisibilityBasePath={`/api/phases/${encodeURIComponent(phase.id)}/comments`}
        canToggleClientVisibility={canEdit}
      />

      <Suspense
        fallback={
          <div className="text-muted-foreground text-sm">
            Loading attachments…
          </div>
        }
      >
        <AttachmentsData
          orgId={orgId}
          userId={currentUserId}
          projectId={phase.projectId}
          resourceType="milestone"
          resourceId={phase.id}
          canEdit={canEdit}
        />
      </Suspense>
    </div>
  )
}

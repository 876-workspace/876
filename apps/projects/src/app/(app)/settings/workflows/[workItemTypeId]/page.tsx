import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import {
  requireAppPermission,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { serviceBlueprintToUi } from '@/lib/automation-mappers'
import { projects } from '@/lib/services/projects'

import { BlueprintForm } from './_components/blueprint-form'

export const metadata = { title: 'Workflow blueprint' }

type Props = { params: Promise<{ workItemTypeId: string }> }

const WORK_ITEM_SYSTEM_FIELD_KEYS = [
  'title',
  'description',
  'state',
  'priority',
  'assignee',
  'dueDate',
  'startDate',
  'estimate',
  'labels',
  'phase',
  'taskList',
]

const BLUEPRINT_PERMISSION_OPTIONS = [
  'projects.view',
  'projects.edit',
  'projects.issues.create',
  'projects.labels.create',
  'projects.layouts.create',
  'issues.view',
  'issues.create',
  'issues.edit',
  'labels.view',
  'labels.create',
  'settings.edit',
]

export default async function WorkflowBlueprintPage({ params }: Props) {
  await requireAppPermission('settings.edit')
  const { orgId } = await requireProjectsContext()
  const { workItemTypeId } = await params
  const decodedId = decodeURIComponent(workItemTypeId)

  const [types, blueprint, states, fields] = await Promise.all([
    projects.workItemTypes.list(orgId),
    projects.workflows.getBlueprint(orgId, decodedId),
    projects.workflowStates.list(orgId),
    projects.customFields.list(orgId),
  ])

  const type = (types.data?.data ?? []).find((entry) => entry.id === decodedId)
  if (!type && types.data) notFound()

  if (blueprint.error || !blueprint.data)
    return (
      <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
        <PageBreadcrumb
          href="/settings/workflows"
          label="Workflows"
          className="mb-4"
        />
        <AppError
          title="The blueprint could not be loaded"
          error={
            blueprint.error ?? {
              code: 'projects/blueprint-unavailable',
              message: 'The blueprint could not be loaded.',
            }
          }
          variant="banner"
        />
      </div>
    )

  const loadError = types.error ?? states.error ?? fields.error

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb
        href="/settings/workflows"
        label="Workflows"
        className="mb-4"
      />
      <h1 className="876-page-title mb-2">
        {type?.name ?? 'Work item type'} blueprint
      </h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Transitions say which state changes are allowed and what each one
        requires. An empty blueprint keeps every state change allowed.
      </p>
      {loadError ? (
        <div className="mb-4">
          <AppError
            title="Some blueprint options could not be loaded"
            error={loadError}
            variant="banner"
          />
        </div>
      ) : null}
      <BlueprintForm
        workItemTypeId={decodedId}
        typeName={type?.name ?? 'Blueprint'}
        initial={serviceBlueprintToUi(blueprint.data)}
        availableStates={(states.data?.data ?? []).map((state) => ({
          key: state.key,
          label: state.name,
        }))}
        availableFieldKeys={[
          ...WORK_ITEM_SYSTEM_FIELD_KEYS,
          ...(fields.data?.data ?? []).map((field) => `cf:${field.key}`),
        ]}
        permissionOptions={BLUEPRINT_PERMISSION_OPTIONS}
      />
    </div>
  )
}

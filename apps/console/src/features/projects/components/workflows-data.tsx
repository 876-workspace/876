import { AppError } from '@876/ui/app-error'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { WrenchScrewdriverIcon } from '@876/ui/icons'

import { projects } from '@/lib/services/projects'

import { WorkflowTransitionsTable } from './workflow-transitions-table'

const EMPTY_TITLE = 'No work item types yet'

/**
 * The data half of the Workflows list, shared by every host. Read-only: one
 * section per work item type, each rendering its blueprint as a Console-local
 * transitions table. The shared `BlueprintEditor` is an editing surface with
 * no read-only mode, so it is deliberately not used here.
 */
export async function WorkflowsData({
  organizationId,
}: {
  organizationId: string
}) {
  const [typesResult, statesResult] = await Promise.all([
    projects.workItemTypes.list(organizationId),
    projects.workflowStates.list(organizationId),
  ])

  const loadError = typesResult.error ?? statesResult.error
  const types = typesResult.data?.data ?? []
  const stateNames = new Map(
    (statesResult.data?.data ?? []).map((state) => [state.key, state.name])
  )

  const blueprints = await Promise.all(
    types.map((type) => projects.workflows.getBlueprint(organizationId, type.id))
  )

  const blueprintError = blueprints.find((entry) => entry.error)?.error ?? null
  const transitionsByType = new Map(
    types.map((type, index) => [type.id, blueprints[index]?.data ?? null])
  )

  if (types.length === 0 && !typesResult.error) {
    return (
      <div className="space-y-3">
        {loadError ? (
          <AppError
            title="Workflow data could not be loaded"
            error={loadError}
            variant="banner"
            showCode
          />
        ) : null}
        <Empty className="876-card py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WrenchScrewdriverIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle>{EMPTY_TITLE}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {loadError ? (
        <AppError
          title="Workflow data could not be loaded"
          error={loadError}
          variant="banner"
          showCode
        />
      ) : null}
      {blueprintError ? (
        <AppError
          title="Some blueprints could not be loaded"
          error={blueprintError}
          variant="banner"
          showCode
        />
      ) : null}
      {types.map((type) => {
        const blueprint = transitionsByType.get(type.id)
        const transitions = blueprint?.transitions ?? []
        return (
          <section key={type.id} aria-label={`${type.name} workflow`}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[0.9375rem] font-semibold">{type.name}</h2>
              <span className="text-muted-foreground font-mono text-xs">
                {type.key} · {transitions.length}{' '}
                {transitions.length === 1 ? 'transition' : 'transitions'}
              </span>
            </div>
            <WorkflowTransitionsTable
              transitions={transitions}
              stateNames={stateNames}
            />
          </section>
        )
      })}
    </div>
  )
}

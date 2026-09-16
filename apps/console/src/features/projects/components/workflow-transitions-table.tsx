import { Badge } from '@876/ui/badge'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { WrenchScrewdriverIcon } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import {
  avatarTone,
  MobileList,
  MobileListCell,
  MobileListEmpty,
} from '@876/projects-ui/mobile-list'
import type { WorkflowTransition } from '@876/projects'

const EMPTY_TITLE = 'No transitions yet'
const EMPTY_HINT =
  'All state changes stay allowed until the first transition is added.'

export function resolveTransitionFrom(
  fromStateKey: string | null,
  stateNames: ReadonlyMap<string, string>
): string {
  if (fromStateKey === null) return 'Any'
  return stateNames.get(fromStateKey) ?? fromStateKey
}

export function resolveTransitionTo(
  toStateKey: string,
  stateNames: ReadonlyMap<string, string>
): string {
  return stateNames.get(toStateKey) ?? toStateKey
}

/**
 * Console-local read-only rendering of a workflow blueprint.
 *
 * `@876/projects-ui/automation/blueprint-editor` is an editing surface with
 * no read-only mode, so the operator view renders the same transitions as a
 * plain table instead: from/to states, the transition name, the required
 * permission, required fields, and whether a comment is required. Secrets are
 * not part of a blueprint, so there is nothing to redact here.
 */
export function WorkflowTransitionsTable({
  transitions,
  stateNames,
}: {
  transitions: readonly WorkflowTransition[]
  stateNames: ReadonlyMap<string, string>
}) {
  return (
    <div className="space-y-3">
      <MobileList>
        {transitions.length === 0 ? (
          <MobileListEmpty>{EMPTY_TITLE}</MobileListEmpty>
        ) : (
          transitions.map((transition) => (
            <MobileListCell
              key={transition.id}
              avatar={transition.name.slice(0, 2).toUpperCase() || '→'}
              avatarClassName={avatarTone(transition.id)}
              title={
                transition.name ||
                `${resolveTransitionFrom(transition.fromStateKey, stateNames)} → ${resolveTransitionTo(transition.toStateKey, stateNames)}`
              }
              subtitle={`${resolveTransitionFrom(transition.fromStateKey, stateNames)} → ${resolveTransitionTo(transition.toStateKey, stateNames)}`}
              meta={
                transition.requiresComment ? 'Comment required' : undefined
              }
            />
          ))
        )}
      </MobileList>
      <div className="876-card hidden w-full overflow-hidden sm:block">
        <Table>
          <TableHeader className="876-header-row">
            <TableRow>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                From
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                To
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Transition
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Permission
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Required fields
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Comment
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transitions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <Empty className="py-14">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <WrenchScrewdriverIcon className="size-6" />
                      </EmptyMedia>
                      <EmptyTitle>{EMPTY_TITLE}</EmptyTitle>
                    </EmptyHeader>
                    <p className="text-muted-foreground text-sm">{EMPTY_HINT}</p>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              transitions.map((transition) => (
                <TableRow key={transition.id} className="transition-colors">
                  <TableCell className="text-muted-foreground px-5 py-4 text-xs">
                    {resolveTransitionFrom(
                      transition.fromStateKey,
                      stateNames
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-xs font-medium">
                    {resolveTransitionTo(transition.toStateKey, stateNames)}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-[0.8125rem]">
                    {transition.name || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4 font-mono text-xs">
                    {transition.requiredPermission ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground px-5 py-4 font-mono text-xs">
                    {transition.requiredFieldKeys.length === 0
                      ? '—'
                      : transition.requiredFieldKeys.join(', ')}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    {transition.requiresComment ? (
                      <Badge variant="info">Required</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

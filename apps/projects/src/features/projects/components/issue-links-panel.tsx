'use client'

import type {
  IssueDependencyType,
  IssueRelationType,
} from '@876/projects/contracts'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { NativeSelect } from '@876/ui/native-select'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { issuesClient } from '@/lib/client'
import { issueLinksClient } from '@/lib/client/issue-links'

/** A work item a link can point at, resolved to what a row has to show. */
export type WorkItemOption = {
  id: string
  identifier: string
  title: string
}

/** A relationship as seen from one end: `incoming` is the "blocked by" side. */
export type RelationLink = {
  id: string
  type: IssueRelationType
  direction: 'outgoing' | 'incoming'
  item: WorkItemOption
}

export type DependencyLink = {
  id: string
  role: 'predecessor' | 'successor'
  type: IssueDependencyType
  lagMinutes: number
  item: WorkItemOption
}

type ScheduleSuggestionView = {
  earliestStart: number | null
  earliestFinish: number | null
  constrainedBy: readonly { identifier: string }[]
}

type Props = {
  issueRef: string
  issueId: string
  relations: readonly RelationLink[]
  dependencies: readonly DependencyLink[]
  candidates: readonly WorkItemOption[]
  plannedStartDate: number | null
  plannedFinishDate: number | null
  plannedDurationMinutes: number | null
}

const RELATION_TYPE_OPTIONS: readonly IssueRelationType[] = [
  'relates-to',
  'duplicates',
  'blocks',
]
const DEPENDENCY_TYPE_OPTIONS: readonly IssueDependencyType[] = [
  'finish-to-start',
  'start-to-start',
  'finish-to-finish',
  'start-to-finish',
]
const PICKER_LIMIT = 50

function relationLabel(link: RelationLink): string {
  if (link.type === 'blocks')
    return link.direction === 'incoming' ? 'blocked by' : 'blocks'
  return link.type === 'duplicates' ? 'duplicates' : 'relates to'
}

function dependencyTypeLabel(type: IssueDependencyType): string {
  return type.replaceAll('-', ' ')
}

function lagLabel(lagMinutes: number): string {
  if (lagMinutes === 0) return 'no lag'
  const magnitude = Math.abs(lagMinutes)
  const amount = `${magnitude} ${magnitude === 1 ? 'minute' : 'minutes'}`
  return lagMinutes < 0 ? `${amount} lead` : `${amount} lag`
}

function dateInputValue(timestamp: number | null): string {
  if (timestamp === null) return ''
  return new Date(timestamp * 1000).toISOString().slice(0, 10)
}

function dateTimestamp(value: string): number | null {
  if (!value) return null
  const parsed = Date.parse(`${value}T00:00:00Z`)
  return Number.isNaN(parsed) ? null : Math.floor(parsed / 1000)
}

function filterWorkItems(
  items: readonly WorkItemOption[],
  query: string
): WorkItemOption[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return items.slice(0, PICKER_LIMIT)
  return items
    .filter(
      (item) =>
        item.identifier.toLowerCase().includes(needle) ||
        item.title.toLowerCase().includes(needle)
    )
    .slice(0, PICKER_LIMIT)
}

/**
 * Relationships and dependencies for one work item.
 *
 * Links are created and removed immediately because a link is a record of its
 * own, not a field of the issue. The planned schedule is the exception: the
 * suggestion is advisory, so it only fills the inputs and the user saves them
 * through the ordinary issue update.
 */
export function IssueLinksPanel({
  issueRef,
  issueId,
  relations,
  dependencies,
  candidates,
  plannedStartDate,
  plannedFinishDate,
  plannedDurationMinutes,
}: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)
  const [suggestion, setSuggestion] = useState<ScheduleSuggestionView | null>(
    null
  )
  const [relationType, setRelationType] =
    useState<IssueRelationType>('relates-to')
  const [relationQuery, setRelationQuery] = useState('')
  const [relationTargetId, setRelationTargetId] = useState('')
  const [dependencyRole, setDependencyRole] = useState<
    'predecessor' | 'successor'
  >('predecessor')
  const [dependencyQuery, setDependencyQuery] = useState('')
  const [dependencyTargetId, setDependencyTargetId] = useState('')
  const [dependencyType, setDependencyType] =
    useState<IssueDependencyType>('finish-to-start')
  const [dependencyLag, setDependencyLag] = useState('0')
  const [plannedStart, setPlannedStart] = useState(
    dateInputValue(plannedStartDate)
  )
  const [plannedFinish, setPlannedFinish] = useState(
    dateInputValue(plannedFinishDate)
  )
  const [plannedDuration, setPlannedDuration] = useState(
    plannedDurationMinutes === null ? '' : String(plannedDurationMinutes)
  )

  const relationOptions = useMemo(
    () => filterWorkItems(candidates, relationQuery),
    [candidates, relationQuery]
  )
  const dependencyOptions = useMemo(
    () => filterWorkItems(candidates, dependencyQuery),
    [candidates, dependencyQuery]
  )
  const predecessors = dependencies.filter(
    (link) => link.role === 'predecessor'
  )
  const successors = dependencies.filter((link) => link.role === 'successor')

  async function addRelation() {
    if (!relationTargetId || pending) return
    setPending(true)
    setError(null)
    const result = await issueLinksClient.relations.create(issueRef, {
      targetIssueId: relationTargetId,
      type: relationType,
    })
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setRelationTargetId('')
    setRelationQuery('')
    router.refresh()
  }

  async function removeRelation(relationId: string) {
    if (pending) return
    setPending(true)
    setError(null)
    const result = await issueLinksClient.relations.delete(issueRef, relationId)
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  async function addDependency() {
    if (!dependencyTargetId || pending) return
    setPending(true)
    setError(null)
    const result = await issueLinksClient.dependencies.create(issueRef, {
      predecessorIssueId:
        dependencyRole === 'predecessor' ? dependencyTargetId : issueId,
      successorIssueId:
        dependencyRole === 'predecessor' ? issueId : dependencyTargetId,
      type: dependencyType,
      lagMinutes: Number(dependencyLag) || 0,
    })
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setDependencyTargetId('')
    setDependencyQuery('')
    router.refresh()
  }

  async function removeDependency(dependencyId: string) {
    if (pending) return
    setPending(true)
    setError(null)
    const result = await issueLinksClient.dependencies.delete(
      issueRef,
      dependencyId
    )
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  async function updateDependency(
    dependencyId: string,
    input: { type: IssueDependencyType; lagMinutes: number }
  ) {
    if (pending) return
    setPending(true)
    setError(null)
    const result = await issueLinksClient.dependencies.update(
      issueRef,
      dependencyId,
      input
    )
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  async function suggestFromDependencies() {
    if (pending) return
    setPending(true)
    setError(null)
    const result = await issueLinksClient.dependencies.suggestSchedule(issueRef)
    setPending(false)
    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/schedule-suggestion-unavailable',
          message: 'A schedule suggestion is not available yet.',
        }
      )
      return
    }
    setSuggestion(result.data)
    if (result.data.earliestStart !== null)
      setPlannedStart(dateInputValue(result.data.earliestStart))
    if (result.data.earliestFinish !== null)
      setPlannedFinish(dateInputValue(result.data.earliestFinish))
  }

  async function savePlannedSchedule() {
    if (pending) return
    setPending(true)
    setError(null)
    const result = await issuesClient.update(issueRef, {
      plannedStartDate: dateTimestamp(plannedStart),
      plannedFinishDate: dateTimestamp(plannedFinish),
      plannedDurationMinutes:
        plannedDuration === '' ? null : Number(plannedDuration),
    })
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {error ? (
        <AppError
          title="Work item links not saved"
          error={error}
          variant="banner"
        />
      ) : null}

      <section className="876-card space-y-4 p-5 sm:p-6">
        <h2 className="text-base font-semibold">Relationships</h2>
        {relations.length === 0 ? (
          <p className="text-muted-foreground text-sm">No relationships yet.</p>
        ) : (
          <ul aria-label="Relationships" className="space-y-2">
            {relations.map((link) => (
              <li
                key={link.id}
                className="flex flex-wrap items-center justify-between gap-3 text-sm"
              >
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">
                    {relationLabel(link)}
                  </span>
                  <Link
                    href={`/issues/${encodeURIComponent(link.item.identifier)}`}
                    className="text-info font-medium hover:underline"
                  >
                    {link.item.identifier}
                  </Link>
                  <span className="text-muted-foreground truncate">
                    {link.item.title}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`Remove relationship ${link.item.identifier}`}
                  onClick={() => removeRelation(link.id)}
                  disabled={pending}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="border-border/60 space-y-3 border-t pt-4">
          <FormRow label="Relationship type" htmlFor="relationship-type">
            <NativeSelect
              id="relationship-type"
              value={relationType}
              onChange={(event) =>
                setRelationType(event.target.value as IssueRelationType)
              }
              className="w-full"
            >
              {RELATION_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </NativeSelect>
          </FormRow>
          <FormRow label="Search work items" htmlFor="relationship-search">
            <Input
              id="relationship-search"
              value={relationQuery}
              onChange={(event) => setRelationQuery(event.target.value)}
              placeholder="Identifier or title"
            />
          </FormRow>
          <FormRow label="Related work item" htmlFor="relationship-target">
            <NativeSelect
              id="relationship-target"
              value={relationTargetId}
              onChange={(event) => setRelationTargetId(event.target.value)}
              className="w-full"
            >
              <option value="">Select a work item</option>
              {relationOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.identifier} · {item.title}
                </option>
              ))}
            </NativeSelect>
          </FormRow>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="info"
              onClick={addRelation}
              disabled={!relationTargetId || pending}
            >
              Add relationship
            </Button>
          </div>
        </div>
      </section>

      <section className="876-card space-y-4 p-5 sm:p-6">
        <h2 className="text-base font-semibold">Dependencies</h2>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Predecessors</h3>
          {predecessors.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nothing has to finish before this work item.
            </p>
          ) : (
            <ul aria-label="Predecessors" className="space-y-2">
              {predecessors.map((link) => (
                <DependencyRow
                  key={`${link.id}:${link.type}:${link.lagMinutes}`}
                  link={link}
                  pending={pending}
                  onSave={updateDependency}
                  onRemove={removeDependency}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Successors</h3>
          {successors.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nothing waits on this work item.
            </p>
          ) : (
            <ul aria-label="Successors" className="space-y-2">
              {successors.map((link) => (
                <DependencyRow
                  key={`${link.id}:${link.type}:${link.lagMinutes}`}
                  link={link}
                  pending={pending}
                  onSave={updateDependency}
                  onRemove={removeDependency}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="border-border/60 space-y-3 border-t pt-4">
          <FormRow label="Dependency role" htmlFor="dependency-role">
            <NativeSelect
              id="dependency-role"
              value={dependencyRole}
              onChange={(event) =>
                setDependencyRole(
                  event.target.value === 'successor'
                    ? 'successor'
                    : 'predecessor'
                )
              }
              className="w-full"
            >
              <option value="predecessor">Predecessor of this work item</option>
              <option value="successor">Successor of this work item</option>
            </NativeSelect>
          </FormRow>
          <FormRow label="Search dependencies" htmlFor="dependency-search">
            <Input
              id="dependency-search"
              value={dependencyQuery}
              onChange={(event) => setDependencyQuery(event.target.value)}
              placeholder="Identifier or title"
            />
          </FormRow>
          <FormRow label="Dependency work item" htmlFor="dependency-target">
            <NativeSelect
              id="dependency-target"
              value={dependencyTargetId}
              onChange={(event) => setDependencyTargetId(event.target.value)}
              className="w-full"
            >
              <option value="">Select a work item</option>
              {dependencyOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.identifier} · {item.title}
                </option>
              ))}
            </NativeSelect>
          </FormRow>
          <FormRow label="Dependency type" htmlFor="dependency-type">
            <NativeSelect
              id="dependency-type"
              value={dependencyType}
              onChange={(event) =>
                setDependencyType(event.target.value as IssueDependencyType)
              }
              className="w-full"
            >
              {DEPENDENCY_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {dependencyTypeLabel(type)}
                </option>
              ))}
            </NativeSelect>
          </FormRow>
          <FormRow label="Lag minutes" htmlFor="dependency-lag">
            <Input
              id="dependency-lag"
              type="number"
              step={1}
              value={dependencyLag}
              onChange={(event) => setDependencyLag(event.target.value)}
            />
          </FormRow>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="info"
              onClick={addDependency}
              disabled={!dependencyTargetId || pending}
            >
              Add dependency
            </Button>
          </div>
        </div>

        <div className="border-border/60 space-y-3 border-t pt-4">
          <h3 className="text-sm font-medium">Planned schedule</h3>
          <FormRow label="Planned start" htmlFor="planned-start">
            <Input
              id="planned-start"
              type="date"
              value={plannedStart}
              onChange={(event) => setPlannedStart(event.target.value)}
            />
          </FormRow>
          <FormRow label="Planned finish" htmlFor="planned-finish">
            <Input
              id="planned-finish"
              type="date"
              value={plannedFinish}
              onChange={(event) => setPlannedFinish(event.target.value)}
            />
          </FormRow>
          <FormRow
            label="Planned duration (minutes)"
            htmlFor="planned-duration"
          >
            <Input
              id="planned-duration"
              type="number"
              min={0}
              step={1}
              value={plannedDuration}
              onChange={(event) => setPlannedDuration(event.target.value)}
            />
          </FormRow>
          {suggestion ? (
            <p className="text-muted-foreground text-sm">
              Earliest start {dateInputValue(suggestion.earliestStart) || '—'},
              earliest finish {dateInputValue(suggestion.earliestFinish) || '—'}
              {suggestion.constrainedBy.length > 0
                ? ` · constrained by ${suggestion.constrainedBy
                    .map((constraint) => constraint.identifier)
                    .join(', ')}`
                : ''}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={suggestFromDependencies}
              disabled={pending}
            >
              Suggest from dependencies
            </Button>
            <Button
              type="button"
              variant="info"
              onClick={savePlannedSchedule}
              disabled={pending}
            >
              Save planned schedule
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

function DependencyRow({
  link,
  pending,
  onSave,
  onRemove,
}: {
  link: DependencyLink
  pending: boolean
  onSave: (
    dependencyId: string,
    input: { type: IssueDependencyType; lagMinutes: number }
  ) => void
  onRemove: (dependencyId: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [type, setType] = useState<IssueDependencyType>(link.type)
  const [lag, setLag] = useState(String(link.lagMinutes))

  return (
    <li className="space-y-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <Link
            href={`/issues/${encodeURIComponent(link.item.identifier)}`}
            className="text-info font-medium hover:underline"
          >
            {link.item.identifier}
          </Link>
          <span className="text-muted-foreground truncate">
            {link.item.title}
          </span>
          <span className="text-muted-foreground text-xs">
            {`${dependencyTypeLabel(link.type)} · ${lagLabel(link.lagMinutes)}`}
          </span>
        </span>
        <span className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Edit dependency ${link.item.identifier}`}
            onClick={() => setEditing(true)}
            disabled={pending}
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Remove dependency ${link.item.identifier}`}
            onClick={() => onRemove(link.id)}
            disabled={pending}
          >
            Remove
          </Button>
        </span>
      </div>
      {editing ? (
        <div className="border-border/60 space-y-3 border-l-2 pl-3">
          <FormRow
            label={`${link.item.identifier} type`}
            htmlFor={`dependency-type-${link.id}`}
          >
            <NativeSelect
              id={`dependency-type-${link.id}`}
              value={type}
              onChange={(event) =>
                setType(event.target.value as IssueDependencyType)
              }
              className="w-full"
            >
              {DEPENDENCY_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {dependencyTypeLabel(option)}
                </option>
              ))}
            </NativeSelect>
          </FormRow>
          <FormRow
            label={`${link.item.identifier} lag minutes`}
            htmlFor={`dependency-lag-${link.id}`}
          >
            <Input
              id={`dependency-lag-${link.id}`}
              type="number"
              step={1}
              value={lag}
              onChange={(event) => setLag(event.target.value)}
            />
          </FormRow>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setType(link.type)
                setLag(String(link.lagMinutes))
                setEditing(false)
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="info"
              size="sm"
              aria-label={`Save dependency ${link.item.identifier}`}
              onClick={() => {
                onSave(link.id, { type, lagMinutes: Number(lag) || 0 })
                setEditing(false)
              }}
              disabled={pending}
            >
              Save
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  )
}

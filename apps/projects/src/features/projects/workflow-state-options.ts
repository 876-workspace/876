import 'server-only'

import type { ClientError, WorkflowState } from '@876/projects/contracts'
import { cache } from 'react'

import { projects } from '@/lib/clients/projects'

export type WorkflowStateOptionsResult = {
  states: WorkflowState[]
  error: ClientError | null
}

/**
 * Request-memoized workflow-state fetch for the Issues/Board filter chrome.
 * `React.cache` compares arguments with `Object.is`, so this must take the
 * primitive `orgId` — never an object literal. The Issues/Board pages and
 * their data components all call this with the same `orgId` and share one
 * round trip per request.
 */
export const loadWorkflowStateOptions = cache(
  async (orgId: string): Promise<WorkflowStateOptionsResult> => {
    const result = await projects.workflowStates.list(orgId)
    return {
      states: result.data?.data ?? [],
      error: result.error ?? null,
    }
  }
)

export type IssueStatusOption = { value: string; label: string }

/** Heading options for `StatusFilterHeading`: `all` first, then one per state. */
export function buildIssueStatusOptions(
  states: readonly Pick<WorkflowState, 'key' | 'name'>[]
): IssueStatusOption[] {
  return [
    { value: 'all', label: 'All states' },
    ...states.map((state) => ({ value: state.key, label: state.name })),
  ]
}

export type ResolvedIssueStatus = {
  /** Value for `StatusFilterHeading` — always a known option. */
  headingValue: string
  /** Status to send to the issues query — `undefined` means unfiltered. */
  queryStatus: string | undefined
}

/**
 * Resolves the raw `status` URL value against the org's workflow states.
 * Unknown values (including a state key that no longer exists) fall back to
 * `all`, which produces no status filter in the client query.
 */
export function resolveIssueStatus(
  rawStatus: string | undefined,
  states: readonly Pick<WorkflowState, 'key'>[]
): ResolvedIssueStatus {
  const known = rawStatus
    ? states.some((state) => state.key === rawStatus)
    : false
  const headingValue = known && rawStatus ? rawStatus : 'all'
  return {
    headingValue,
    queryStatus: headingValue === 'all' ? undefined : headingValue,
  }
}

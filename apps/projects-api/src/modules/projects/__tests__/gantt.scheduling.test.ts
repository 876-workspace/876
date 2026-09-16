import { describe, expect, it } from 'vitest'

import {
  computeCriticalPath,
  type SchedulingEdgeInput,
  type SchedulingIssueInput,
} from '../gantt.scheduling.js'

const MIN = 60

function issue(
  id: string,
  start: number | null,
  finish: number | null,
  durationMinutes: number | null = null
): SchedulingIssueInput {
  return {
    id,
    plannedStart: start,
    plannedFinish: finish,
    plannedDurationMinutes: durationMinutes,
  }
}

function edge(
  id: string,
  pred: string,
  succ: string,
  type: SchedulingEdgeInput['type'] = 'finish-to-start',
  lagMinutes = 0
): SchedulingEdgeInput {
  return {
    id,
    predecessorIssueId: pred,
    successorIssueId: succ,
    type,
    lagMinutes,
  }
}

describe('gantt scheduling', () => {
  it('returns empty result for an empty project', () => {
    const result = computeCriticalPath([], [])
    expect(result.criticalIssueIds).toEqual([])
    expect(result.timings.size).toBe(0)
  })

  it('marks a single schedulable issue as critical', () => {
    const result = computeCriticalPath([issue('a', 1000, 2000)], [])
    expect(result.criticalIssueIds).toEqual(['a'])
    expect(result.timings.get('a')?.isCritical).toBe(true)
    expect(result.timings.get('a')?.totalFloatSeconds).toBe(0)
  })

  it('marks a linear finish-to-start chain as fully critical', () => {
    const issues = [
      issue('a', 0, 1000),
      issue('b', 1000, 2000),
      issue('c', 2000, 3000),
    ]
    const edges = [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')]
    const result = computeCriticalPath(issues, edges)
    expect(result.criticalIssueIds).toEqual(['a', 'b', 'c'])
  })

  it('leaves a shorter parallel branch off the critical path', () => {
    const issues = [
      issue('a', 0, 3600),
      issue('b', 3600, 7200),
      issue('c', 3600, 4200),
    ]
    const edges = [edge('e1', 'a', 'b'), edge('e2', 'a', 'c')]
    const result = computeCriticalPath(issues, edges)
    expect(result.criticalIssueIds).toContain('a')
    expect(result.criticalIssueIds).toContain('b')
    expect(result.criticalIssueIds).not.toContain('c')
    const floatC = result.timings.get('c')?.totalFloatSeconds ?? 0
    expect(floatC).toBeGreaterThan(0)
  })

  it('shifts the critical path when lag makes a branch longer', () => {
    const base = [
      issue('a', 0, 3600),
      issue('b', 3600, 7200),
      issue('c', 3600, 4200),
    ]
    const noLag = computeCriticalPath(base, [
      edge('e1', 'a', 'b'),
      edge('e2', 'a', 'c'),
    ])
    expect(noLag.criticalIssueIds).not.toContain('c')
    const withLag = computeCriticalPath(base, [
      edge('e1', 'a', 'b'),
      edge('e2', 'a', 'c', 'finish-to-start', 120),
    ])
    expect(withLag.criticalIssueIds).toContain('c')
    expect(withLag.criticalIssueIds).not.toContain('b')
  })

  it('honours finish-to-start by pushing the successor start past predecessor finish', () => {
    const result = computeCriticalPath(
      [issue('a', 0, 1000), issue('b', 0, 1000)],
      [edge('e1', 'a', 'b', 'finish-to-start')]
    )
    expect(result.timings.get('b')?.earliestStart).toBe(1000)
    expect(result.timings.get('b')?.earliestFinish).toBe(2000)
  })

  it('honours start-to-start by aligning successor start with predecessor start', () => {
    const result = computeCriticalPath(
      [issue('a', 500, 1500), issue('b', 0, 1000)],
      [edge('e1', 'a', 'b', 'start-to-start')]
    )
    expect(result.timings.get('b')?.earliestStart).toBe(500)
  })

  it('honours finish-to-finish by pushing successor finish past predecessor finish', () => {
    const result = computeCriticalPath(
      [issue('a', 0, 2000), issue('b', 0, 1000)],
      [edge('e1', 'a', 'b', 'finish-to-finish')]
    )
    expect(result.timings.get('b')?.earliestFinish).toBe(2000)
    expect(result.timings.get('b')?.earliestStart).toBe(1000)
  })

  it('honours start-to-finish by pushing successor finish past predecessor start', () => {
    const result = computeCriticalPath(
      [issue('a', 800, 1800), issue('b', 0, 500)],
      [edge('e1', 'a', 'b', 'start-to-finish')]
    )
    expect(result.timings.get('b')?.earliestFinish).toBe(800)
  })

  it('applies lag on finish-to-start edges', () => {
    const result = computeCriticalPath(
      [issue('a', 0, 1000), issue('b', 0, 500)],
      [edge('e1', 'a', 'b', 'finish-to-start', 60)]
    )
    expect(result.timings.get('b')?.earliestStart).toBe(1000 + 60 * MIN)
  })

  it('applies negative lag as lead time', () => {
    const result = computeCriticalPath(
      [issue('a', 0, 1000), issue('b', 0, 500)],
      [edge('e1', 'a', 'b', 'finish-to-start', -10)]
    )
    expect(result.timings.get('b')?.earliestStart).toBe(1000 - 10 * MIN)
  })

  it('excludes work items with no planned dates', () => {
    const result = computeCriticalPath(
      [issue('a', 0, 1000), issue('b', null, null)],
      [edge('e1', 'a', 'b')]
    )
    expect(result.timings.has('b')).toBe(false)
    expect(result.criticalIssueIds).not.toContain('b')
    expect(result.criticalIssueIds).toContain('a')
  })

  it('excludes duration-only items without an anchor date', () => {
    const result = computeCriticalPath(
      [issue('a', 0, 1000), issue('b', null, null, 60)],
      []
    )
    expect(result.timings.has('b')).toBe(false)
  })

  it('ignores edges that reference unknown issues', () => {
    const result = computeCriticalPath(
      [issue('a', 0, 1000)],
      [edge('e1', 'a', 'ghost'), edge('e2', 'ghost', 'a')]
    )
    expect(result.criticalIssueIds).toEqual(['a'])
  })

  it('derives duration from plannedDurationMinutes when only a start is present', () => {
    const result = computeCriticalPath([issue('a', 1000, null, 60)], [])
    expect(result.timings.get('a')?.earliestStart).toBe(1000)
    expect(result.timings.get('a')?.earliestFinish).toBe(1000 + 60 * MIN)
  })

  it('derives start from finish minus duration when only a finish is present', () => {
    const result = computeCriticalPath([issue('a', null, 4600, 60)], [])
    expect(result.timings.get('a')?.earliestFinish).toBe(4600)
    expect(result.timings.get('a')?.earliestStart).toBe(4600 - 60 * MIN)
  })

  it('computes zero float for the longest diamond path and slack for the shorter side', () => {
    const issues = [
      issue('a', 0, 1000),
      issue('b', 1000, 3000),
      issue('c', 1000, 1500),
      issue('d', 3000, 4000),
    ]
    const edges = [
      edge('e1', 'a', 'b'),
      edge('e2', 'a', 'c'),
      edge('e3', 'b', 'd'),
      edge('e4', 'c', 'd'),
    ]
    const result = computeCriticalPath(issues, edges)
    expect(result.criticalIssueIds).toEqual(['a', 'b', 'd'])
    expect(result.timings.get('c')?.totalFloatSeconds).toBeGreaterThan(0)
  })

  it('keeps independent issues critical when they share the longest finish', () => {
    const result = computeCriticalPath(
      [issue('a', 0, 1000), issue('b', 0, 1000)],
      []
    )
    expect(result.criticalIssueIds).toEqual(['a', 'b'])
  })

  it('gives slack to a shorter independent issue', () => {
    const result = computeCriticalPath(
      [issue('a', 0, 2000), issue('b', 0, 500)],
      []
    )
    expect(result.criticalIssueIds).toEqual(['a'])
    expect(result.timings.get('b')?.totalFloatSeconds).toBe(1500)
  })

  it('does not mutate the input arrays', () => {
    const issues = [issue('a', 0, 1000), issue('b', 0, 1000)]
    const edges = [edge('e1', 'a', 'b')]
    const snapshot = JSON.stringify({ issues, edges })
    computeCriticalPath(issues, edges)
    expect(JSON.stringify({ issues, edges })).toBe(snapshot)
  })

  it('handles dependency cycles without hanging', () => {
    const issues = [issue('a', 0, 1000), issue('b', 1000, 2000)]
    const edges = [edge('e1', 'a', 'b'), edge('e2', 'b', 'a')]
    const result = computeCriticalPath(issues, edges)
    expect(result.timings.size).toBe(2)
    expect(Array.isArray(result.criticalIssueIds)).toBe(true)
  })

  it('treats unknown edge types as finish-to-start', () => {
    const result = computeCriticalPath(
      [issue('a', 0, 1000), issue('b', 0, 500)],
      [edge('e1', 'a', 'b', 'blocks')]
    )
    expect(result.timings.get('b')?.earliestStart).toBe(1000)
  })
})

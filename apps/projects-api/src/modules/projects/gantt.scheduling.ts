export type SchedulingIssueInput = {
  id: string
  plannedStart: number | null
  plannedFinish: number | null
  plannedDurationMinutes: number | null
}

export type SchedulingEdgeInput = {
  id: string
  predecessorIssueId: string
  successorIssueId: string
  type: string
  lagMinutes: number
}

export type SchedulingNodeTiming = {
  earliestStart: number
  earliestFinish: number
  latestStart: number
  latestFinish: number
  totalFloatSeconds: number
  isCritical: boolean
}

export type SchedulingResult = {
  timings: Map<string, SchedulingNodeTiming>
  criticalIssueIds: string[]
}

const SECONDS_PER_MINUTE = 60

function durationSecondsFor(issue: SchedulingIssueInput): number {
  if (
    issue.plannedDurationMinutes !== null &&
    issue.plannedDurationMinutes !== undefined
  ) {
    return issue.plannedDurationMinutes > 0
      ? issue.plannedDurationMinutes * SECONDS_PER_MINUTE
      : 0
  }
  if (issue.plannedStart !== null && issue.plannedFinish !== null) {
    const span = issue.plannedFinish - issue.plannedStart
    return span > 0 ? span : 0
  }
  return 0
}

function isSchedulable(issue: SchedulingIssueInput): boolean {
  return issue.plannedStart !== null || issue.plannedFinish !== null
}

function lagSeconds(edge: SchedulingEdgeInput): number {
  return (edge.lagMinutes ?? 0) * SECONDS_PER_MINUTE
}

function requiredStartFor(
  edgeType: string,
  predStart: number,
  predFinish: number,
  durationSucc: number,
  lag: number
): number {
  if (edgeType === 'start-to-start') return predStart + lag
  if (edgeType === 'finish-to-finish') return predFinish + lag - durationSucc
  if (edgeType === 'start-to-finish') return predStart + lag - durationSucc
  return predFinish + lag
}

function latestFinishFor(
  edgeType: string,
  succLateStart: number,
  succLateFinish: number,
  durationPred: number,
  lag: number
): number {
  if (edgeType === 'start-to-start') return succLateStart - lag + durationPred
  if (edgeType === 'finish-to-finish') return succLateFinish - lag
  if (edgeType === 'start-to-finish') return succLateFinish - lag + durationPred
  return succLateStart - lag
}

export function computeCriticalPath(
  issues: SchedulingIssueInput[],
  edges: SchedulingEdgeInput[]
): SchedulingResult {
  const schedulable = issues.filter(isSchedulable)
  const timings = new Map<string, SchedulingNodeTiming>()
  if (schedulable.length === 0) {
    return { timings, criticalIssueIds: [] }
  }

  const byId = new Map<string, SchedulingIssueInput>()
  for (const issue of schedulable) byId.set(issue.id, issue)

  const durations = new Map<string, number>()
  const earliestStart = new Map<string, number>()
  const earliestFinish = new Map<string, number>()
  for (const issue of schedulable) {
    const duration = durationSecondsFor(issue)
    durations.set(issue.id, duration)
    if (issue.plannedStart !== null) {
      earliestStart.set(issue.id, issue.plannedStart)
      earliestFinish.set(issue.id, issue.plannedStart + duration)
    } else {
      const finish = issue.plannedFinish as number
      earliestFinish.set(issue.id, finish)
      earliestStart.set(issue.id, finish - duration)
    }
  }

  const relevantEdges = edges.filter(
    (edge) =>
      byId.has(edge.predecessorIssueId) && byId.has(edge.successorIssueId)
  )

  const successorsById = new Map<string, SchedulingEdgeInput[]>()
  const predecessorsById = new Map<string, SchedulingEdgeInput[]>()
  const inDegree = new Map<string, number>()
  for (const issue of schedulable) {
    successorsById.set(issue.id, [])
    predecessorsById.set(issue.id, [])
    inDegree.set(issue.id, 0)
  }
  for (const edge of relevantEdges) {
    successorsById.get(edge.predecessorIssueId)?.push(edge)
    predecessorsById.get(edge.successorIssueId)?.push(edge)
    inDegree.set(
      edge.successorIssueId,
      (inDegree.get(edge.successorIssueId) ?? 0) + 1
    )
  }

  const queue: string[] = []
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id)
  }
  const topoOrder: string[] = []
  const remaining = new Map(inDegree)
  while (queue.length > 0) {
    const current = queue.shift() as string
    topoOrder.push(current)
    for (const edge of successorsById.get(current) ?? []) {
      const next = edge.successorIssueId
      const nextDegree = (remaining.get(next) ?? 1) - 1
      remaining.set(next, nextDegree)
      if (nextDegree === 0) queue.push(next)
    }
  }
  const inTopo = new Set(topoOrder)

  for (const id of topoOrder) {
    const preds = predecessorsById.get(id) ?? []
    if (preds.length === 0) continue
    const duration = durations.get(id) ?? 0
    let required = earliestStart.get(id) ?? 0
    let hasConstraint = false
    for (const edge of preds) {
      if (!inTopo.has(edge.predecessorIssueId)) continue
      const predStart = earliestStart.get(edge.predecessorIssueId)
      const predFinish = earliestFinish.get(edge.predecessorIssueId)
      if (predStart === undefined || predFinish === undefined) continue
      const candidate = requiredStartFor(
        edge.type,
        predStart,
        predFinish,
        duration,
        lagSeconds(edge)
      )
      if (!hasConstraint || candidate > required) {
        required = candidate
        hasConstraint = true
      }
    }
    if (hasConstraint) {
      earliestStart.set(id, required)
      earliestFinish.set(id, required + duration)
    }
  }

  let projectEnd = Number.NEGATIVE_INFINITY
  for (const finish of earliestFinish.values()) {
    if (finish > projectEnd) projectEnd = finish
  }

  const latestFinish = new Map<string, number>()
  const latestStart = new Map<string, number>()
  for (const issue of schedulable) {
    if (inTopo.has(issue.id)) {
      const succs = successorsById.get(issue.id) ?? []
      if (succs.length === 0) {
        latestFinish.set(issue.id, projectEnd)
      } else {
        latestFinish.set(issue.id, earliestFinish.get(issue.id) ?? projectEnd)
      }
    } else {
      latestFinish.set(issue.id, earliestFinish.get(issue.id) ?? projectEnd)
    }
    latestStart.set(
      issue.id,
      (latestFinish.get(issue.id) ?? projectEnd) -
        (durations.get(issue.id) ?? 0)
    )
  }

  for (let index = topoOrder.length - 1; index >= 0; index -= 1) {
    const id = topoOrder[index]
    const succs = successorsById.get(id) ?? []
    if (succs.length === 0) {
      latestFinish.set(id, projectEnd)
      latestStart.set(id, projectEnd - (durations.get(id) ?? 0))
      continue
    }
    let constrained: number | null = null
    for (const edge of succs) {
      if (!inTopo.has(edge.successorIssueId)) continue
      const succLateStart = latestStart.get(edge.successorIssueId)
      const succLateFinish = latestFinish.get(edge.successorIssueId)
      if (succLateStart === undefined || succLateFinish === undefined) continue
      const candidate = latestFinishFor(
        edge.type,
        succLateStart,
        succLateFinish,
        durations.get(id) ?? 0,
        lagSeconds(edge)
      )
      if (constrained === null || candidate < constrained) {
        constrained = candidate
      }
    }
    if (constrained !== null) {
      const earlyFinish = earliestFinish.get(id) ?? constrained
      const nextFinish = constrained < earlyFinish ? earlyFinish : constrained
      latestFinish.set(id, nextFinish)
      latestStart.set(id, nextFinish - (durations.get(id) ?? 0))
    } else {
      latestFinish.set(id, projectEnd)
      latestStart.set(id, projectEnd - (durations.get(id) ?? 0))
    }
  }

  const criticalIssueIds: string[] = []
  for (const issue of schedulable) {
    const earlyStart = earliestStart.get(issue.id) ?? 0
    const earlyFinish = earliestFinish.get(issue.id) ?? 0
    const lateFinish = latestFinish.get(issue.id) ?? earlyFinish
    const lateStart = latestStart.get(issue.id) ?? earlyStart
    const floatSeconds = lateFinish - earlyFinish
    const isCritical = floatSeconds === 0
    timings.set(issue.id, {
      earliestStart: earlyStart,
      earliestFinish: earlyFinish,
      latestStart: lateStart,
      latestFinish: lateFinish,
      totalFloatSeconds: floatSeconds,
      isCritical,
    })
    if (isCritical) criticalIssueIds.push(issue.id)
  }
  criticalIssueIds.sort()

  return { timings, criticalIssueIds }
}

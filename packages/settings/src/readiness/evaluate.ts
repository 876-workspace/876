import type { SetupReadiness, SetupRequirement, SetupSeverity } from '../types'

const SEVERITY_ORDER: Record<SetupSeverity, number> = {
  required: 0,
  recommended: 1,
  optional: 2,
}

export function evaluateSetup(
  requirements: readonly SetupRequirement[],
  satisfied: readonly string[]
): SetupReadiness {
  const satisfiedKeys = new Set(satisfied)
  const tasks = requirements
    .map((requirement, declarationOrder) => ({
      ...requirement,
      isSatisfied: satisfiedKeys.has(requirement.key),
      declarationOrder,
    }))
    .sort(
      (left, right) =>
        SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity] ||
        left.declarationOrder - right.declarationOrder
    )
    .map(({ declarationOrder: _declarationOrder, ...task }) => task)

  const outstandingRequired = tasks.filter(
    (task) => task.severity === 'required' && !task.isSatisfied
  ).length
  const outstandingRecommended = tasks.filter(
    (task) => task.severity === 'recommended' && !task.isSatisfied
  ).length

  return {
    tasks,
    outstandingRequired,
    outstandingRecommended,
    isReady: outstandingRequired === 0,
    isComplete: outstandingRequired === 0 && outstandingRecommended === 0,
  }
}

import type {
  WorkEventResource,
  WorkHostContext,
  WorkReminder,
  WorkTask,
} from '@876/work'

function legacyContextMatches(
  value: { service: string; resource: string; id: string } | null,
  context: WorkHostContext
) {
  return (
    value?.service === context.service &&
    value.resource === context.resource &&
    value.id === context.externalId
  )
}

export function workTaskMatchesContext(
  task: WorkTask,
  context: WorkHostContext
): boolean {
  if (legacyContextMatches(task.context, context)) return true
  return task.links.some(
    (link) =>
      link.service === context.service &&
      link.resource === context.resource &&
      link.externalId === context.externalId
  )
}

export function workEventMatchesContext(
  event: WorkEventResource,
  context: WorkHostContext
): boolean {
  return legacyContextMatches(event.context, context)
}

export function workReminderMatchesContext(
  reminder: WorkReminder,
  context: WorkHostContext
): boolean {
  return legacyContextMatches(reminder.context, context)
}

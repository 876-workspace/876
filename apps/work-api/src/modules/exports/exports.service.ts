import { isError, type Error as AppErrorValue } from '@876/core'
import type {
  CreateWorkCalendarExportInput,
  WorkCalendarExport,
  WorkEventResource,
  WorkTask,
} from '@876/work'

import * as alerts from '../alerts/index.js'
import * as events from '../events/index.js'
import * as recurrence from '../recurrence-rules/index.js'
import * as tasks from '../tasks/index.js'

function escapeText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}
function utc(value: number) {
  return new Date(value * 1000)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
}
function local(value: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value * 1000))
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}${get('month')}${get('day')}T${get('hour')}${get(
    'minute'
  )}${get('second')}`
}
const dateOnly = (value: string) => value.replaceAll('-', '')
function isoDuration(seconds: number) {
  if (seconds <= 0) return 'PT0S'
  const days = Math.floor(seconds / 86400)
  let rest = seconds % 86400
  const hours = Math.floor(rest / 3600)
  rest %= 3600
  const minutes = Math.floor(rest / 60)
  const secs = rest % 60
  return `P${days ? `${days}D` : ''}${
    hours || minutes || secs
      ? `T${hours ? `${hours}H` : ''}${minutes ? `${minutes}M` : ''}${
          secs ? `${secs}S` : ''
        }`
      : ''
  }`
}
async function ruleLine(organizationId: string, ruleId: string | null) {
  if (!ruleId) return null
  const result = await recurrence.retrieve(organizationId, ruleId)
  if (!result || isError(result)) return null
  return `RRULE:${result.rrule}`
}
async function alertLines(
  organizationId: string,
  parent: { taskId?: string; eventId?: string }
) {
  const result = await alerts.list(organizationId, { ...parent, limit: 100 })
  if (isError(result)) return []
  return result.data
    .filter((alert) => alert.status === 'SCHEDULED')
    .flatMap((alert) => {
      const trigger =
        alert.triggerType === 'ABSOLUTE' && alert.triggerAt !== null
          ? `TRIGGER;VALUE=DATE-TIME:${utc(alert.triggerAt)}`
          : alert.offsetSeconds !== null
            ? `TRIGGER:-PT${Math.abs(alert.offsetSeconds)}S`
            : null
      if (!trigger) return []
      return [
        'BEGIN:VALARM',
        `ACTION:${alert.action === 'EMAIL' ? 'EMAIL' : 'DISPLAY'}`,
        trigger,
        'DESCRIPTION:876 Work reminder',
        'END:VALARM',
      ]
    })
}
function taskStatus(task: WorkTask) {
  if (task.status === 'IN_PROGRESS') return 'IN-PROCESS'
  if (task.status === 'DONE') return 'COMPLETED'
  if (task.status === 'CANCELLED') return 'CANCELLED'
  return 'NEEDS-ACTION'
}
function priority(task: WorkTask) {
  if (task.importance === 'URGENT') return 1
  if (task.importance === 'HIGH') return 3
  if (task.importance === 'LOW') return 9
  return 5
}
async function taskIcs(organizationId: string, task: WorkTask) {
  const lines = [
    'BEGIN:VTODO',
    `UID:${task.uid}`,
    `DTSTAMP:${utc(task.updatedAt)}`,
    `SUMMARY:${escapeText(task.title)}`,
    `STATUS:${taskStatus(task)}`,
    `PRIORITY:${priority(task)}`,
    `PERCENT-COMPLETE:${task.percentComplete}`,
  ]
  if (task.description)
    lines.push(`DESCRIPTION:${escapeText(task.description)}`)
  if (task.startAt !== null && task.startTimeZone)
    lines.push(
      `DTSTART;TZID=${escapeText(task.startTimeZone)}:${local(
        task.startAt,
        task.startTimeZone
      )}`
    )
  if (task.dueAt !== null && task.dueTimeZone)
    lines.push(
      `DUE;TZID=${escapeText(task.dueTimeZone)}:${local(
        task.dueAt,
        task.dueTimeZone
      )}`
    )
  if (task.completedAt !== null)
    lines.push(`COMPLETED:${utc(task.completedAt)}`)
  if (['WAITING', 'DEFERRED', 'FAILED'].includes(task.status))
    lines.push(`X-876-STATUS:${task.status}`)
  for (const assignment of task.assignments) {
    const address = `urn:876:${assignment.targetType.toLowerCase()}:${encodeURIComponent(
      assignment.assigneeId
    )}`
    const partstat =
      assignment.status === 'ACCEPTED'
        ? 'ACCEPTED'
        : assignment.status === 'DECLINED'
          ? 'DECLINED'
          : assignment.status === 'COMPLETED'
            ? 'COMPLETED'
            : 'NEEDS-ACTION'
    const role =
      assignment.role === 'OWNER' ? 'REQ-PARTICIPANT' : 'OPT-PARTICIPANT'
    lines.push(
      `ATTENDEE;CUTYPE=${
        assignment.targetType === 'TEAM' ? 'GROUP' : 'INDIVIDUAL'
      };ROLE=${role};PARTSTAT=${partstat}:${address}`
    )
  }
  const rule = await ruleLine(organizationId, task.recurrenceRuleId)
  if (rule) lines.push(rule)
  lines.push(
    ...(await alertLines(organizationId, { taskId: task.id })),
    'END:VTODO'
  )
  return lines
}
async function eventIcs(organizationId: string, event: WorkEventResource) {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${utc(event.updatedAt)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `STATUS:${event.status}`,
    `TRANSP:${event.busyStatus === 'FREE' ? 'TRANSPARENT' : 'OPAQUE'}`,
  ]
  if (event.description)
    lines.push(`DESCRIPTION:${escapeText(event.description)}`)
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`)
  if (event.allDay && event.startDate && event.endDate) {
    lines.push(
      `DTSTART;VALUE=DATE:${dateOnly(event.startDate)}`,
      `DTEND;VALUE=DATE:${dateOnly(event.endDate)}`
    )
  } else if (event.startAt !== null && event.endAt !== null && event.timeZone) {
    lines.push(
      `DTSTART;TZID=${escapeText(event.timeZone)}:${local(
        event.startAt,
        event.timeZone
      )}`,
      `DTEND;TZID=${escapeText(event.timeZone)}:${local(
        event.endAt,
        event.timeZone
      )}`
    )
  }
  if (event.context)
    lines.push(
      `X-876-CONTEXT:${escapeText(
        `${event.context.service}/${event.context.resource}/${event.context.id}`
      )}`
    )
  for (const participant of event.participants) {
    const address =
      participant.kind === 'EMAIL'
        ? `mailto:${participant.email}`
        : `urn:876:user:${encodeURIComponent(participant.participantId ?? '')}`
    const role =
      participant.role === 'CHAIR'
        ? 'CHAIR'
        : participant.role === 'OPTIONAL'
          ? 'OPT-PARTICIPANT'
          : 'REQ-PARTICIPANT'
    lines.push(
      `ATTENDEE;ROLE=${role};PARTSTAT=${participant.status.replace(
        '_',
        '-'
      )}:${address}`
    )
  }
  const rule = await ruleLine(organizationId, event.recurrenceRuleId)
  if (rule) lines.push(rule)
  lines.push(
    ...(await alertLines(organizationId, { eventId: event.id })),
    'END:VEVENT'
  )
  return lines
}
async function collectTasks(organizationId: string, listId?: string) {
  const output: WorkTask[] = []
  let cursor: string | undefined
  for (let page = 0; page < 100; page += 1) {
    const result = await tasks.list(organizationId, {
      ...(listId ? { listId } : {}),
      limit: 100,
      ...(cursor ? { startingAfter: cursor } : {}),
    })
    if (isError(result)) return result
    output.push(...result.data)
    if (!result.hasMore || !result.data.length) break
    cursor = result.data.at(-1)!.id
  }
  return output
}
async function collectEvents(organizationId: string, calendarId?: string) {
  const output: WorkEventResource[] = []
  let cursor: string | undefined
  for (let page = 0; page < 100; page += 1) {
    const result = await events.list(organizationId, {
      ...(calendarId ? { calendarId } : {}),
      limit: 100,
      ...(cursor ? { startingAfter: cursor } : {}),
    })
    if (isError(result)) return result
    output.push(...(result.data as WorkEventResource[]))
    if (!result.hasMore || !result.data.length) break
    cursor = result.data.at(-1)!.id
  }
  return output
}
function jsTask(task: WorkTask) {
  const value: Record<string, unknown> = {
    '@type': 'Task',
    uid: task.uid,
    title: task.title,
    description: task.description ?? undefined,
    progress:
      task.status === 'DONE'
        ? 'completed'
        : task.status === 'IN_PROGRESS'
          ? 'in-process'
          : task.status === 'CANCELLED'
            ? 'cancelled'
            : task.status === 'FAILED'
              ? 'failed'
              : 'needs-action',
    percentComplete: task.percentComplete,
    priority: priority(task),
    created: new Date(task.createdAt * 1000).toISOString(),
    updated: new Date(task.updatedAt * 1000).toISOString(),
  }
  if (task.startAt !== null)
    value.start = new Date(task.startAt * 1000).toISOString()
  if (task.dueAt !== null) value.due = new Date(task.dueAt * 1000).toISOString()
  if (task.startTimeZone || task.dueTimeZone)
    value.timeZone = task.startTimeZone ?? task.dueTimeZone
  if (task.assignments.length)
    value.participants = Object.fromEntries(
      task.assignments.map((assignment) => [
        assignment.id,
        {
          '@type': 'Participant',
          roles: { [assignment.role.toLowerCase()]: true },
          participationStatus: assignment.status
            .toLowerCase()
            .replace('_', '-'),
          sendTo: {
            work: `urn:876:${assignment.targetType.toLowerCase()}:${assignment.assigneeId}`,
          },
        },
      ])
    )
  return value
}
function jsEvent(event: WorkEventResource) {
  const value: Record<string, unknown> = {
    '@type': 'Event',
    uid: event.uid,
    title: event.title,
    description: event.description ?? undefined,
    locations: event.location
      ? { main: { '@type': 'Location', name: event.location } }
      : undefined,
    status: event.status.toLowerCase(),
    freeBusyStatus: event.busyStatus.toLowerCase(),
    created: new Date(event.createdAt * 1000).toISOString(),
    updated: new Date(event.updatedAt * 1000).toISOString(),
  }
  if (event.allDay) {
    value.showWithoutTime = true
    value.start = event.startDate
  } else if (event.startAt !== null && event.endAt !== null) {
    value.start = new Date(event.startAt * 1000).toISOString()
    value.timeZone = event.timeZone
    value.duration = isoDuration(event.endAt - event.startAt)
  }
  if (event.participants.length)
    value.participants = Object.fromEntries(
      event.participants.map((participant) => [
        participant.id,
        {
          '@type': 'Participant',
          name: participant.name ?? undefined,
          email: participant.email ?? undefined,
          roles: { [participant.role.toLowerCase()]: true },
          participationStatus: participant.status
            .toLowerCase()
            .replace('_', '-'),
        },
      ])
    )
  return value
}

export async function create(
  organizationId: string,
  input: CreateWorkCalendarExportInput
): Promise<WorkCalendarExport | AppErrorValue> {
  const includeTasks = input.includeTasks ?? Boolean(input.taskListId)
  const includeEvents =
    (input.includeEvents ?? !includeTasks) || Boolean(input.calendarId)
  const taskRows = includeTasks
    ? await collectTasks(organizationId, input.taskListId)
    : []
  if (isError(taskRows)) return taskRows
  const eventRows = includeEvents
    ? await collectEvents(organizationId, input.calendarId)
    : []
  if (isError(eventRows)) return eventRows

  if (input.format === 'jscalendar') {
    const entries: Record<string, unknown> = {}
    for (const task of taskRows) entries[task.uid] = jsTask(task)
    for (const event of eventRows) entries[event.uid] = jsEvent(event)
    return {
      object: 'calendar_export',
      format: 'jscalendar',
      filename: '876-work.json',
      contentType: 'application/jscalendar+json; charset=utf-8',
      content: JSON.stringify(
        {
          '@type': 'Group',
          prodId: '-//876 Workspace//Work//EN',
          entries,
        },
        null,
        2
      ),
    }
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//876 Workspace//Work//EN',
    'CALSCALE:GREGORIAN',
  ]
  for (const task of taskRows)
    lines.push(...(await taskIcs(organizationId, task)))
  for (const event of eventRows)
    lines.push(...(await eventIcs(organizationId, event)))
  lines.push('END:VCALENDAR')
  return {
    object: 'calendar_export',
    format: 'ics',
    filename: '876-work.ics',
    contentType: 'text/calendar; charset=utf-8',
    content: `${lines.join('\r\n')}\r\n`,
  }
}

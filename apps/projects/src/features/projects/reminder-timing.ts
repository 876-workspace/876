import { formatDateTime } from '@876/core/timestamps'
import type { Reminder } from '@876/projects/contracts'

const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = 1_440

import type { ReminderTarget } from '@/types/events'

function plural(amount: number, unit: string): string {
  return `${amount} ${amount === 1 ? unit : `${unit}s`}`
}

function offsetPhrase(minutes: number, base: string): string {
  if (minutes <= 0) return `at ${base}`
  if (minutes % MINUTES_PER_DAY === 0)
    return `${plural(minutes / MINUTES_PER_DAY, 'day')} before ${base}`
  if (minutes % MINUTES_PER_HOUR === 0)
    return `${plural(minutes / MINUTES_PER_HOUR, 'hour')} before ${base}`
  return `${plural(minutes, 'minute')} before ${base}`
}

/**
 * When a reminder is due, in the user's words.
 *
 * A reminder stores intent only — nothing is delivered — so this reads as a
 * time, never as a promise to notify. `base` names the target's own date: a
 * work item's due date, or an event's start.
 */
export function formatReminderTiming(
  reminder: Reminder,
  base = 'the due date'
): string {
  if (reminder.offsetMinutesBeforeDue !== null)
    return `Due ${offsetPhrase(reminder.offsetMinutesBeforeDue, base)}`

  if (reminder.remindAt !== null)
    return `Due ${formatDateTime(reminder.remindAt)}`

  return 'No time set'
}

export function reminderTargetMatches(
  reminder: Reminder,
  target: ReminderTarget
): boolean {
  if ('issueId' in target) return reminder.issueId === target.issueId
  if ('milestoneId' in target)
    return reminder.milestoneId === target.milestoneId
  return reminder.eventId === target.eventId
}

export function remindersForTarget(
  reminders: readonly Reminder[],
  target: ReminderTarget
): Reminder[] {
  return reminders.filter((reminder) => reminderTargetMatches(reminder, target))
}

export function reminderTargetInput(
  target: ReminderTarget
): { issueId: string } | { milestoneId: string } | { eventId: string } {
  if ('issueId' in target) return { issueId: target.issueId }
  if ('milestoneId' in target) return { milestoneId: target.milestoneId }
  return { eventId: target.eventId }
}

import { RRule } from 'rrule'
import type { WorkRecurrenceRule } from '@876/work'
const weekday = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
} as const
const frequency = {
  DAILY: RRule.DAILY,
  WEEKLY: RRule.WEEKLY,
  MONTHLY: RRule.MONTHLY,
  YEARLY: RRule.YEARLY,
} as const
export function createRRule(rule: WorkRecurrenceRule, dtstart: Date) {
  return new RRule({
    freq: frequency[rule.frequency],
    interval: rule.interval,
    dtstart,
    tzid: rule.timeZone,
    byweekday: rule.byDay.length
      ? rule.byDay.map((day) => weekday[day])
      : undefined,
    bymonthday: rule.byMonthDay.length ? rule.byMonthDay : undefined,
    bymonth: rule.byMonth.length ? rule.byMonth : undefined,
    count: rule.count ?? undefined,
    until: rule.untilAt == null ? undefined : new Date(rule.untilAt * 1000),
    wkst: rule.weekStart ? weekday[rule.weekStart] : undefined,
  })
}
export function occurrencesBetween(
  rule: WorkRecurrenceRule,
  dtstart: Date,
  after: Date,
  before: Date
) {
  return createRRule(rule, dtstart).between(after, before, true)
}

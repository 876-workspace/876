import rrule from 'rrule'

import type { WorkRecurrenceRule } from '@876/work'

/**
 * `rrule` ships a CommonJS UMD bundle with no `exports` map, so Node's ESM
 * loader resolves it through `main` and cjs-module-lexer cannot see its named
 * exports. `import { RRule } from 'rrule'` therefore typechecks and passes
 * under Vitest's transform, then throws `does not provide an export named
 * 'RRule'` the moment the real service boots. Take the interop default and
 * destructure instead.
 */
const { RRule } = rrule
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

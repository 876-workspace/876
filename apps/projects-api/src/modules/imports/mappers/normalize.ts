const STATUS_ALIASES: Record<string, string> = {
  todo: 'todo',
  'to-do': 'todo',
  'to-do-list': 'todo',
  'new': 'backlog',
  open: 'backlog',
  triage: 'backlog',
  backlog: 'backlog',
  'in-progress': 'in-progress',
  inprogress: 'in-progress',
  'in-review': 'in-review',
  inreview: 'in-review',
  review: 'in-review',
  done: 'done',
  closed: 'done',
  resolved: 'done',
  complete: 'done',
  completed: 'done',
  canceled: 'canceled',
  cancelled: 'canceled',
}

const STATUS_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

export function normalizeStatus(raw: string): string | null {
  const cleaned = raw.trim().toLowerCase().replaceAll(/[\s_]+/g, '-')
  if (cleaned === '') return null
  return STATUS_ALIASES[cleaned] ?? (STATUS_PATTERN.test(cleaned) ? cleaned : cleaned)
}

export function isKnownStatus(value: string): boolean {
  return STATUS_PATTERN.test(value)
}

const PRIORITY_ALIASES: Record<string, string> = {
  none: 'none',
  lowest: 'low',
  low: 'low',
  minor: 'low',
  trivial: 'low',
  medium: 'medium',
  normal: 'medium',
  major: 'high',
  high: 'high',
  critical: 'urgent',
  highest: 'urgent',
  urgent: 'urgent',
  blocker: 'urgent',
}

export function normalizePriority(
  raw: string
): 'none' | 'low' | 'medium' | 'high' | 'urgent' | null {
  const cleaned = raw.trim().toLowerCase()
  if (cleaned === '') return null
  const mapped = PRIORITY_ALIASES[cleaned]
  return mapped === undefined
    ? null
    : (mapped as 'none' | 'low' | 'medium' | 'high' | 'urgent')
}

export function parseUnixDate(raw: string): number | null {
  const cleaned = raw.trim()
  if (cleaned === '') return null
  if (/^-?\d+$/.test(cleaned)) {
    const value = Number(cleaned)
    return Number.isSafeInteger(value) ? value : null
  }
  const millis = Date.parse(cleaned)
  return Number.isNaN(millis) ? null : Math.floor(millis / 1000)
}

export function parseInteger(raw: string): number | null {
  const cleaned = raw.trim()
  if (cleaned === '' || !/^-?\d+$/.test(cleaned)) return null
  const value = Number(cleaned)
  return Number.isSafeInteger(value) ? value : null
}

export function parseBoolean(raw: string): boolean | null {
  const cleaned = raw.trim().toLowerCase()
  if (cleaned === '') return null
  if (['true', 'yes', 'y', '1', 'billable'].includes(cleaned)) return true
  if (['false', 'no', 'n', '0', 'non-billable', 'nonbillable'].includes(cleaned))
    return false
  return null
}

export function splitList(raw: string): string[] {
  return raw
    .split(/[;,|]/)
    .map((part) => part.trim())
    .filter((part) => part !== '')
}

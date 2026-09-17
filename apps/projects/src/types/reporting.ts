import { z } from 'zod'

export type ReportPeriod = { from: number; to: number }

export const unixSecondsSchema = z.coerce.number().int().nonnegative()
export const reportFormatSchema = z.enum(['json', 'csv'])
export const timeReportGroupSchema = z.enum(['project', 'user', 'issue'])

export const REPORT_GROUPS = ['project', 'user', 'issue'] as const

export type ReportGroup = (typeof REPORT_GROUPS)[number]

export const REPORT_SLUGS = [
  'work',
  'health',
  'time',
  'budget-variance',
  'workload',
] as const

export type ReportSlug = (typeof REPORT_SLUGS)[number]

export const REPORT_LINKS = [
  { key: 'work', label: 'Work', href: '/reports/work' },
  { key: 'time', label: 'Time', href: '/reports/time' },
  {
    key: 'budget-variance',
    label: 'Budget variance',
    href: '/reports/budget-variance',
  },
  { key: 'workload', label: 'Workload', href: '/reports/workload' },
] as const

export type ReportKey = (typeof REPORT_LINKS)[number]['key']

export type CreateCapacityParams = import('@876/projects').CreateCapacityInput
export type UpdateCapacityParams = import('@876/projects').UpdateCapacityInput

export type CapacityRow = {
  id: string
  member: string
  minutesPerWeek: number
  effectiveFrom: number
  effectiveTo: number | null
}

export type CapacityMemberOption = { id: string; label: string }

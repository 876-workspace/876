import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/db/client'
import { errors } from '@/http/errors'
import { generateId } from '@/platform/ids'

const MODULE = 'reports'
const TIMEZONE = 'timezone'
const FISCAL_YEAR_START_MONTH = 'fiscal-year-start-month'

export const REPORT_TIMEZONE_DEFAULT = 'America/Jamaica'
export const REPORT_FISCAL_YEAR_START_MONTH_DEFAULT = 1

export type ReportPreferences = {
  object: 'report_preferences'
  timezone: string
  fiscalYearStartMonth: number
}

function isValidTimezone(value: string): boolean {
  try {
    if (
      typeof Intl.supportedValuesOf === 'function' &&
      Intl.supportedValuesOf('timeZone').includes(value)
    )
      return true
  } catch {
    return false
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

function resolveTimezone(raw: string | null | undefined): string {
  if (typeof raw !== 'string' || raw.length === 0) return REPORT_TIMEZONE_DEFAULT
  // Malformed/stale persisted rows degrade to the catalog default instead of
  // crashing the reporting surface.
  return isValidTimezone(raw) ? raw : REPORT_TIMEZONE_DEFAULT
}

function resolveFiscalMonth(raw: number | null | undefined): number {
  if (
    typeof raw !== 'number' ||
    !Number.isInteger(raw) ||
    raw < 1 ||
    raw > 12
  )
    return REPORT_FISCAL_YEAR_START_MONTH_DEFAULT
  return raw
}

/** Resolves report preferences. Missing override rows mean catalog defaults. */
export async function retrieveReportPreferences(
  tenantId: string
): Promise<ReportPreferences> {
  const rows = await prisma.modulePreference.findMany({
    where: { tenantId, module: MODULE, key: { in: [TIMEZONE, FISCAL_YEAR_START_MONTH] } },
    select: { key: true, stringValue: true, integerValue: true },
  })

  const byKey = new Map(rows.map((row) => [row.key, row]))
  return {
    object: 'report_preferences',
    timezone: resolveTimezone(byKey.get(TIMEZONE)?.stringValue),
    fiscalYearStartMonth: resolveFiscalMonth(
      byKey.get(FISCAL_YEAR_START_MONTH)?.integerValue
    ),
  }
}

async function storeOverride(options: {
  tenantId: string
  key: string
  valueType: 'string' | 'integer'
  stringValue: string | null
  integerValue: number | null
  updatedBy?: string
}): Promise<void> {
  const now = nowUnixSeconds()
  await prisma.modulePreference.upsert({
    where: {
      billing_module_preferences_tenant_module_key: {
        tenantId: options.tenantId,
        module: MODULE,
        key: options.key,
      },
    },
    create: {
      id: generateId('ModulePreference'),
      tenantId: options.tenantId,
      module: MODULE,
      key: options.key,
      valueType: options.valueType,
      stringValue: options.stringValue,
      integerValue: options.integerValue,
      updatedBy: options.updatedBy ?? null,
      createdAt: now,
      updatedAt: now,
    },
    update: {
      valueType: options.valueType,
      stringValue: options.stringValue,
      integerValue: options.integerValue,
      decimalValue: null,
      booleanValue: null,
      referenceNamespace: null,
      referenceKey: null,
      updatedBy: options.updatedBy ?? null,
      updatedAt: now,
    },
  })
}

async function clearOverride(tenantId: string, key: string): Promise<void> {
  await prisma.modulePreference.deleteMany({
    where: { tenantId, module: MODULE, key },
  })
}

/**
 * Stores only non-default overrides; values equal to the catalog default
 * remove the row and fall back to the default.
 */
export async function updateReportPreferences(
  tenantId: string,
  input: { timezone?: string; fiscalYearStartMonth?: number },
  updatedBy?: string
): Promise<ReportPreferences> {
  if (input.timezone !== undefined) {
    if (!isValidTimezone(input.timezone))
      throw errors.validation('The reporting timezone must be a valid IANA timezone.', {
        param: 'timezone',
      })
    if (input.timezone === REPORT_TIMEZONE_DEFAULT)
      await clearOverride(tenantId, TIMEZONE)
    else
      await storeOverride({
        tenantId,
        key: TIMEZONE,
        valueType: 'string',
        stringValue: input.timezone,
        integerValue: null,
        updatedBy,
      })
  }

  if (input.fiscalYearStartMonth !== undefined) {
    const month = input.fiscalYearStartMonth
    if (!Number.isInteger(month) || month < 1 || month > 12)
      throw errors.validation(
        'The fiscal year start month must be an integer between 1 and 12.',
        { param: 'fiscalYearStartMonth' }
      )
    if (month === REPORT_FISCAL_YEAR_START_MONTH_DEFAULT)
      await clearOverride(tenantId, FISCAL_YEAR_START_MONTH)
    else
      await storeOverride({
        tenantId,
        key: FISCAL_YEAR_START_MONTH,
        valueType: 'integer',
        stringValue: null,
        integerValue: month,
        updatedBy,
      })
  }

  return retrieveReportPreferences(tenantId)
}

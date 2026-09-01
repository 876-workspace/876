import {
  diffPreferences,
  findModule,
  moduleUpdateSchema,
  resolveModulePreferences,
} from '@876/settings'
import type { StoredPreferenceRow } from '@876/settings'

import { AppHttpError } from '@/platform/errors'
import { nowUnixSeconds } from '@/platform/timestamps'
import { COURIERS_MODULE_CATALOG } from './settings.catalog'
import * as repo from './settings.repository'

type Module = (typeof COURIERS_MODULE_CATALOG)[number]
const catalog: readonly Module[] = COURIERS_MODULE_CATALOG

function toStoredPreferenceRow(row: {
  module: string
  key: string
  valueType: string
  stringValue: string | null
  integerValue: number | null
  decimalValue: string | null
  booleanValue: boolean | null
  referenceNamespace: string | null
  referenceKey: string | null
}): StoredPreferenceRow {
  return {
    module: row.module,
    key: row.key,
    valueType: row.valueType as StoredPreferenceRow['valueType'],
    stringValue: row.stringValue,
    integerValue: row.integerValue,
    decimalValue: row.decimalValue,
    booleanValue: row.booleanValue,
    referenceNamespace: row.referenceNamespace,
    referenceKey: row.referenceKey,
  }
}

function isColdStartError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const code = (error as { code?: unknown }).code
  if (typeof code === 'string' && (code === 'P2024' || code === 'P2028'))
    return true
  return error.message.includes('Timed out fetching a new connection')
}

export async function list(tenantId: string) {
  const rows = await repo.listTenantModuleSettings(tenantId)
  const state = new Map(rows.map((row) => [row.module, row.isEnabled]))

  return catalog.map((module) => ({
    object: 'organization_module' as const,
    module: module.key,
    label: module.label,
    optional: module.optional,
    is_enabled: state.get(module.key) ?? true,
  }))
}

export async function toggle(
  tenantId: string,
  moduleKey: string,
  isEnabled: boolean
) {
  const module = catalog.find((entry) => entry.key === moduleKey)
  if (!module)
    throw new AppHttpError({
      code: 'module/not-found',
      message: 'Not found.',
      httpStatus: 404,
    })
  if (!module.optional && !isEnabled)
    throw new AppHttpError({
      code: 'module/required',
      message: 'This module cannot be disabled.',
      httpStatus: 409,
    })

  const now = nowUnixSeconds()
  const row = await repo.saveTenantModuleSetting({
    tenantId,
    module: module.key,
    isEnabled,
    now,
  })

  return {
    object: 'organization_module' as const,
    module: row.module,
    label: module.label,
    optional: module.optional,
    is_enabled: row.isEnabled,
  }
}

export async function retrievePreferences(tenantId: string, moduleKey: string) {
  const moduleDefinition = findModule(COURIERS_MODULE_CATALOG, moduleKey)
  if (!moduleDefinition)
    throw new AppHttpError({
      code: 'module/not-found',
      message: 'Not found.',
      httpStatus: 404,
    })

  try {
    const rows = await repo.listModulePreferences(
      tenantId,
      moduleDefinition.key
    )
    const resolved = resolveModulePreferences(
      moduleDefinition,
      rows.map(toStoredPreferenceRow)
    )
    const updatedAt =
      rows.length > 0
        ? Math.max(...rows.map((row) => Number(row.updatedAt)))
        : undefined

    return {
      object: 'module_preferences' as const,
      module: moduleDefinition.key,
      preferences: resolved,
      ...(updatedAt !== undefined ? { updated_at: updatedAt } : {}),
    }
  } catch (error) {
    if (isColdStartError(error))
      throw new AppHttpError({
        code: 'error/database-unavailable',
        message: 'Database unavailable.',
        httpStatus: 503,
        cause: error,
      })
    throw error
  }
}

export async function updatePreferences(
  tenantId: string,
  moduleKey: string,
  values: Record<string, unknown>,
  updatedBy?: string | null
) {
  const moduleDefinition = findModule(COURIERS_MODULE_CATALOG, moduleKey)
  if (!moduleDefinition)
    throw new AppHttpError({
      code: 'module/not-found',
      message: 'Not found.',
      httpStatus: 404,
    })

  const parsed = moduleUpdateSchema(moduleDefinition).safeParse(values)
  if (!parsed.success)
    throw new AppHttpError({
      code: 'request/invalid',
      message: parsed.error.issues[0]?.message ?? 'Invalid preference value.',
      httpStatus: 422,
    })

  const parsedValues = parsed.data as Record<string, unknown>

  try {
    const currentRows = await repo.listModulePreferences(
      tenantId,
      moduleDefinition.key
    )
    const current = resolveModulePreferences(
      moduleDefinition,
      currentRows.map(toStoredPreferenceRow)
    )

    const diff = diffPreferences(
      moduleDefinition,
      current,
      parsedValues as Record<string, never>
    )

    const deletes: string[] = []
    for (const [key, value] of Object.entries(parsedValues)) {
      const preference = moduleDefinition.preferences.find(
        (candidate) => candidate.key === key
      )
      if (!preference) continue
      if (Object.is(value, preference.default)) deletes.push(key)
    }

    const upserts = diff.filter((row) => {
      const preference = moduleDefinition.preferences.find(
        (candidate) => candidate.key === row.key
      )
      if (!preference) return false
      return !Object.is(parsedValues[row.key], preference.default)
    })

    const now = nowUnixSeconds()
    const rowsAfter = await repo.updateModulePreferences({
      tenantId,
      module: moduleDefinition.key,
      deletes,
      upserts,
      now,
      updatedBy: updatedBy ?? null,
    })

    const resolved = resolveModulePreferences(
      moduleDefinition,
      rowsAfter.map(toStoredPreferenceRow)
    )

    return {
      object: 'module_preferences' as const,
      module: moduleDefinition.key,
      preferences: resolved,
      updated_at: now,
    }
  } catch (error) {
    if (error instanceof AppHttpError) throw error
    if (isColdStartError(error))
      throw new AppHttpError({
        code: 'error/database-unavailable',
        message: 'Database unavailable.',
        httpStatus: 503,
        cause: error,
      })
    throw error
  }
}

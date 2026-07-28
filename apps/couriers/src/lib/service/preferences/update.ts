import { nowUnixSeconds } from '@876/core/timestamps'
import {
  diffPreferences,
  findModule,
  moduleUpdateSchema,
  resolveModulePreferences,
  type PreferenceValue,
} from '@876/settings'

import { prisma } from '@/lib/db'
import { COURIERS_MODULE_CATALOG } from '@/lib/modules/catalog'
import type { ServiceResult } from '@/types/api'
import type {
  ModulePreferenceUpdateParams,
  ResolvedModulePreferences,
} from '@/types/module-settings'

import { err, ok } from '../result'
import { toStoredPreferenceRow } from './retrieve'

export async function update(
  params: ModulePreferenceUpdateParams
): ServiceResult<ResolvedModulePreferences> {
  const module = findModule(COURIERS_MODULE_CATALOG, params.module)
  if (!module) return err('Unknown module.', 404)

  const parsed = moduleUpdateSchema(module).safeParse(params.values)
  if (!parsed.success)
    return err(parsed.error.issues[0]?.message ?? 'Invalid preference.', 400)

  const parsedValues = parsed.data as Record<string, PreferenceValue>
  const currentRows = await prisma.modulePreference.findMany({
    where: { tenantId: params.tenantId, module: module.key },
  })
  const current = resolveModulePreferences(
    module,
    currentRows.map(toStoredPreferenceRow)
  )
  const diff = diffPreferences(module, current, parsedValues)
  const now = nowUnixSeconds()

  const rowsAfterWrite = await prisma.$transaction(async (tx) => {
    for (const [key, value] of Object.entries(parsedValues)) {
      const preference = module.preferences.find(
        (candidate) => candidate.key === key
      )
      if (!preference || !Object.is(value, preference.default)) continue

      await tx.modulePreference.deleteMany({
        where: {
          tenantId: params.tenantId,
          module: module.key,
          key,
        },
      })
    }

    for (const row of diff) {
      const preference = module.preferences.find(
        (candidate) => candidate.key === row.key
      )
      if (!preference) continue
      if (Object.is(parsedValues[row.key], preference.default)) continue

      const where = {
        module_preferences_tenant_id_module_key_key: {
          tenantId: params.tenantId,
          module: module.key,
          key: row.key,
        },
      }

      const values = {
        valueType: row.valueType,
        stringValue: row.stringValue,
        integerValue: row.integerValue,
        decimalValue: row.decimalValue,
        booleanValue: row.booleanValue,
        referenceNamespace: row.referenceNamespace,
        referenceKey: row.referenceKey,
        updatedBy: params.updatedBy,
        updatedAt: now,
      }

      await tx.modulePreference.upsert({
        where,
        create: {
          tenantId: params.tenantId,
          module: module.key,
          key: row.key,
          ...values,
          createdAt: now,
        },
        update: values,
      })
    }

    return tx.modulePreference.findMany({
      where: { tenantId: params.tenantId, module: module.key },
    })
  })

  return ok(
    resolveModulePreferences(module, rowsAfterWrite.map(toStoredPreferenceRow))
  )
}

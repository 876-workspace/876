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

import { err, errFrom, ok } from '../result'
import { reportServiceFailure } from '../report'
import { toStoredPreferenceRow } from './retrieve'
import { isColdStartError, runTransaction } from '../transaction'

export async function update(
  params: ModulePreferenceUpdateParams
): ServiceResult<ResolvedModulePreferences> {
  const moduleDefinition = findModule(COURIERS_MODULE_CATALOG, params.module)
  if (!moduleDefinition) return err('Unknown module.', 404)

  const parsed = moduleUpdateSchema(moduleDefinition).safeParse(params.values)
  if (!parsed.success)
    return err(parsed.error.issues[0]?.message ?? 'Invalid preference.', 400)

  const parsedValues = parsed.data as Record<string, PreferenceValue>
  const currentRows = await prisma.modulePreference.findMany({
    where: { tenantId: params.tenantId, module: moduleDefinition.key },
  })
  const current = resolveModulePreferences(
    moduleDefinition,
    currentRows.map(toStoredPreferenceRow)
  )
  const diff = diffPreferences(moduleDefinition, current, parsedValues)
  const now = nowUnixSeconds()

  try {
    const rowsAfterWrite = await runTransaction(
      'preferences.update',
      async (tx) => {
        for (const [key, value] of Object.entries(parsedValues)) {
          const preference = moduleDefinition.preferences.find(
            (candidate) => candidate.key === key
          )
          if (!preference || !Object.is(value, preference.default)) continue

          await tx.modulePreference.deleteMany({
            where: {
              tenantId: params.tenantId,
              module: moduleDefinition.key,
              key,
            },
          })
        }

        for (const row of diff) {
          const preference = moduleDefinition.preferences.find(
            (candidate) => candidate.key === row.key
          )
          if (!preference) continue
          if (Object.is(parsedValues[row.key], preference.default)) continue

          const where = {
            module_preferences_tenant_id_module_key_key: {
              tenantId: params.tenantId,
              module: moduleDefinition.key,
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
              module: moduleDefinition.key,
              key: row.key,
              ...values,
              createdAt: now,
            },
            update: values,
          })
        }

        return tx.modulePreference.findMany({
          where: { tenantId: params.tenantId, module: moduleDefinition.key },
        })
      }
    )

    return ok(
      resolveModulePreferences(
        moduleDefinition,
        rowsAfterWrite.map(toStoredPreferenceRow)
      )
    )
  } catch (error) {
    if (isColdStartError(error)) {
      reportServiceFailure(error, {
        operation: 'preferences.update',
        consequence:
          'The preferences were not saved and the form asks the user to try again shortly.',
      })
      return errFrom('error/database-unavailable')
    }

    console.error('[service.preferences.update]', error)
    reportServiceFailure(error, {
      operation: 'preferences.update',
      consequence:
        'The preferences were not saved and the form shows a generic failure.',
    })
    throw error
  }
}

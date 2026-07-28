import {
  findModule,
  resolveCatalogPreferences,
  resolveModulePreferences,
  type StoredPreferenceRow,
} from '@876/settings'

import { prisma, type ModulePreference } from '@/lib/db'
import { COURIERS_MODULE_CATALOG } from '@/lib/modules/catalog'
import type { ModulePreferenceListParams } from '@/types/module-settings'

export function toStoredPreferenceRow(
  row: ModulePreference
): StoredPreferenceRow {
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

export async function retrieve(params: ModulePreferenceListParams) {
  const module = params.module
    ? findModule(COURIERS_MODULE_CATALOG, params.module)
    : undefined
  if (params.module && !module) return null

  const storedRows = await prisma.modulePreference.findMany({
    where: {
      tenantId: params.tenantId,
      ...(params.module !== undefined && { module: params.module }),
    },
  })
  const rows = storedRows.map(toStoredPreferenceRow)

  if (module) return resolveModulePreferences(module, rows)

  return resolveCatalogPreferences(COURIERS_MODULE_CATALOG, rows)
}

import { prisma } from '@/db/client'
import type { StoredPreferenceRow } from '@876/settings'

export function listTenantModuleSettings(tenantId: string) {
  return prisma.organizationModule.findMany({
    where: { tenantId },
    select: { module: true, isEnabled: true },
  })
}

export function listModulePreferences(tenantId: string, module: string) {
  return prisma.modulePreference.findMany({
    where: { tenantId, module },
  })
}

export function updateModulePreferences(options: {
  tenantId: string
  module: string
  deletes: string[]
  upserts: StoredPreferenceRow[]
  now: number
  updatedBy?: string | null
}) {
  return prisma.$transaction(async (tx) => {
    for (const key of options.deletes) {
      await tx.modulePreference.deleteMany({
        where: { tenantId: options.tenantId, module: options.module, key },
      })
    }

    for (const row of options.upserts) {
      await tx.modulePreference.upsert({
        where: {
          module_preferences_tenant_id_module_key_key: {
            tenantId: options.tenantId,
            module: options.module,
            key: row.key,
          },
        },
        create: {
          tenantId: options.tenantId,
          module: options.module,
          key: row.key,
          valueType: row.valueType,
          stringValue: row.stringValue,
          integerValue: row.integerValue,
          decimalValue: row.decimalValue,
          booleanValue: row.booleanValue,
          referenceNamespace: row.referenceNamespace,
          referenceKey: row.referenceKey,
          updatedBy: options.updatedBy ?? null,
          createdAt: options.now,
          updatedAt: options.now,
        },
        update: {
          valueType: row.valueType,
          stringValue: row.stringValue,
          integerValue: row.integerValue,
          decimalValue: row.decimalValue,
          booleanValue: row.booleanValue,
          referenceNamespace: row.referenceNamespace,
          referenceKey: row.referenceKey,
          updatedBy: options.updatedBy ?? null,
          updatedAt: options.now,
        },
      })
    }

    return tx.modulePreference.findMany({
      where: { tenantId: options.tenantId, module: options.module },
    })
  })
}

export function saveTenantModuleSetting(options: {
  tenantId: string
  module: string
  isEnabled: boolean
  now: number
}) {
  return prisma.organizationModule.upsert({
    where: {
      organization_modules_tenant_id_module_key: {
        tenantId: options.tenantId,
        module: options.module,
      },
    },
    create: {
      tenantId: options.tenantId,
      module: options.module,
      isEnabled: options.isEnabled,
      createdAt: options.now,
      updatedAt: options.now,
    },
    update: { isEnabled: options.isEnabled, updatedAt: options.now },
  })
}

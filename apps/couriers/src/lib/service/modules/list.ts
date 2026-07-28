import { prisma } from '@/lib/db'
import { COURIERS_MODULE_CATALOG } from '@/lib/modules/catalog'
import type { ModuleStateListParams } from '@/types/module-settings'

export async function list(params: ModuleStateListParams) {
  const rows = await prisma.organizationModule.findMany({
    where: { tenantId: params.tenantId },
    select: { module: true, isEnabled: true },
  })
  const states = new Map(rows.map((row) => [row.module, row.isEnabled]))

  return COURIERS_MODULE_CATALOG.map((module) => ({
    module: module.key,
    label: module.label,
    optional: module.optional,
    isEnabled: states.get(module.key) ?? module.enabledByDefault,
  }))
}

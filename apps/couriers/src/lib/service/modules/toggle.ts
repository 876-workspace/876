import { nowUnixSeconds } from '@876/core/timestamps'
import { findModule } from '@876/settings'

import { prisma } from '@/lib/db'
import {
  COURIERS_MODULE_CATALOG,
  isCourierModuleKey,
} from '@/lib/modules/catalog'
import type { ServiceResult } from '@/types/api'
import type { ModuleToggleParams } from '@/types/module-settings'

import { err, ok } from '../result'

export async function toggle(
  params: ModuleToggleParams
): ServiceResult<{ module: string; isEnabled: boolean }> {
  if (!isCourierModuleKey(params.module)) return err('Unknown module.', 404)

  const module = findModule(COURIERS_MODULE_CATALOG, params.module)
  if (!module) return err('Unknown module.', 404)
  if (!params.isEnabled && !module.optional)
    return err('That module cannot be turned off.', 409)

  const now = nowUnixSeconds()

  const row = await prisma.organizationModule.upsert({
    where: {
      organization_modules_tenant_id_module_key: {
        tenantId: params.tenantId,
        module: module.key,
      },
    },
    create: {
      tenantId: params.tenantId,
      module: module.key,
      isEnabled: params.isEnabled,
      createdAt: now,
      updatedAt: now,
    },
    update: {
      isEnabled: params.isEnabled,
      updatedAt: now,
    },
    select: { module: true, isEnabled: true },
  })

  return ok(row)
}

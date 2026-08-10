import { prisma } from '@/db/client'

export function listTenantModuleSettings(tenantId: string) {
  return prisma.organizationModule.findMany({
    where: { tenantId },
    select: { module: true, isEnabled: true },
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

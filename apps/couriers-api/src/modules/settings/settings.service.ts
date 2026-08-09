import { AppHttpError } from '@/platform/errors'
import { nowUnixSeconds } from '@/platform/timestamps'
import { prisma } from './settings.repository'
type Module = { key: string; label: string; optional: boolean }
const catalog: readonly Module[] = [
  { key: 'general', label: 'General', optional: false },
  { key: 'customers', label: 'Customers', optional: false },
  { key: 'items', label: 'Items', optional: true },
  { key: 'packages', label: 'Packages', optional: false },
  { key: 'pre_alerts', label: 'Pre-alerts', optional: true },
  { key: 'warehouse', label: 'Warehouse', optional: false },
  { key: 'manifests', label: 'Manifests', optional: true },
  { key: 'deliveries', label: 'Deliveries', optional: true },
  { key: 'invoices', label: 'Invoices', optional: false },
  { key: 'payments', label: 'Payments', optional: false },
  { key: 'portal', label: 'Customer portal', optional: true },
]
export async function list(tenantId: string) {
  const rows = await prisma.organizationModule.findMany({
    where: { tenantId },
    select: { module: true, isEnabled: true },
  })
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
  const row = await prisma.organizationModule.upsert({
    where: {
      organization_modules_tenant_id_module_key: {
        tenantId,
        module: module.key,
      },
    },
    create: {
      tenantId,
      module: module.key,
      isEnabled,
      createdAt: now,
      updatedAt: now,
    },
    update: { isEnabled, updatedAt: now },
  })
  return {
    object: 'organization_module' as const,
    module: row.module,
    label: module.label,
    optional: module.optional,
    is_enabled: row.isEnabled,
  }
}

import { prisma } from '@/lib/db'

/** Resolves the app-scoped finance grant for one Billing workspace. */
export function retrieve(tenantId: string, sourceAppId: string) {
  return prisma.appFinanceConnection.findUnique({
    where: {
      billing_app_finance_connections_tenant_source_app_key: {
        tenantId,
        sourceAppId,
      },
    },
  })
}

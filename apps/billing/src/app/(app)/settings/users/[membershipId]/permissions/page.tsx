import type { Metadata } from 'next'

import {
  PermissionMatrix,
  matrixModulesFromCatalog,
} from '@876/access-ui/permission-matrix'
import { appPermissionCatalogs } from '@876/core/access/catalogs'
import { AppError } from '@876/ui/app-error'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { loadMemberAppMemberships } from '../../_data'

export const metadata: Metadata = {
  title: 'Permissions',
}

export default async function MemberPermissionsPage({
  params,
}: {
  params: Promise<{ membershipId: string }>
}) {
  const { membershipId } = await params
  const context = await getWorkspaceContext()
  if (!context)
    return (
      <AppError
        title="Permissions could not be loaded"
        error={{
          code: 'billing/unavailable',
          message: 'Organization context is unavailable.',
        }}
        variant="section"
      />
    )
  const result = await loadMemberAppMemberships(context.orgId, membershipId)
  if (result.error)
    return (
      <AppError
        title="Permissions could not be loaded"
        error={result.error}
        variant="section"
      />
    )
  return (
    <div className="space-y-6">
      {result.memberships
        .filter((membership) => membership.entitled)
        .map((membership) => {
          const catalog = appPermissionCatalogs[membership.app_slug]
          return (
            <section
              key={membership.app_id}
              aria-label={`${membership.app_name} permissions`}
              className="space-y-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-semibold">{membership.app_name}</h3>
                <span className="text-muted-foreground text-xs">
                  {membership.app_role?.name ?? 'No access'}
                </span>
              </div>
              {catalog ? (
                <PermissionMatrix
                  modules={matrixModulesFromCatalog(catalog)}
                  held={membership.effective_permissions}
                />
              ) : (
                <p className="text-muted-foreground text-sm">
                  Permission details are not available for this app.
                </p>
              )}
            </section>
          )
        })}
    </div>
  )
}
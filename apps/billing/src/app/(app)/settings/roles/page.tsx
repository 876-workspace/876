import Link from 'next/link'

import { Badge } from '@876/ui/badge'
import { buttonVariants } from '@876/ui/button'
import { ChevronRight, KeyRound, Plus, Users } from '@876/ui/icons'
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = { title: 'Roles - Billing settings' }

export default async function RolesPage() {
  const context = await requirePagePermission('roles:read')
  const roles = await service.roles.list(context.tenant.id)
  const canManage = context.permissions.includes('roles:write')

  return (
    <Page>
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <div className="mb-6 flex items-center justify-between gap-4">
        <PageHeader className="mb-0">
          <PageTitle>Roles & permissions</PageTitle>
        </PageHeader>
        {canManage ? (
          <Link
            href="/settings/roles/new"
            className={buttonVariants({ variant: 'info' })}
          >
            <Plus className="size-3.5" />
            Add
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((role) => (
          <Link
            key={role.id}
            href={`/settings/roles/${encodeURIComponent(role.id)}`}
            className="876-card 876-card-interactive group focus-visible:ring-ring p-5 focus-visible:ring-2 focus-visible:outline-none"
          >
            <div className="flex items-start gap-4">
              <span
                className={
                  role.isSystem
                    ? 'flex size-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-700 dark:text-blue-300'
                    : 'bg-876-accent-surface text-876-accent-fg flex size-11 shrink-0 items-center justify-center rounded-2xl'
                }
              >
                <KeyRound className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{role.name}</h2>
                  <Badge variant={role.isSystem ? 'outline' : 'secondary'}>
                    {role.isSystem ? 'System' : 'Custom'}
                  </Badge>
                  {role.isDefault ? (
                    <Badge variant="secondary">Default</Badge>
                  ) : null}
                </div>
                <p className="text-muted-foreground mt-1 line-clamp-2 text-sm leading-5">
                  {role.description || 'No description.'}
                </p>
                <div className="text-muted-foreground mt-5 flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="size-3.5" />
                    {role.permissions.length} permissions
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3.5" />
                    {role.memberCount} members
                  </span>
                </div>
              </div>
              <ChevronRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </Page>
  )
}

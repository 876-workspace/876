import { notFound } from 'next/navigation'

import { Badge } from '@876/ui/badge'
import { Page, PageBreadcrumb } from '@876/ui/page'

import { RoleEditor } from '@/components/billing-role-editor'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ roleId: string }>
}) {
  const { roleId } = await params
  return { title: `${roleId} - Billing role` }
}

export default async function RoleDetailPage({
  params,
}: {
  params: Promise<{ roleId: string }>
}) {
  const context = await requirePagePermission('roles:read')
  const { roleId } = await params
  const role = await service.roles.retrieve(context.tenant.id, roleId)
  if (!role) notFound()

  return (
    <Page>
      <PageBreadcrumb href="/settings/roles" label="Roles" className="mb-4" />

      <div className="mb-7">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="876-page-title">{role.name}</h1>
          <Badge variant={role.isSystem ? 'outline' : 'secondary'}>
            {role.isSystem ? 'System' : 'Custom'}
          </Badge>
          {role.isDefault ? <Badge variant="secondary">Default</Badge> : null}
        </div>
        <p className="text-muted-foreground mt-1 font-mono text-xs">
          {role.slug} · {role.memberCount} member
          {role.memberCount === 1 ? '' : 's'}
        </p>
      </div>

      <RoleEditor
        role={role}
        canManage={context.permissions.includes('roles:write')}
      />
    </Page>
  )
}

import { notFound } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { service } from '@/lib/service'

import { AnalyticsEvent } from '@/lib/analytics/events'
import { TrackMCEventOnMount } from '@/lib/analytics/track-event-on-mount'
import { PermissionEditor } from '../permission-editor'
import { Page } from '@876/ui/page'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = await params
  return { title: `${name} - Roles` }
}

export default async function RoleDetailPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = await params
  const role = await service.roles.retrieve(name)
  if (!role) notFound()

  return (
    <Page>
      <TrackMCEventOnMount
        event={AnalyticsEvent.RoleDetailViewed}
        properties={{ role_name: role.name }}
      />
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="876-page-title">{role.displayName}</h1>
          {role.isSystem && (
            <Badge variant="outline" className="text-xs">
              System
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-1 font-mono text-xs">
          {role.name}
        </p>
      </div>

      <PermissionEditor
        roleName={role.name}
        displayName={role.displayName}
        description={role.description}
        currentPermissions={role.permissions}
        isSystem={role.isSystem}
      />
    </Page>
  )
}

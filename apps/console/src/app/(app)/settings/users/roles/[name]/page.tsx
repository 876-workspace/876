import { notFound } from 'next/navigation'
import { AnalyticsEvent } from '@/lib/analytics/events'
import { TrackMCEventOnMount } from '@/lib/analytics/track-event-on-mount'
import { PermissionEditor } from '@/app/(app)/settings/users/roles/_components/permission-editor'
import { getRole } from './_data'

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
  const role = await getRole(name)
  if (!role) notFound()

  return (
    <>
      <TrackMCEventOnMount
        event={AnalyticsEvent.RoleDetailViewed}
        properties={{ role_name: role.name }}
      />
      <PermissionEditor
        roleName={role.name}
        displayName={role.displayName}
        description={role.description}
        currentPermissions={role.permissions}
        isSystem={role.isSystem}
      />
    </>
  )
}

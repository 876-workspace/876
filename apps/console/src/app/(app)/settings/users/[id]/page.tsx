import { notFound } from 'next/navigation'

import { formatDate } from '@/lib/format'
import { PERMISSION_GROUPS } from '@/lib/permissions'
import { resolveMemberGrant, resolveMemberIdentity } from './_data'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  owner: 'Owner',
  admin: 'Admin',
  staff: 'Staff',
}

function permissionLabel(value: string): string {
  for (const group of PERMISSION_GROUPS) {
    const match = group.permissions.find((p) => p.value === value)
    if (match) return match.label
  }
  return value
}

type Props = { params: Promise<{ id: string }> }

export default async function TeamMemberOverviewPage({ params }: Props) {
  const { id } = await params
  const [grant, identity] = await Promise.all([
    resolveMemberGrant(id),
    resolveMemberIdentity(id),
  ])
  if (!grant) notFound()

  const displayName =
    [identity?.first_name, identity?.last_name].filter(Boolean).join(' ') ||
    identity?.email ||
    id

  const grantedDate = formatDate(Math.floor(grant.createdAt.getTime() / 1000))

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {/* Identity */}
      <div className="876-card p-5">
        <h3 className="mb-4 text-sm font-medium">Profile</h3>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="876-eyebrow">Name</dt>
            <dd className="mt-1 font-medium">{displayName}</dd>
          </div>
          <div>
            <dt className="876-eyebrow">Email</dt>
            <dd className="mt-1">{identity?.email ?? '—'}</dd>
          </div>
          {identity?.username && (
            <div>
              <dt className="876-eyebrow">Username</dt>
              <dd className="text-muted-foreground mt-1 font-mono text-xs">
                @{identity.username}
              </dd>
            </div>
          )}
          <div>
            <dt className="876-eyebrow">User ID</dt>
            <dd className="text-muted-foreground mt-1 font-mono text-xs">
              {id}
            </dd>
          </div>
          {identity?.created_at && (
            <div>
              <dt className="876-eyebrow">Joined</dt>
              <dd className="mt-1">{formatDate(identity.created_at)}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* MC Access */}
      <div className="876-card p-5">
        <h3 className="mb-4 text-sm font-medium">Console Access</h3>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="876-eyebrow">Role</dt>
            <dd className="mt-1 font-medium">
              {ROLE_LABELS[grant.roleName] ?? grant.roleName}
            </dd>
          </div>
          <div>
            <dt className="876-eyebrow">Status</dt>
            <dd className="mt-1 capitalize">{grant.status}</dd>
          </div>
          <div>
            <dt className="876-eyebrow">Access granted</dt>
            <dd className="mt-1">{grantedDate}</dd>
          </div>
        </dl>

        {grant.role.permissions.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <p className="876-eyebrow mb-2">Permissions</p>
            <div className="flex flex-wrap gap-1.5">
              {grant.role.permissions.map((p) => (
                <span
                  key={p}
                  className="border-border bg-muted text-muted-foreground rounded-md border px-2 py-0.5 text-xs font-medium"
                >
                  {permissionLabel(p)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

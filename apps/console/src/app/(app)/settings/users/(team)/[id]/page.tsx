import { notFound } from 'next/navigation'

import { formatDate } from '@/lib/format'
import { findConsoleAccess, requireSession } from '@/lib/auth/guards'
import {
  canonicalConsoleRole,
  hasPermission,
  PERMISSION_GROUPS,
} from '@/lib/permissions'
import { resolveMemberGrant, resolveMemberIdentity } from './_data'
import { GrantEditor } from './_components/grant-editor'

const ROLE_LABELS: Record<string, string> = {
  'super-admin': 'Super Admin',
  super_admin: 'Super Admin',
  owner: 'Owner',
  admin: 'Admin',
  staff: 'Staff',
}

function permissionLabel(value: string): string {
  for (const group of PERMISSION_GROUPS) {
    for (const permissionModule of group.modules) {
      const match = permissionModule.permissions.find((p) => p.value === value)
      if (match) return match.label
    }
  }
  return value
}

type Props = { params: Promise<{ id: string }> }

export const metadata = { title: 'Team Member' }

export default async function TeamMemberOverviewPage({ params }: Props) {
  const { id } = await params
  const session = await requireSession(`/settings/users/${id}`)
  const [grant, identity, viewer] = await Promise.all([
    resolveMemberGrant(id),
    resolveMemberIdentity(id),
    findConsoleAccess(session.id),
  ])
  if (!grant) notFound()

  const displayName =
    [identity?.first_name, identity?.last_name].filter(Boolean).join(' ') ||
    identity?.email ||
    id

  const grantedDate = formatDate(Math.floor(grant.createdAt.getTime() / 1000))

  return (
    <div className="space-y-4">
      {/* Profile Details */}
      <div className="border-876-surface-border bg-muted/20 space-y-3 rounded-xl border p-4">
        <h3 className="text-muted-foreground text-[0.8125rem] font-semibold">
          Profile Details
        </h3>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-xs">Name</dt>
            <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
              {displayName}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Email</dt>
            <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
              {identity?.email ? (
                <a
                  href={`mailto:${identity.email}`}
                  className="hover:underline"
                >
                  {identity.email}
                </a>
              ) : (
                <span className="text-muted-foreground/60">—</span>
              )}
            </dd>
          </div>
          {identity?.username && (
            <div>
              <dt className="text-muted-foreground text-xs">Username</dt>
              <dd className="text-foreground mt-0.5 font-mono text-xs">
                @{identity.username}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground text-xs">User ID</dt>
            <dd className="text-foreground mt-0.5 font-mono text-xs">{id}</dd>
          </div>
          {identity?.created_at && (
            <div>
              <dt className="text-muted-foreground text-xs">Joined</dt>
              <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
                {formatDate(identity.created_at)}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <GrantEditor
        memberId={id}
        canUpdate={viewer ? hasPermission(viewer, 'team:update') : false}
        canSuspend={viewer ? hasPermission(viewer, 'team:suspend') : false}
        viewerRole={viewer ? canonicalConsoleRole(viewer.role) : null}
        initial={{
          roleName: grant.roleName,
          status: grant.status as 'active' | 'suspended',
          affiliation: grant.affiliation as 'staff' | 'contractor' | 'external',
          title: grant.title,
          expiresAt: grant.expiresAt === null ? null : Number(grant.expiresAt),
          justification: grant.justification,
        }}
      />

      {/* Console Access */}
      <div className="border-876-surface-border bg-muted/20 space-y-3 rounded-xl border p-4">
        <h3 className="text-muted-foreground text-[0.8125rem] font-semibold">
          Console Access
        </h3>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-xs">Role</dt>
            <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
              {ROLE_LABELS[grant.roleName] ?? grant.roleName}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Status</dt>
            <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium capitalize">
              {grant.status}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Access Granted</dt>
            <dd className="text-foreground mt-0.5 text-[0.8125rem] font-medium">
              {grantedDate}
            </dd>
          </div>
        </dl>

        {grant.role.permissions.length > 0 && (
          <div className="border-border/60 mt-3 border-t pt-3">
            <p className="text-muted-foreground mb-2 text-xs font-medium">
              Permissions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {grant.role.permissions.map((p) => (
                <span
                  key={p}
                  className="border-border bg-muted/60 text-muted-foreground rounded-md border px-2 py-0.5 text-xs font-medium"
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

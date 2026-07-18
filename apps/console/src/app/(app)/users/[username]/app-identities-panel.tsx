import type { ReactNode } from 'react'
import type { AdminUser, AdminUserApp } from '@876/admin'
import { Building2, ShieldCheck, User, type IconComponent } from '@876/ui/icons'

import { IconChip, type Tone } from './overview-ui'
import { LazyEnterpriseIdentities } from './overview-lazy'

type AppIdentity = {
  key: string
  name: string
  icon: IconComponent
  tone: Tone
  identity: ReactNode
}

export function AppIdentitiesPanel({
  user,
  membershipCount,
  mcRole,
  enrolledApps,
}: {
  user: AdminUser
  membershipCount: number
  /** The user's Console role, or `null` if they have no MC access. */
  mcRole: string | null
  enrolledApps: AdminUserApp[]
}) {
  const apps = buildAppIdentities(user, membershipCount, mcRole, enrolledApps)

  return (
    <ul className="grid gap-2">
      {apps.map((app) => (
        <li
          key={app.key}
          className="border-876-surface-border bg-background/60 rounded-md border px-3 py-2.5"
        >
          <div className="flex items-start gap-2.5">
            <IconChip icon={app.icon} tone={app.tone} className="size-8" />
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {app.name}
              </span>
              <div className="mt-1 min-w-0">{app.identity}</div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function appIdentityCount(
  mcRole: string | null,
  membershipCount: number,
  enrolledApps: AdminUserApp[] = []
): number {
  const HARDCODED_SLUGS = new Set(['876-consumer', '876-enterprise', 'console'])
  const dynamicCount = enrolledApps.filter(
    (a) => !HARDCODED_SLUGS.has(a.slug)
  ).length
  return (
    1 + (membershipCount > 0 ? 1 : 0) + (mcRole !== null ? 1 : 0) + dynamicCount
  )
}

function buildAppIdentities(
  user: AdminUser,
  membershipCount: number,
  mcRole: string | null,
  enrolledApps: AdminUserApp[] = []
): AppIdentity[] {
  const apps: AppIdentity[] = [
    {
      key: '876',
      name: '876',
      icon: User,
      tone: 'rose',
      identity: (
        <p className="text-muted-foreground truncate text-xs">
          Consumer account
          {user.username ? ` · @${user.username}` : ''}
        </p>
      ),
    },
  ]

  if (membershipCount > 0) {
    apps.push({
      key: 'enterprise',
      name: 'Enterprise',
      icon: Building2,
      tone: 'amber',
      identity: <LazyEnterpriseIdentities userId={user.id} />,
    })
  }

  if (mcRole !== null) {
    apps.push({
      key: 'console',
      name: 'Console',
      icon: ShieldCheck,
      tone: 'violet',
      identity: (
        <p className="text-muted-foreground truncate text-xs capitalize">
          Platform access · {mcRole.replace('_', ' ')}
        </p>
      ),
    })
  }

  const HARDCODED_SLUGS = new Set(['876-consumer', '876-enterprise', 'console'])
  for (const app of enrolledApps) {
    if (HARDCODED_SLUGS.has(app.slug)) continue
    apps.push({
      key: app.id,
      name: app.name,
      icon: User,
      tone: 'sky',
      identity: (
        <p className="text-muted-foreground truncate text-xs">
          Enrolled ·{' '}
          {new Date(app.enrolled_at * 1000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      ),
    })
  }

  return apps
}

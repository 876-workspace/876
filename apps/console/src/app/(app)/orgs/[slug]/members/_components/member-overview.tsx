import Link from 'next/link'
import type { AdminOrgMember, AdminUser } from '@876/admin'
import {
  Calendar,
  ExternalLink,
  Fingerprint,
  Mail,
  Shield,
  User,
  CheckCircle2,
} from '@876/ui/icons'
import { cn } from '@876/core/utils'
import { formatDate } from '@/lib/format'
import { memberStatusBadgeClass, roleBadgeClass } from './member-format'

type Props = {
  member: AdminOrgMember
  user?: AdminUser | null
}

export function MemberOverview({ member, user }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* 2x2 Fact Tiles Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Role Tile */}
        <div className="border-876-surface-border bg-muted/20 flex flex-col justify-between rounded-xl border p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              Organization Role
            </span>
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Shield className="size-4" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-base font-semibold capitalize">
              {member.role}
            </span>
            <span
              className={cn(
                'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
                roleBadgeClass(member.role)
              )}
            >
              {member.role}
            </span>
          </div>
        </div>

        {/* Status Tile */}
        <div className="border-876-surface-border bg-muted/20 flex flex-col justify-between rounded-xl border p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              Membership Status
            </span>
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-base font-semibold capitalize">
              {member.status}
            </span>
            <span
              className={cn(
                'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
                memberStatusBadgeClass(member.status)
              )}
            >
              {member.status}
            </span>
          </div>
        </div>

        {/* Joined Date Tile */}
        <div className="border-876-surface-border bg-muted/20 flex flex-col justify-between rounded-xl border p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              Member Since
            </span>
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Calendar className="size-4" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-3 text-base font-semibold">
            {formatDate(member.created_at)}
          </p>
        </div>

        {/* Membership ID Tile */}
        <div className="border-876-surface-border bg-muted/20 flex flex-col justify-between rounded-xl border p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              Membership ID
            </span>
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Fingerprint className="size-4" aria-hidden="true" />
            </span>
          </div>
          <p className="text-muted-foreground mt-3 truncate font-mono text-xs">
            {member.id}
          </p>
        </div>
      </div>

      {/* Primary Contact Card */}
      {member.email && (
        <div className="border-876-surface-border bg-muted/20 flex items-center justify-between rounded-xl border px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Mail className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <span className="text-muted-foreground block text-xs">
                Primary Email
              </span>
              <p className="truncate text-[0.8125rem] font-medium">
                {member.email}
              </p>
            </div>
          </div>
          <a
            href={`mailto:${member.email}`}
            className="text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
          >
            Send email
          </a>
        </div>
      )}

      {/* Platform User Identity Card */}
      <div className="border-876-surface-border bg-muted/20 space-y-4 rounded-xl border p-4">
        <div className="border-876-surface-border flex items-center justify-between gap-3 border-b pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <User className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-[0.8125rem] font-medium">Platform User</h3>
              <p className="text-muted-foreground font-mono text-xs">
                {member.user_id}
              </p>
            </div>
          </div>
          <Link
            href={`/users/${member.user_id}`}
            className="border-876-surface-border bg-background hover:bg-muted/50 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium text-sky-600 transition-colors hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
          >
            <span>View Profile</span>
            <ExternalLink className="size-3" aria-hidden="true" />
          </Link>
        </div>

        {user && (
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
            {user.username && (
              <div className="space-y-0.5">
                <span className="text-muted-foreground">Username</span>
                <p className="text-[0.8125rem] font-medium">@{user.username}</p>
              </div>
            )}
            {user.platform_role && (
              <div className="space-y-0.5">
                <span className="text-muted-foreground">Platform Role</span>
                <p className="text-[0.8125rem] font-medium capitalize">
                  {user.platform_role}
                </p>
              </div>
            )}
            <div className="space-y-0.5">
              <span className="text-muted-foreground">Account Status</span>
              <p className="text-[0.8125rem] font-medium capitalize">
                {user.status}
              </p>
            </div>
            {user.created_at && (
              <div className="space-y-0.5">
                <span className="text-muted-foreground">Registered</span>
                <p className="text-[0.8125rem] font-medium">
                  {formatDate(user.created_at)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

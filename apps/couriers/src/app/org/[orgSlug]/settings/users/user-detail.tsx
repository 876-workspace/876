'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@876/ui/alert-dialog'
import { Alert, AlertDescription } from '@876/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Button } from '@876/ui/button'
import {
  Activity,
  CalendarDaysIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  EnvelopeIcon,
  KeyIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
  UserIcon,
  XIcon,
} from '@876/ui/icons'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@876/ui/tabs'

import { client } from '@/lib/client'
import type { TeamMemberRow, TeamRoleOption } from '@/types/team'

import { memberInitials } from './member-initials'
import { MemberStatusBadge } from './member-status-badge'
import { RoleNameBadge } from './role-name-badge'
import { UserPermissionsSummary } from './user-permissions-summary'

/** In-panel tab chrome matching RouteTabs line look. */
const detailTabTriggerClass =
  'group/tab relative h-auto flex-none rounded-none border-0 bg-transparent px-3.5 py-2.5 text-xs font-medium shadow-none ' +
  'text-muted-foreground hover:text-foreground ' +
  '!after:hidden ' +
  'data-active:!bg-transparent data-active:text-876-accent-fg data-active:!shadow-none ' +
  'dark:data-active:!bg-transparent dark:data-active:text-876-accent-fg flex items-center gap-1.5'

type Props = {
  row: TeamMemberRow
  roles: TeamRoleOption[]
  orgSlug: string
  onClose: () => void
}

export function UserDetail({ row, roles, orgSlug, onClose }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
  const [isPending, startTransition] = useTransition()

  function copyToClipboard(text: string, type: 'email' | 'id') {
    navigator.clipboard.writeText(text)
    if (type === 'email') {
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
    } else {
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    }
  }

  function update(params: { roleId?: string; status?: 'active' | 'inactive' }) {
    setError(null)
    startTransition(async () => {
      const result = await client.team.update(orgSlug, row.id, params)
      if (result.error) {
        setError(result.error.message)
        return
      }

      router.refresh()
    })
  }

  function remove() {
    setError(null)
    startTransition(async () => {
      const result = await client.team.delete(orgSlug, row.id)
      if (result.error) {
        setError(result.error.message)
        setRemoveOpen(false)
        return
      }

      setRemoveOpen(false)
      onClose()
      router.refresh()
    })
  }

  const role = roles.find((candidate) => candidate.id === row.roleId)
  const isActive = row.status === 'active'
  const createdDate = row.createdAt
    ? new Date(row.createdAt * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown'

  return (
    <section className="876-card divide-border min-w-0 divide-y overflow-hidden">
      {/* Header Banner & Profile Summary */}
      <header className="from-muted/40 via-card to-card bg-gradient-to-b p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-1 items-start gap-4">
            <Avatar
              size="lg"
              className="ring-border/60 size-14 shrink-0 ring-2"
            >
              {row.avatar ? <AvatarImage src={row.avatar} alt="" /> : null}
              <AvatarFallback className="text-base font-semibold">
                {memberInitials(row.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-foreground truncate text-lg font-semibold tracking-tight">
                  {row.name}
                </h2>
                <MemberStatusBadge status={row.status} />
                <RoleNameBadge
                  name={row.roleName}
                  systemKey={row.roleSystemKey}
                />
              </div>

              <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                {row.email ? (
                  <div className="flex min-w-0 items-center gap-1.5">
                    <EnvelopeIcon className="size-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{row.email}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(row.email!, 'email')}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy email"
                      aria-label="Copy email address"
                    >
                      {copiedEmail ? (
                        <CheckIcon className="size-3 text-emerald-500" />
                      ) : (
                        <ClipboardDocumentIcon className="size-3" />
                      )}
                    </button>
                  </div>
                ) : null}

                <div className="flex items-center gap-1.5">
                  <KeyIcon className="size-3.5 shrink-0 opacity-70" />
                  <span className="font-mono text-[11px]">{row.id}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(row.id, 'id')}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy member ID"
                    aria-label="Copy member ID"
                  >
                    {copiedId ? (
                      <CheckIcon className="size-3 text-emerald-500" />
                    ) : (
                      <ClipboardDocumentIcon className="size-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close user details"
            className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 shrink-0"
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="gap-0">
        <div className="bg-card/40 border-b px-5">
          <TabsList className="h-auto w-full justify-start gap-1 rounded-none !bg-transparent p-0">
            <TabsTrigger value="overview" className={detailTabTriggerClass}>
              <UserIcon className="size-3.5" />
              Overview
              <TabUnderline />
            </TabsTrigger>
            <TabsTrigger value="permissions" className={detailTabTriggerClass}>
              <ShieldCheckIcon className="size-3.5" />
              Permissions
              <TabUnderline />
            </TabsTrigger>
            <TabsTrigger value="activity" className={detailTabTriggerClass}>
              <Activity className="size-3.5" />
              Activity
              <TabUnderline />
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-0 space-y-5 p-5">
          {error ? (
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {/* Metadata Quick Cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border-876-surface-border bg-card/60 rounded-xl border p-3">
              <span className="text-muted-foreground block text-xs font-medium">
                Assigned Role
              </span>
              <span className="text-foreground mt-1 block text-sm font-semibold tracking-tight">
                {row.roleName}
              </span>
              <span className="text-muted-foreground mt-0.5 block text-[11px]">
                {row.roleSystemKey
                  ? `System (${row.roleSystemKey})`
                  : 'Custom role'}
              </span>
            </div>

            <div className="border-876-surface-border bg-card/60 rounded-xl border p-3">
              <span className="text-muted-foreground block text-xs font-medium">
                Account Status
              </span>
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={`size-2 rounded-full ${
                    isActive ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
                <span className="text-foreground text-sm font-semibold capitalize">
                  {row.status}
                </span>
              </div>
              <span className="text-muted-foreground mt-0.5 block text-[11px]">
                {isActive ? 'Full workspace access' : 'Access suspended'}
              </span>
            </div>

            <div className="border-876-surface-border bg-card/60 rounded-xl border p-3">
              <span className="text-muted-foreground block text-xs font-medium">
                Joined Date
              </span>
              <div className="mt-1 flex items-center gap-1">
                <CalendarDaysIcon className="text-muted-foreground size-3.5" />
                <span className="text-foreground text-sm font-semibold">
                  {createdDate}
                </span>
              </div>
              <span className="text-muted-foreground mt-0.5 block text-[11px]">
                Organization member
              </span>
            </div>
          </div>

          {/* Role & Status Controls */}
          <div className="border-876-surface-border bg-card/40 space-y-4 rounded-xl border p-4">
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Role & Access Management
            </h3>

            <div className="grid gap-4 sm:grid-cols-2 sm:items-center">
              <div>
                <label className="text-foreground block text-sm font-medium">
                  Role
                </label>
                <span className="text-muted-foreground block text-xs">
                  Select role permissions for this member.
                </span>
              </div>
              <Select
                value={row.roleId}
                disabled={isPending}
                onValueChange={(value) => value && update({ roleId: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}{' '}
                      {option.systemKey ? `(${option.systemKey})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 border-t pt-4 sm:grid-cols-2 sm:items-center">
              <div>
                <label className="text-foreground block text-sm font-medium">
                  Status
                </label>
                <span className="text-muted-foreground block text-xs">
                  {isActive
                    ? 'Deactivating suspends user access to org features.'
                    : 'Activating restores user access.'}
                </span>
              </div>
              <div className="flex justify-start sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    update({
                      status: isActive ? 'inactive' : 'active',
                    })
                  }
                >
                  {isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          </div>

          {/* Danger Zone Card */}
          <div className="border-destructive/20 bg-destructive/5 flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-destructive text-sm font-semibold">
                Remove from Organization
              </h3>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Revoke this user&apos;s access and remove them from Couriers.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={() => setRemoveOpen(true)}
              className="shrink-0"
            >
              Remove
            </Button>
          </div>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="mt-0 p-5">
          <UserPermissionsSummary role={role} />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-0 p-5">
          <ActivityTimeline row={row} createdDate={createdDate} />
        </TabsContent>
      </Tabs>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove user?</AlertDialogTitle>
            <AlertDialogDescription>
              {row.name} will lose access to this Couriers organization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={remove}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

function TabUnderline() {
  return (
    <span
      aria-hidden
      className="bg-876-accent-fg pointer-events-none absolute inset-x-0 bottom-0 h-0.5 opacity-0 transition-opacity group-aria-selected/tab:opacity-100"
    />
  )
}

function ActivityTimeline({
  row,
  createdDate,
}: {
  row: TeamMemberRow
  createdDate: string
}) {
  return (
    <div className="space-y-4">
      <div className="before:bg-border relative space-y-6 pl-6 before:absolute before:top-2 before:bottom-2 before:left-2.5 before:w-0.5">
        {/* Event 1: Joined */}
        <div className="relative flex flex-col gap-1">
          <span className="ring-background absolute top-1 -left-6 flex size-3.5 items-center justify-center rounded-full bg-emerald-500 ring-4" />
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground font-semibold">
              Joined Organization
            </span>
            <span className="text-muted-foreground font-mono">
              {createdDate}
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            {row.name} was added as a member with the{' '}
            <span className="text-foreground font-medium">{row.roleName}</span>{' '}
            role.
          </p>
        </div>

        {/* Event 2: Role Assigned */}
        <div className="relative flex flex-col gap-1">
          <span className="ring-background absolute top-1 -left-6 flex size-3.5 items-center justify-center rounded-full bg-sky-500 ring-4" />
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground font-semibold">
              Role Provisioned
            </span>
            <span className="text-muted-foreground font-mono">
              {createdDate}
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            Permissions provisioned based on system key{' '}
            <span className="text-foreground font-mono">
              {row.roleSystemKey ?? 'custom'}
            </span>
            .
          </p>
        </div>

        {/* Event 3: Current Status */}
        <div className="relative flex flex-col gap-1">
          <span
            className={`absolute top-1 -left-6 flex size-3.5 items-center justify-center rounded-full ${
              row.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
            } ring-background ring-4`}
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground font-semibold">
              Current Account Status
            </span>
            <span className="text-muted-foreground font-mono">Present</span>
          </div>
          <p className="text-muted-foreground text-xs">
            Account status is currently{' '}
            <span className="text-foreground font-semibold capitalize">
              {row.status}
            </span>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

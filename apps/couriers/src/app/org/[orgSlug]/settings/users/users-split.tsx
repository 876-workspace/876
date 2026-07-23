'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
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
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { DataTable } from '@876/ui/data-table'
import { Activity, TriangleAlertIcon, XIcon } from '@876/ui/icons'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@876/ui/tabs'

import { client } from '@/lib/client'
import {
  PERMISSION_CATALOG,
  permissionKey,
  resolveRolePermissions,
} from '@/lib/permissions'
import type { TeamMemberRow, TeamRoleOption } from '@/types/team'

type Props = {
  rows: TeamMemberRow[]
  roles: TeamRoleOption[]
  selectedId?: string
  orgSlug: string
}

/** In-panel tab chrome matching RouteTabs line look. */
const detailTabTriggerClass =
  'group/tab relative h-auto flex-none rounded-none border-0 bg-transparent px-3 py-2.5 text-[0.8125rem] font-medium shadow-none ' +
  'text-muted-foreground hover:text-foreground ' +
  '!after:hidden ' +
  'data-active:!bg-transparent data-active:text-876-accent-fg data-active:!shadow-none ' +
  'dark:data-active:!bg-transparent dark:data-active:text-876-accent-fg'

const userColumn: ColumnDef<TeamMemberRow, unknown> = {
  id: 'user',
  header: 'User',
  cell: ({ row }) => <UserCell row={row.original} />,
}

const fullColumns: ColumnDef<TeamMemberRow, unknown>[] = [
  userColumn,
  {
    id: 'role',
    header: 'Role',
    cell: ({ row }) => <span className="text-sm">{row.original.roleName}</span>,
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge
        variant={row.original.status === 'active' ? 'success' : 'secondary'}
      >
        {row.original.status === 'active' ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
]

export function UsersSplit({ rows, roles, selectedId, orgSlug }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selected = rows.find((row) => row.id === selectedId)

  function selectUser(id?: string) {
    const next = new URLSearchParams(searchParams.toString())

    if (id) next.set('user', id)
    else next.delete('user')

    const query = next.toString()
    router.push(query ? `?${query}` : `/org/${orgSlug}/settings/users`)
  }

  if (!selected)
    return (
      <div className="876-card overflow-hidden">
        <DataTable
          columns={fullColumns}
          data={rows}
          onRowClick={(row) => selectUser(row.id)}
          emptyState={
            <div className="text-muted-foreground py-6 text-center text-sm">
              No users.
            </div>
          }
        />
      </div>
    )

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(260px,320px)_1fr] lg:items-start">
      <div className="876-card self-start overflow-hidden">
        <DataTable
          columns={[userColumn]}
          data={rows}
          onRowClick={(row) => selectUser(row.id)}
        />
      </div>
      <UserDetail
        key={selected.id}
        row={selected}
        roles={roles}
        orgSlug={orgSlug}
        onClose={() => selectUser()}
      />
    </div>
  )
}

function UserCell({ row }: { row: TeamMemberRow }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar size="sm">
        {row.avatar ? <AvatarImage src={row.avatar} alt="" /> : null}
        <AvatarFallback>{initials(row.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="truncate font-medium">{row.name}</div>
        <div className="text-muted-foreground truncate text-xs">
          {row.email ?? row.userId}
        </div>
      </div>
    </div>
  )
}

function UserDetail({
  row,
  roles,
  orgSlug,
  onClose,
}: {
  row: TeamMemberRow
  roles: TeamRoleOption[]
  orgSlug: string
  onClose: () => void
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

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

  return (
    <section className="876-card min-w-0 overflow-hidden">
      <header className="flex items-start gap-3 px-5 pt-5 pb-2">
        <Avatar size="lg" className="size-12 shrink-0">
          {row.avatar ? <AvatarImage src={row.avatar} alt="" /> : null}
          <AvatarFallback>{initials(row.name)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold tracking-tight">
              {row.name}
            </h2>
            <Badge variant={isActive ? 'success' : 'secondary'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-0.5 truncate text-sm">
            {row.email ?? 'No email available'}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close user details"
          className="text-muted-foreground hover:text-foreground -mt-0.5 shrink-0"
        >
          <XIcon className="size-4" />
        </Button>
      </header>

      <Tabs defaultValue="overview" className="gap-0">
        <div className="px-5">
          <TabsList className="h-auto w-full justify-start gap-1 rounded-none !bg-transparent p-0">
            <TabsTrigger value="overview" className={detailTabTriggerClass}>
              Overview
              <TabUnderline />
            </TabsTrigger>
            <TabsTrigger value="permissions" className={detailTabTriggerClass}>
              Permissions
              <TabUnderline />
            </TabsTrigger>
            <TabsTrigger value="activity" className={detailTabTriggerClass}>
              Activity
              <TabUnderline />
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0 space-y-5 p-5">
          {error ? (
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-[6.5rem_1fr] sm:items-center sm:gap-4">
              <span className="text-muted-foreground text-sm">Role</span>
              <Select
                value={row.roleId}
                disabled={isPending}
                onValueChange={(value) => value && update({ roleId: value })}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 sm:grid-cols-[6.5rem_1fr] sm:items-center sm:gap-4">
              <span className="text-muted-foreground text-sm">Status</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                className="w-fit"
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

          <div className="border-t pt-4">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={() => setRemoveOpen(true)}
            >
              Remove
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="mt-0 p-5">
          <PermissionsSummary role={role} />
        </TabsContent>

        <TabsContent value="activity" className="mt-0 p-5">
          <ActivityEmpty />
        </TabsContent>
      </Tabs>

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

function ActivityEmpty() {
  return (
    <div className="border-876-surface-border flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
      <span className="text-muted-foreground bg-muted/40 mb-3 flex size-10 items-center justify-center rounded-xl border">
        <Activity aria-hidden="true" className="size-5" />
      </span>
      <p className="text-sm font-medium">No activity</p>
    </div>
  )
}

function PermissionsSummary({ role }: { role?: TeamRoleOption }) {
  if (!role)
    return (
      <p className="text-muted-foreground text-sm">
        This role is no longer available.
      </p>
    )

  const granted = new Set(resolveRolePermissions(role))

  return (
    <div className="divide-border divide-y">
      {PERMISSION_CATALOG.map((module) => {
        const labels = [
          ...module.actions
            .filter((action) => granted.has(permissionKey(module.key, action)))
            .map((action) =>
              action === 'view'
                ? 'View'
                : action.charAt(0).toUpperCase() + action.slice(1)
            ),
          ...module.extras
            .filter((extra) =>
              granted.has(permissionKey(module.key, extra.key))
            )
            .map((extra) => extra.label),
        ]

        return (
          <div
            key={module.key}
            className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[8rem_1fr] sm:items-center sm:gap-4"
          >
            <span className="text-sm font-medium">{module.label}</span>
            <span className="text-muted-foreground text-sm">
              {labels.length > 0 ? labels.join(', ') : 'No access'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

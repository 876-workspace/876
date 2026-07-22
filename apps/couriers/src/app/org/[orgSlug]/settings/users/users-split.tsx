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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@876/ui/avatar'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { DataTable } from '@876/ui/data-table'
import { XIcon } from '@876/ui/icons'
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
    cell: ({ row }) => row.original.roleName,
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
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,340px)_1fr]">
      <div className="876-card self-start overflow-hidden">
        <DataTable
          columns={[userColumn]}
          data={rows}
          onRowClick={(row) => selectUser(row.id)}
          rowClassName={(row) =>
            row.id === selected.id ? 'bg-muted/70' : ''
          }
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

  return (
    <section className="876-card min-w-0 overflow-hidden">
      <header className="flex items-center gap-4 border-b px-5 py-4">
        <Avatar size="lg">
          {row.avatar ? <AvatarImage src={row.avatar} alt="" /> : null}
          <AvatarFallback>{initials(row.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">{row.name}</h2>
          <div className="text-muted-foreground truncate text-sm">
            {row.email ?? 'No email available'}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close user details"
        >
          <XIcon className="size-4" />
        </Button>
      </header>

      <Tabs defaultValue="overview" className="p-5">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-5 space-y-5">
          {error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-[140px_1fr] sm:items-center">
            <span className="text-muted-foreground text-sm">Role</span>
            <Select
              value={row.roleId}
              disabled={isPending}
              onValueChange={(value) => value && update({ roleId: value })}
            >
              <SelectTrigger className="w-full sm:max-w-xs">
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
          <div className="grid gap-2 sm:grid-cols-[140px_1fr] sm:items-center">
            <span className="text-muted-foreground text-sm">Status</span>
            <div className="flex items-center gap-3">
              <Badge variant={row.status === 'active' ? 'success' : 'secondary'}>
                {row.status === 'active' ? 'Active' : 'Inactive'}
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() =>
                  update({
                    status: row.status === 'active' ? 'inactive' : 'active',
                  })
                }
              >
                {row.status === 'active' ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          </div>
          <DetailRow label="Joined">{formatDate(row.createdAt)}</DetailRow>
          <DetailRow label="User ID">
            <code className="text-muted-foreground break-all text-xs">
              {row.userId}
            </code>
          </DetailRow>
          <div className="border-t pt-5">
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={() => setRemoveOpen(true)}
            >
              Remove
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="permissions" className="mt-5">
          <PermissionsSummary role={role} />
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

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_1fr] sm:items-center">
      <span className="text-muted-foreground text-sm">{label}</span>
      <div className="text-sm">{children}</div>
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
    <div className="divide-y">
      {PERMISSION_CATALOG.map((module) => {
        const labels = [
          ...module.actions
            .filter((action) =>
              granted.has(permissionKey(module.key, action))
            )
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
            className="grid gap-1 py-3 sm:grid-cols-[140px_1fr]"
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

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

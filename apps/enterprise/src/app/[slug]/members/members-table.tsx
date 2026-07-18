'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import type { AdminOrgMember } from '@876/admin'
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
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Badge } from '@876/ui/badge'
import { Button, buttonVariants } from '@876/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@876/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { MoreHorizontalIcon } from '@876/ui/icons'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@876/ui/data-table'

import { client } from '@/lib/client'

type RoleOption = { name: string; display_name: string }

export function MembersTable({
  slug,
  members,
  roles,
  canManage,
  callerMembershipId,
  callerIsOwner,
}: {
  slug: string
  members: AdminOrgMember[]
  roles: RoleOption[]
  canManage: boolean
  callerMembershipId: string
  callerIsOwner: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [roleTarget, setRoleTarget] = useState<AdminOrgMember | null>(null)
  const [selectedRole, setSelectedRole] = useState('')
  const [removeTarget, setRemoveTarget] = useState<AdminOrgMember | null>(null)

  const roleDisplayNames = new Map(
    roles.map((role) => [role.name, role.display_name])
  )

  function openRoleDialog(member: AdminOrgMember) {
    setSelectedRole(member.role)
    setRoleTarget(member)
  }

  function saveRole() {
    if (!roleTarget || !selectedRole || isPending) return

    startTransition(async () => {
      const { error } = await client.orgs.members.update(slug, roleTarget.id, {
        role: selectedRole,
      })
      if (error) {
        toast.error(error.message)
        return
      }

      setRoleTarget(null)
      toast.success('Member role updated.')
      router.refresh()
    })
  }

  function removeMember() {
    if (!removeTarget || isPending) return

    startTransition(async () => {
      const { error } = await client.orgs.members.delete(slug, removeTarget.id)
      if (error) {
        toast.error(error.message)
        return
      }

      setRemoveTarget(null)
      toast.success('Member removed.')
      router.refresh()
    })
  }

  // Owner-role transitions are owner-only; hide those actions from non-owners.
  function canActOn(member: AdminOrgMember): boolean {
    if (!canManage || member.id === callerMembershipId) return false
    if (member.role === 'owner' && !callerIsOwner) return false

    return true
  }

  const assignableRoles = roles.filter(
    (role) => callerIsOwner || role.name !== 'owner'
  )

  const columns: ColumnDef<AdminOrgMember, unknown>[] = [
    {
      id: 'member',
      header: 'Member',
      cell: ({ row }) => {
        const member = row.original
        return (
          <div className="flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarImage src={member.avatar ?? undefined} />
              <AvatarFallback>{getInitials(member) || '?'}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {getDisplayName(member)}
              </div>
              <div className="text-muted-foreground truncate text-xs">
                {member.email}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      id: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const member = row.original
        return (
          <Badge variant="outline">
            {roleDisplayNames.get(member.role) ?? member.role}
          </Badge>
        )
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const member = row.original
        return (
          <Badge variant={member.status === 'active' ? 'success' : 'warning'}>
            {member.status}
          </Badge>
        )
      },
    },
    {
      id: 'joined',
      header: 'Joined',
      cell: ({ row }) => {
        const member = row.original
        return (
          <span className="text-muted-foreground text-sm">
            {formatJoinedDate(member.created_at)}
          </span>
        )
      },
    },
  ]

  if (canManage) {
    columns.push({
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const member = row.original
        if (!canActOn(member)) return null

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Member actions"
                className={buttonVariants({
                  variant: 'outline',
                  size: 'icon-sm',
                })}
              >
                <MoreHorizontalIcon className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuItem onClick={() => openRoleDialog(member)}>
                  Change role
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setRemoveTarget(member)}
                >
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    })
  }

  return (
    <>
      <div className="876-card overflow-hidden">
        <DataTable columns={columns} data={members} />
      </div>

      <Dialog
        open={roleTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRoleTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="member-role">
              Role for {roleTarget ? getDisplayName(roleTarget) : ''}
            </Label>
            <NativeSelect
              id="member-role"
              className="w-full"
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value)}
            >
              {assignableRoles.map((role) => (
                <NativeSelectOption key={role.name} value={role.name}>
                  {role.display_name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRoleTarget(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={saveRole} disabled={isPending}>
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget ? getDisplayName(removeTarget) : 'This member'} will
              lose access to the organization and its apps.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={removeMember}
              disabled={isPending}
            >
              {isPending ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function getDisplayName(member: {
  first_name: string | null
  last_name: string | null
  email: string | null
}): string {
  const name = [member.first_name, member.last_name].filter(Boolean).join(' ')

  return name || member.email || 'Unknown member'
}

function getInitials(member: {
  first_name: string | null
  last_name: string | null
  email: string | null
}): string {
  const initials = [member.first_name, member.last_name]
    .filter(Boolean)
    .map((part) => part!.charAt(0).toUpperCase())
    .join('')

  return initials || (member.email?.charAt(0).toUpperCase() ?? '')
}

function formatJoinedDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

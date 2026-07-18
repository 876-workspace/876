'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { client } from '@/lib/client'
import type { MemberView, RoleResource } from '@/types/access'

export function MembersTable({
  members,
  roles,
  currentUserId,
  canManage,
  canGrantOwner,
}: {
  members: MemberView[]
  roles: RoleResource[]
  currentUserId: string
  canManage: boolean
  canGrantOwner: boolean
}) {
  return (
    <div className="876-card overflow-x-auto">
      <Table>
        <TableHeader className="876-header-row">
          <TableRow>
            <TableHead className="px-5 py-3.5">Member</TableHead>
            <TableHead className="px-5 py-3.5">Organization role</TableHead>
            <TableHead className="px-5 py-3.5">Billing role</TableHead>
            <TableHead className="px-5 py-3.5">Access</TableHead>
            {canManage ? (
              <TableHead className="px-5 py-3.5 text-right">Action</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <MemberRow
              key={member.userId}
              member={member}
              roles={roles}
              currentUserId={currentUserId}
              canManage={canManage}
              canGrantOwner={canGrantOwner}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function MemberRow({
  member,
  roles,
  currentUserId,
  canManage,
  canGrantOwner,
}: {
  member: MemberView
  roles: RoleResource[]
  currentUserId: string
  canManage: boolean
  canGrantOwner: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [roleId, setRoleId] = useState(member.roleId)
  const [status, setStatus] = useState(member.status)
  const [feedback, setFeedback] = useState<string | null>(null)
  const displayName =
    [member.firstName, member.lastName].filter(Boolean).join(' ') ||
    member.email ||
    member.userId
  const protectedMember =
    member.organizationRole === 'owner' || member.userId === currentUserId
  const changed = roleId !== member.roleId || status !== member.status
  const availableRoles = roles.filter(
    (role) =>
      role.slug !== 'owner' || canGrantOwner || role.id === member.roleId
  )

  function save() {
    setFeedback(null)
    startTransition(async () => {
      const result = await client.members.update(member.userId, {
        roleId,
        status,
      })
      if (result.error) {
        setFeedback(result.error.message)
        return
      }
      setFeedback('Saved')
      router.refresh()
    })
  }

  return (
    <TableRow>
      <TableCell className="min-w-64 px-5 py-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            {member.avatar ? <AvatarImage src={member.avatar} alt="" /> : null}
            <AvatarFallback className="text-xs">
              {initials(member)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="text-muted-foreground truncate text-xs">
              {member.email || member.userId}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="px-5 py-4">
        <Badge variant="outline" className="capitalize">
          {member.organizationRole}
        </Badge>
      </TableCell>
      <TableCell className="min-w-52 px-5 py-4">
        {canManage && !protectedMember ? (
          <NativeSelect
            aria-label={`Billing role for ${displayName}`}
            value={roleId}
            onChange={(event) => setRoleId(event.target.value)}
            disabled={isPending}
          >
            {availableRoles.map((role) => (
              <NativeSelectOption key={role.id} value={role.id}>
                {role.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        ) : (
          <div>
            <p className="text-sm font-medium">{member.roleName}</p>
            {!member.explicitGrant ? (
              <p className="text-muted-foreground text-xs">
                Default assignment
              </p>
            ) : null}
          </div>
        )}
      </TableCell>
      <TableCell className="min-w-36 px-5 py-4">
        {canManage && !protectedMember ? (
          <NativeSelect
            aria-label={`Billing status for ${displayName}`}
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as 'ACTIVE' | 'SUSPENDED')
            }
            disabled={isPending}
          >
            <NativeSelectOption value="ACTIVE">Active</NativeSelectOption>
            <NativeSelectOption value="SUSPENDED">Suspended</NativeSelectOption>
          </NativeSelect>
        ) : (
          <Badge variant={member.status === 'ACTIVE' ? 'secondary' : 'outline'}>
            {member.status === 'ACTIVE' ? 'Active' : 'Suspended'}
          </Badge>
        )}
      </TableCell>
      {canManage ? (
        <TableCell className="px-5 py-4 text-right">
          {protectedMember ? (
            <span className="text-muted-foreground text-xs">
              {member.userId === currentUserId ? 'Current user' : 'Protected'}
            </span>
          ) : (
            <div className="flex items-center justify-end gap-2">
              {feedback ? (
                <span
                  className={
                    feedback === 'Saved'
                      ? 'text-muted-foreground text-xs'
                      : 'text-destructive max-w-44 text-xs'
                  }
                >
                  {feedback}
                </span>
              ) : null}
              <Button size="sm" onClick={save} disabled={isPending || !changed}>
                {isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          )}
        </TableCell>
      ) : null}
    </TableRow>
  )
}

function initials(member: MemberView): string {
  return (
    [member.firstName[0], member.lastName[0]]
      .filter(Boolean)
      .join('')
      .toUpperCase() ||
    member.email[0]?.toUpperCase() ||
    '?'
  )
}

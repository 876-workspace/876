'use client'

import { useState, useTransition } from 'react'
import { AppError } from '@876/ui/app-error'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { MoreHorizontalIcon } from '@876/ui/icons'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import type {
  FinanceActionResult,
  FinanceMemberSummary,
  FinanceRoleSummary,
} from './types'

type Props = {
  members: FinanceMemberSummary[]
  roles: FinanceRoleSummary[]
  canManage: boolean
  onChangeRole: (
    memberId: string,
    roleId: string
  ) => Promise<FinanceActionResult>
  onChangeStatus: (
    memberId: string,
    status: FinanceMemberSummary['status']
  ) => Promise<FinanceActionResult>
  /** Required to offer the destructive Remove action in the row menu. */
  onRemove?: (memberId: string) => Promise<FinanceActionResult>
}

export function MembersTablePanel({
  members,
  roles,
  canManage,
  onChangeRole,
  onChangeStatus,
  onRemove,
}: Props) {
  const [error, setError] = useState<FinanceActionResult['error']>(null)
  return (
    <div className="space-y-3">
      {error ? <AppError error={error} variant="inline" showCode /> : null}
      <div className="876-card overflow-x-auto">
        <Table>
          <TableHeader className="876-header-row">
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              {canManage ? (
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                roles={roles}
                canManage={canManage}
                onError={setError}
                onChangeRole={onChangeRole}
                onChangeStatus={onChangeStatus}
                onRemove={onRemove}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function MemberRow({
  member,
  roles,
  canManage,
  onError,
  onChangeRole,
  onChangeStatus,
  onRemove,
}: Omit<Props, 'members'> & {
  member: FinanceMemberSummary
  onError: (error: FinanceActionResult['error']) => void
}) {
  const [pending, startTransition] = useTransition()
  function run(action: () => Promise<FinanceActionResult>) {
    onError(null)
    startTransition(async () => {
      const result = await action()
      if (result.error) onError(result.error)
    })
  }
  const initials =
    member.name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ||
    member.email[0]?.toUpperCase() ||
    '?'
  return (
    <TableRow>
      <TableCell className="min-w-56">
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            {member.avatarUrl ? (
              <AvatarImage src={member.avatarUrl} alt="" />
            ) : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate font-medium">{member.name}</div>
            <div className="text-muted-foreground truncate text-xs">
              {member.email}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {canManage ? (
          <NativeSelect
            aria-label={`Role for ${member.name}`}
            value={member.roleId}
            disabled={pending}
            onChange={(event) =>
              run(() => onChangeRole(member.id, event.target.value))
            }
          >
            {roles.map((role) => (
              <NativeSelectOption key={role.id} value={role.id}>
                {role.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        ) : (
          <span>{member.roleName}</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={member.status === 'ACTIVE' ? 'secondary' : 'outline'}>
          {member.status === 'ACTIVE' ? 'Active' : 'Suspended'}
        </Badge>
      </TableCell>
      {canManage ? (
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  disabled={pending}
                  aria-label={`Actions for ${member.name}`}
                />
              }
            >
              <MoreHorizontalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  run(() =>
                    onChangeStatus(
                      member.id,
                      member.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
                    )
                  )
                }
              >
                {member.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
              </DropdownMenuItem>
              {onRemove ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => run(() => onRemove(member.id))}
                  >
                    Remove
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      ) : null}
    </TableRow>
  )
}

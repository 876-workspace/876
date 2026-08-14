'use client'

import { Badge } from '@876/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import type { InviteView } from '@/types/access'

import { RevokeInviteDialog } from './revoke-invite-dialog'

export function PendingInvites({
  invites,
  canManage,
}: {
  invites: InviteView[]
  canManage: boolean
}) {
  if (invites.length === 0) return null

  return (
    <div className="876-card overflow-x-auto">
      <Table>
        <TableHeader className="876-header-row">
          <TableRow>
            <TableHead className="px-5 py-3.5">Email</TableHead>
            <TableHead className="px-5 py-3.5">Role</TableHead>
            <TableHead className="px-5 py-3.5">Status</TableHead>
            <TableHead className="px-5 py-3.5">Expires</TableHead>
            {canManage ? (
              <TableHead className="px-5 py-3.5 text-right">Action</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {invites.map((invite) => (
            <TableRow key={invite.id}>
              <TableCell className="px-5 py-4 font-medium">
                {invite.email}
              </TableCell>
              <TableCell className="px-5 py-4">{invite.role}</TableCell>
              <TableCell className="px-5 py-4">
                <Badge variant="outline" className="capitalize">
                  {invite.status}
                </Badge>
              </TableCell>
              <TableCell className="px-5 py-4">
                {new Date(invite.expiresAt * 1000).toLocaleDateString()}
              </TableCell>
              {canManage ? (
                <TableCell className="px-5 py-4 text-right">
                  <RevokeInviteDialog
                    inviteId={invite.id}
                    email={invite.email}
                  />
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

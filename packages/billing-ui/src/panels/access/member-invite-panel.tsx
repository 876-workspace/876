'use client'

import { useState, useTransition } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@876/ui/alert-dialog'
import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import {
  DetailCard,
  DetailCardBody,
  DetailCardFooter,
  DetailCardHeader,
  DetailCardSection,
} from '@876/ui/detail-card'
import { EmailInput } from '@876/ui/email-input'
import { FormRow } from '@876/ui/form-row'
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
  FinanceInviteSummary,
  FinanceRoleSummary,
} from './types'

type Props = {
  roles: FinanceRoleSummary[]
  invites: FinanceInviteSummary[]
  canManage: boolean
  closeHref?: string
  onInvite: (params: {
    email: string
    roleId: string
  }) => Promise<FinanceActionResult>
  onRevoke: (inviteId: string) => Promise<FinanceActionResult>
}

export function MemberInvitePanel({
  roles,
  invites,
  canManage,
  closeHref = '/settings/users',
  onInvite,
  onRevoke,
}: Props) {
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState(roles[0]?.id ?? '')
  const [error, setError] = useState<FinanceActionResult['error']>(null)
  const [pending, startTransition] = useTransition()
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const effectiveRoleId = roleId || roles[0]?.id || ''
  const selectedRole = roles.find((role) => role.id === effectiveRoleId)

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canManage || !validEmail || !effectiveRoleId) return
    setError(null)
    startTransition(async () => {
      const result = await onInvite({
        email: email.trim(),
        roleId: effectiveRoleId,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setEmail('')
      }
    })
  }

  function revoke(inviteId: string) {
    setError(null)
    startTransition(async () => {
      const result = await onRevoke(inviteId)
      if (result.error) setError(result.error)
    })
  }

  return (
    <DetailCard aria-label="Invite member">
      <DetailCardHeader
        title="Invite member"
        closeHref={closeHref}
        closeLabel="Close invite form"
      />
      <form
        id="member-invite-form"
        onSubmit={submit}
        noValidate
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <DetailCardBody className="space-y-6">
          {error ? <AppError error={error} variant="form" showCode /> : null}
          <div className="space-y-4">
            <FormRow htmlFor="member-invite-email" label="Email" required>
              <EmailInput
                id="member-invite-email"
                placeholder="colleague@example.com"
                autoComplete="email"
                value={email}
                disabled={!canManage || pending}
                onChange={(event) => setEmail(event.target.value)}
              />
            </FormRow>
            <FormRow
              htmlFor="member-invite-role"
              label="Role"
              required
              hint={selectedRole?.description || undefined}
            >
              <NativeSelect
                id="member-invite-role"
                value={effectiveRoleId}
                disabled={!canManage || pending || roles.length === 0}
                onChange={(event) => setRoleId(event.target.value)}
              >
                {roles.map((role) => (
                  <NativeSelectOption key={role.id} value={role.id}>
                    {role.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FormRow>
          </div>

          {invites.length > 0 ? (
            <DetailCardSection title="Pending invites">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="876-header-row">
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Expires</TableHead>
                      {canManage ? (
                        <TableHead className="text-right">Action</TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell className="font-medium">
                          {invite.email}
                        </TableCell>
                        <TableCell>{invite.roleName}</TableCell>
                        <TableCell>
                          {invite.expiresAt === null
                            ? 'Never'
                            : new Date(
                                invite.expiresAt * 1000
                              ).toLocaleDateString()}
                        </TableCell>
                        {canManage ? (
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger
                                render={
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={pending}
                                  />
                                }
                              >
                                Revoke
                              </AlertDialogTrigger>
                              <AlertDialogContent size="sm">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Revoke this invite?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {invite.email} will no longer be able to
                                    join.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel disabled={pending}>
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    variant="destructive"
                                    disabled={pending}
                                    onClick={() => revoke(invite.id)}
                                  >
                                    Revoke
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </DetailCardSection>
          ) : null}
        </DetailCardBody>
        <DetailCardFooter>
          <Button
            type="submit"
            variant="info"
            disabled={!canManage || pending || !validEmail || !effectiveRoleId}
          >
            {pending ? 'Sending…' : 'Send invite'}
          </Button>
        </DetailCardFooter>
      </form>
    </DetailCard>
  )
}

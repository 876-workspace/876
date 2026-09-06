'use client'

import { useState, useTransition, type ReactNode } from 'react'
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
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import {
  DetailCard,
  DetailCardBody,
  DetailCardFooter,
  DetailCardHeader,
  DetailCardIdBar,
  DetailCardSection,
  DetailCardSectionTitle,
} from '@876/ui/detail-card'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { Textarea } from '@876/ui/textarea'

import { mergePermissions, partitionPermissions } from './permission-surface'
import { PermissionMatrixPanel } from './permission-matrix-panel'
import type {
  FinanceActionResult,
  FinancePermissionKey,
  FinancePermissionSurface,
  FinanceRoleSummary,
} from './types'

type Props = {
  role: FinanceRoleSummary
  surface: FinancePermissionSurface
  canManage: boolean
  closeHref: string
  /** Host-owned member list content; omitted when the host has no roster data. */
  members?: ReactNode
  onSave: (params: {
    name: string
    description: string
    permissions: string[]
  }) => Promise<FinanceActionResult>
  onDelete: () => Promise<FinanceActionResult>
}

export function RoleCardPanel({
  role,
  surface,
  canManage,
  closeHref,
  members,
  onSave,
  onDelete,
}: Props) {
  const editable = canManage && !role.isSystem
  const initial = partitionPermissions(role, surface)
  const [name, setName] = useState(role.name)
  const [description, setDescription] = useState(role.description)
  const [permissions, setPermissions] = useState<FinancePermissionKey[]>(
    initial.editable
  )
  const [error, setError] = useState<FinanceActionResult['error']>(null)
  const [saving, startSaving] = useTransition()
  const [deleting, startDeleting] = useTransition()

  function save() {
    if (!editable || !name.trim()) return
    setError(null)
    startSaving(async () => {
      const result = await onSave({
        name: name.trim(),
        description: description.trim(),
        permissions: mergePermissions(permissions, initial.external),
      })
      if (result.error) setError(result.error)
    })
  }

  function remove() {
    if (!editable || role.memberCount > 0) return
    setError(null)
    startDeleting(async () => {
      const result = await onDelete()
      if (result.error) setError(result.error)
    })
  }

  return (
    <DetailCard aria-label={`Role details: ${role.name}`}>
      <DetailCardHeader
        title={role.name}
        meta={
          <>
            <Badge variant={role.isSystem ? 'outline' : 'secondary'}>
              {role.isSystem ? 'System' : 'Custom'}
            </Badge>
            {role.isDefault ? <Badge variant="outline">Default</Badge> : null}
          </>
        }
        closeHref={closeHref}
        closeLabel="Close role details"
      />
      <DetailCardBody className="space-y-6">
        {error ? <AppError error={error} variant="form" showCode /> : null}
        <div className="space-y-4">
          <FormRow htmlFor="role-name" label="Name" required>
            <Input
              id="role-name"
              value={name}
              disabled={!editable}
              onChange={(event) => setName(event.target.value)}
            />
          </FormRow>
          <FormRow htmlFor="role-description" label="Description">
            <Textarea
              id="role-description"
              value={description}
              disabled={!editable}
              onChange={(event) => setDescription(event.target.value)}
            />
          </FormRow>
        </div>
        {role.isSystem ? (
          <p className="text-muted-foreground text-xs">
            System roles are read-only.
          </p>
        ) : null}
        <section aria-labelledby="role-permissions" className="space-y-3">
          <h3 id="role-permissions" className="text-sm font-semibold">
            Permissions
          </h3>
          <PermissionMatrixPanel
            surface={surface}
            selected={permissions}
            rolePermissions={role.permissions}
            disabled={!editable}
            onChange={setPermissions}
          />
        </section>
        {members ? (
          <DetailCardSection>
            <DetailCardSectionTitle>Members</DetailCardSectionTitle>
            {members}
          </DetailCardSection>
        ) : null}
      </DetailCardBody>
      {editable ? (
        <DetailCardFooter>
          {role.memberCount > 0 ? (
            <span className="text-muted-foreground mr-auto text-xs">
              Reassign {role.memberCount} member
              {role.memberCount === 1 ? '' : 's'} before deletion.
            </span>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={saving || deleting}
                  />
                }
              >
                Delete
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this role?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={deleting}
                    onClick={remove}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button
            type="button"
            variant="info"
            disabled={saving || deleting || !name.trim()}
            onClick={save}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DetailCardFooter>
      ) : null}
      <DetailCardIdBar>{role.id}</DetailCardIdBar>
    </DetailCard>
  )
}

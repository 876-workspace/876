'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'
import { togglePermission } from '@/lib/permissions'
import type { Permission, RoleResource } from '@/types/access'

import { PermissionPicker } from './billing-permission-picker'

export function RoleEditor({
  role,
  canManage,
}: {
  role: RoleResource
  canManage: boolean
}) {
  const router = useRouter()
  const [isSaving, startSaving] = useTransition()
  const [isDeleting, startDeleting] = useTransition()
  const [name, setName] = useState(role.name)
  const [description, setDescription] = useState(role.description)
  const [permissions, setPermissions] = useState<Set<Permission>>(
    new Set(role.permissions)
  )
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error'
    message: string
  } | null>(null)
  const editable = canManage && !role.isSystem

  function save() {
    if (!editable) return
    setFeedback(null)
    startSaving(async () => {
      const result = await client.roles.update(role.id, {
        name,
        description: description.trim() || null,
        permissions: [...permissions],
      })
      if (result.error) {
        setFeedback({ tone: 'error', message: result.error.message })
        return
      }
      setFeedback({ tone: 'success', message: 'Role saved.' })
      router.refresh()
    })
  }

  function remove() {
    if (!editable || role.memberCount > 0) return
    if (!window.confirm(`Delete the ${role.name} role? This cannot be undone.`))
      return

    setFeedback(null)
    startDeleting(async () => {
      const result = await client.roles.delete(role.id)
      if (result.error) {
        setFeedback({ tone: 'error', message: result.error.message })
        return
      }
      router.push('/settings/roles')
      router.refresh()
    })
  }

  return (
    <div className="space-y-7">
      <section>
        <h2 className="876-section-title mb-3">Role details</h2>
        <div className="876-card grid max-w-2xl gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="billing-role-edit-name">Name</Label>
            <Input
              id="billing-role-edit-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!editable}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing-role-edit-slug">Identifier</Label>
            <Input id="billing-role-edit-slug" value={role.slug} disabled />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="billing-role-edit-description">Description</Label>
            <Textarea
              id="billing-role-edit-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              disabled={!editable}
            />
          </div>
          {role.isSystem ? (
            <p className="text-muted-foreground text-xs sm:col-span-2">
              System roles provide stable recovery and default behavior. Create
              a custom role when you need a different permission set.
            </p>
          ) : null}
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="876-section-title">Permissions</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {editable
              ? 'Manage implies View, and Billing access cannot be removed.'
              : 'This role’s effective permission set.'}
          </p>
        </div>
        <PermissionPicker
          selected={permissions}
          disabled={!editable}
          onToggle={(permission) =>
            setPermissions((current) => togglePermission(current, permission))
          }
        />
      </section>

      {feedback ? (
        <p
          className={
            feedback.tone === 'error'
              ? 'text-destructive text-sm'
              : 'text-muted-foreground text-sm'
          }
        >
          {feedback.message}
        </p>
      ) : null}

      {editable ? (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={save}
            disabled={isSaving || isDeleting || !name.trim()}
          >
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
          <Button
            variant="destructive"
            onClick={remove}
            disabled={isSaving || isDeleting || role.memberCount > 0}
          >
            {isDeleting ? 'Deleting…' : 'Delete role'}
          </Button>
          {role.memberCount > 0 ? (
            <span className="text-muted-foreground self-center text-xs">
              Reassign {role.memberCount} member
              {role.memberCount === 1 ? '' : 's'} before deletion.
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

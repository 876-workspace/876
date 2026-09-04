'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'

import { AnalyticsEvent } from '@/lib/analytics/events'
import { track } from '@/lib/analytics/track'
import { useConsoleUser } from '@/stores/user'
import { client } from '@/lib/client'
import { PERMISSION_GROUPS } from '@/lib/permissions'
import { PermissionGroupPicker } from './permission-group-picker'

type Props = {
  roleName: string
  displayName: string
  description: string | null
  currentPermissions: string[]
  isSystem: boolean
}

export function PermissionEditor({
  roleName,
  displayName: initialDisplayName,
  description: initialDescription,
  currentPermissions,
  isSystem,
}: Props) {
  const router = useRouter()
  const actor = useConsoleUser()
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [description, setDescription] = useState(initialDescription ?? '')
  const [selected, setSelected] = useState<Set<string>>(
    new Set(currentPermissions)
  )
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [isSaving, startSave] = useTransition()
  const [isDeleting, startDelete] = useTransition()

  function toggle(perm: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(perm)) next.delete(perm)
      else next.add(perm)
      return next
    })
    setFeedback(null)
  }

  function handleSave() {
    startSave(async () => {
      const permissions = Array.from(selected)
      const { error } = await client.roles.update(roleName, {
        displayName,
        description: description || undefined,
        permissions,
      })
      if (error) {
        setFeedback({ type: 'error', message: error.message })
      } else {
        track(AnalyticsEvent.RoleUpdated, {
          properties: {
            role_name: roleName,
            actor_user_id: actor?.id ?? null,
            permissions_added: permissions.filter(
              (permission) => !currentPermissions.includes(permission)
            ),
            permissions_removed: currentPermissions.filter(
              (permission) => !permissions.includes(permission)
            ),
          },
        })
        setFeedback({ type: 'success', message: 'Role saved.' })
      }
    })
  }

  function handleDelete() {
    if (isSystem) return
    if (!confirm(`Delete the "${displayName}" role? This cannot be undone.`))
      return
    startDelete(async () => {
      const { data, error } = await client.roles.delete(roleName)
      if (error || !data?.deleted) {
        setFeedback({
          type: 'error',
          message: error?.message ?? 'Failed to delete role.',
        })
      } else {
        track(AnalyticsEvent.RoleDeleted, {
          properties: {
            role_name: roleName,
            actor_user_id: actor?.id ?? null,
          },
        })
        router.push('/settings/users/roles')
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* Details */}
      <div className="border-876-surface-border bg-muted/20 space-y-4 rounded-xl border p-4">
        <h3 className="text-muted-foreground text-[0.8125rem] font-semibold">
          Details
        </h3>
        <div className="space-y-4">
          <div>
            <label
              className="mb-1.5 block text-xs font-medium"
              htmlFor="display_name"
            >
              Display Name
            </label>
            <Input
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Content Editor"
            />
          </div>
          <div>
            <label
              className="mb-1.5 block text-xs font-medium"
              htmlFor="description"
            >
              Description
              <span className="text-muted-foreground ml-1 font-normal">
                (optional)
              </span>
            </label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this role grant?"
            />
          </div>
          {isSystem && (
            <p className="text-muted-foreground text-xs">
              This is a system role. Its name cannot be changed.
            </p>
          )}
        </div>
      </div>

      {/* Permissions */}
      <div className="border-876-surface-border bg-muted/20 space-y-3 rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-muted-foreground text-[0.8125rem] font-semibold">
            Permissions
          </h3>
          <span className="text-muted-foreground text-xs">
            {selected.size} selected
          </span>
        </div>
        <PermissionGroupPicker
          groups={PERMISSION_GROUPS}
          selected={selected}
          onToggle={toggle}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <Button
          variant="info"
          onClick={handleSave}
          disabled={isSaving || isDeleting}
        >
          {isSaving ? 'Saving…' : 'Save Changes'}
        </Button>
        {!isSystem && (
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isSaving || isDeleting}
          >
            {isDeleting ? 'Deleting…' : 'Delete Role'}
          </Button>
        )}
        {feedback && (
          <span
            className={
              feedback.type === 'success'
                ? 'text-muted-foreground text-[0.8125rem]'
                : 'text-destructive text-[0.8125rem]'
            }
          >
            {feedback.message}
          </span>
        )}
      </div>
    </div>
  )
}

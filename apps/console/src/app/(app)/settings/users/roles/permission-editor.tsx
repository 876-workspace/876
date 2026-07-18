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
    <div className="space-y-8">
      {/* Details */}
      <section>
        <h2 className="876-section-title mb-4">Details</h2>
        <div className="876-card max-w-lg space-y-4 p-5">
          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
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
              className="mb-1.5 block text-sm font-medium"
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
      </section>

      {/* Permissions */}
      <section>
        <h2 className="876-section-title mb-4">Permissions</h2>
        <div className="876-card overflow-hidden">
          {PERMISSION_GROUPS.map((group, gi) => (
            <div
              key={group.label}
              className={gi < PERMISSION_GROUPS.length - 1 ? 'border-b' : ''}
            >
              <div className="bg-muted/40 dark:bg-muted/20 px-5 py-2.5">
                <span className="876-eyebrow font-semibold">{group.label}</span>
              </div>
              <div className="flex flex-wrap gap-2 px-5 py-3">
                {group.permissions.map((perm) => {
                  const checked = selected.has(perm.value)
                  return (
                    <button
                      key={perm.value}
                      type="button"
                      onClick={() => toggle(perm.value)}
                      aria-pressed={checked}
                      className={`focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                        checked
                          ? 'border-blue-500/50 bg-blue-500/10 text-blue-700 dark:border-blue-500/40 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-muted/50'
                      }`}
                    >
                      <span
                        className={`size-1.5 shrink-0 rounded-full transition-colors ${checked ? 'bg-blue-600 dark:bg-blue-400' : 'bg-muted-foreground/50'}`}
                      />
                      {perm.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          {selected.size} permission{selected.size !== 1 ? 's' : ''} selected
        </p>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3">
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
                ? 'text-muted-foreground text-sm'
                : 'text-destructive text-sm'
            }
          >
            {feedback.message}
          </span>
        )}
      </div>
    </div>
  )
}

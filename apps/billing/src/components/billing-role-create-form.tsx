'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'
import { togglePermission } from '@/lib/permissions'
import type { Permission } from '@/types/access'

import { PermissionPicker } from './billing-permission-picker'

export function RoleCreateForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState<Set<Permission>>(
    new Set(['billing:access'])
  )
  const [error, setError] = useState<string | null>(null)

  function setRoleName(value: string) {
    setName(value)
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 50)
    )
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await client.roles.create({
        name,
        slug,
        description: description.trim() || undefined,
        permissions: [...permissions],
      })
      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Failed to create the role.')
        return
      }
      router.push(`/settings/roles/${encodeURIComponent(result.data.id)}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      <section>
        <h2 className="876-section-title mb-3">Role details</h2>
        <div className="876-card grid max-w-2xl gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="billing-role-name">Name</Label>
            <Input
              id="billing-role-name"
              value={name}
              onChange={(event) => setRoleName(event.target.value)}
              placeholder="Billing specialist"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing-role-slug">Identifier</Label>
            <Input
              id="billing-role-slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value.toLowerCase())}
              placeholder="billing_specialist"
              pattern="[a-z0-9_]{2,50}"
              required
            />
            <p className="text-muted-foreground text-xs">
              Stable and immutable after creation.
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="billing-role-description">Description</Label>
            <Textarea
              id="billing-role-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="What responsibilities does this role have?"
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="876-section-title">Permissions</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Selecting Manage automatically includes the matching View
            permission.
          </p>
        </div>
        <PermissionPicker
          selected={permissions}
          onToggle={(permission) =>
            setPermissions((current) => togglePermission(current, permission))
          }
        />
      </section>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending || !name || !slug}>
          {isPending ? 'Creating…' : 'Create role'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/settings/roles')}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

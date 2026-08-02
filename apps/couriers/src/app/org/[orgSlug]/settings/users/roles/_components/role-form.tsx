'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'

import { client } from '@/lib/client'
import type { RoleView } from '@/types/role'

import { PermissionMatrix } from './permission-matrix'

type Props = {
  orgSlug: string
  role?: RoleView
}

export function RoleForm({ orgSlug, role }: Props) {
  const router = useRouter()
  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [permissions, setPermissions] = useState(role?.permissions ?? [])
  const [error, setError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const readOnly = role?.isDefault ?? false
  const listHref = `/org/${orgSlug}/settings/users/roles`

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const params = {
        name: name.trim(),
        description: description.trim(),
        permissions,
      }
      const result = role
        ? await client.roles.update(orgSlug, role.id, params)
        : await client.roles.create(orgSlug, params)

      if (result.error) {
        setError(result.error.message)
        return
      }

      router.push(listHref)
      router.refresh()
    })
  }

  function remove() {
    if (!role) return

    setError(null)
    startTransition(async () => {
      const result = await client.roles.delete(orgSlug, role.id)
      if (result.error) {
        setError(result.error.message)
        setDeleteOpen(false)
        return
      }

      setDeleteOpen(false)
      router.push(listHref)
      router.refresh()
    })
  }

  return (
    <form className="max-w-5xl space-y-6" onSubmit={save}>
      {readOnly ? (
        <div className="border-info/30 bg-info/5 text-foreground rounded-lg border px-4 py-3 text-sm">
          Default role — provisioned for every organization and cannot be
          edited.
        </div>
      ) : null}
      <div className="876-card grid gap-5 p-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="role-name">Name</Label>
          <Input
            id="role-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={readOnly || isPending}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role-description">Description</Label>
          <Input
            id="role-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={readOnly || isPending}
          />
        </div>
      </div>

      <PermissionMatrix
        value={permissions}
        onChange={setPermissions}
        readOnly={readOnly || isPending}
      />

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {!readOnly ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {role ? (
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </Button>
            ) : null}
          </div>
          <Button type="submit" variant="info" disabled={isPending}>
            Save
          </Button>
        </div>
      ) : null}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role?</AlertDialogTitle>
            <AlertDialogDescription>
              This role will be permanently removed. Roles assigned to users
              cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={remove}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}

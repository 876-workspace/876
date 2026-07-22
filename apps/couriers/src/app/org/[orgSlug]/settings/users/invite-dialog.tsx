'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@876/ui/dialog'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'

import { client } from '@/lib/client'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgSlug: string
  roles: Array<{ id: string; name: string }>
}

export function InviteDialog({
  open,
  onOpenChange,
  orgSlug,
  roles,
}: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState(roles[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    onOpenChange(next)
    if (!next) {
      setEmail('')
      setRoleId(roles[0]?.id ?? '')
      setError(null)
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await client.team.invites.create(orgSlug, {
        email: email.trim(),
        roleId,
      })
      if (result.error) {
        setError(result.error.message)
        return
      }

      handleOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite user</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-role">Role</Label>
            <Select
              value={roleId}
              onValueChange={(value) => value && setRoleId(value)}
              required
            >
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="info"
              disabled={isPending || !roleId}
            >
              Invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { client } from '@/lib/client'

type RoleOption = { name: string; display_name: string }

export function InviteForm({
  slug,
  roles,
}: {
  slug: string
  roles: RoleOption[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState(
    roles.some((r) => r.name === 'member') ? 'member' : (roles[0]?.name ?? '')
  )

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!email.trim() || isPending) return

    startTransition(async () => {
      const { error } = await client.orgs.invites.create(slug, {
        email: email.trim(),
        ...(role ? { role } : {}),
      })
      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Invite sent.')
      router.push(`/${slug}/members`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="876-card max-w-md space-y-4 p-5">
      <div className="space-y-2">
        <Label htmlFor="invite-email">Email</Label>
        <Input
          id="invite-email"
          type="email"
          required
          placeholder="jane@example.com"
          value={email}
          disabled={isPending}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="invite-role">Role</Label>
        <NativeSelect
          id="invite-role"
          className="w-full"
          value={role}
          disabled={isPending}
          onChange={(event) => setRole(event.target.value)}
        >
          {roles.map((option) => (
            <NativeSelectOption key={option.name} value={option.name}>
              {option.display_name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={!email.trim() || isPending}>
          {isPending ? 'Sending…' : 'Send invite'}
        </Button>
      </div>
    </form>
  )
}

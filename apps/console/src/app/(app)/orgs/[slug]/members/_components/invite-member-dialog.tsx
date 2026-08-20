'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlusIcon, Copy, CheckIcon } from '@876/ui/icons'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@876/ui/dialog'

import { client } from '@/lib/client'
import type { AdminInviteToken } from '@876/admin'

const ROLES = [
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' },
]

type Props = { orgId: string }

export function InviteMemberDialog({ orgId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<AdminInviteToken | null>(null)
  const [copied, setCopied] = useState(false)

  // The secret token is the invite credential. Never fall back to the public
  // inv_* record ID: the acceptance endpoint intentionally does not accept it.
  const inviteToken = created?.token ?? null
  const inviteUrl = inviteToken
    ? `${typeof window !== 'undefined' ? window.location.origin.replace(':3002', ':3000') : ''}/invite/${inviteToken}`
    : null

  function handleOpen(value: boolean) {
    setOpen(value)
    if (!value) {
      setEmail('')
      setRole('member')
      setError(null)
      setCreated(null)
      setCopied(false)
    }
  }

  function handleSubmit() {
    setError(null)
    if (!email.trim()) {
      setError('Email is required.')
      return
    }
    startTransition(async () => {
      const { data, error } = await client.invites.create(orgId, {
        email: email.trim(),
        role,
      })
      if (error || !data) {
        setError(error?.message ?? 'Failed to create invite.')
      } else {
        setCreated(data)
        router.refresh()
      }
    })
  }

  async function handleCopy() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger
        render={
          <Button variant="info" size="sm">
            <UserPlusIcon className="size-4" strokeWidth={2.25} />
            Invite member
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
        </DialogHeader>

        {!created ? (
          <div className="space-y-4">
            <div>
              <label
                className="mb-1.5 block text-[0.8125rem] font-medium"
                htmlFor="invite_email"
              >
                Email
              </label>
              <Input
                id="invite_email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="member@example.com"
                autoFocus
              />
            </div>
            <div>
              <label
                className="mb-1.5 block text-[0.8125rem] font-medium"
                htmlFor="invite_role"
              >
                Role
              </label>
              <select
                id="invite_role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="border-input bg-background text-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-[0.8125rem] focus-visible:ring-2 focus-visible:outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            {error && (
              <p className="text-destructive text-[0.8125rem]">{error}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => handleOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending ? 'Sending…' : 'Send Invite'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[0.8125rem]">
              Invite created for{' '}
              <span className="font-medium">{created.email}</span>. Share the
              link below — it expires in 7 days.
            </p>
            {inviteUrl ? (
              <div className="bg-muted flex items-center gap-2 rounded-lg p-3">
                <code className="min-w-0 flex-1 truncate text-xs break-all">
                  {inviteUrl}
                </code>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={handleCopy}
                  aria-label="Copy invite link"
                >
                  {copied ? (
                    <CheckIcon className="text-876-green size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            ) : (
              <p className="text-destructive text-[0.8125rem]">
                The invite was created, but no shareable token was returned.
                Create a new invite instead of sharing the invite record ID.
              </p>
            )}
            <div className="flex justify-end">
              <Button onClick={() => handleOpen(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

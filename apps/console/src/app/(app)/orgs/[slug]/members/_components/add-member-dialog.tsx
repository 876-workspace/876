'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type {
  AdminInviteToken,
  AdminMembership,
  AdminOrgRole,
  AdminUser,
} from '@876/admin'
import { Button } from '@876/ui/button'
import {
  CheckIcon,
  Copy,
  UserPlusIcon,
} from '@876/ui/icons'
import { Input } from '@876/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@876/ui/dialog'

import { client } from '@/lib/client'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SEARCH_DELAY_MS = 300

function defaultRole(roles: AdminOrgRole[]): string {
  return (
    roles.find((role) => role.name === 'member')?.name ??
    roles.find((role) => role.name !== 'owner')?.name ??
    roles[0]?.name ??
    ''
  )
}

function displayName(user: AdminUser): string {
  return (
    [user.first_name, user.last_name].filter(Boolean).join(' ').trim() ||
    user.email
  )
}

type Props = {
  orgId: string
  orgName: string
  roles: AdminOrgRole[]
}

export function AddMemberDialog({ orgId, orgName, roles }: Props) {
  const router = useRouter()
  const initialRole = defaultRole(roles)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState('')
  const [role, setRole] = useState(initialRole)
  const [results, setResults] = useState<AdminUser[]>([])
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [searchedQuery, setSearchedQuery] = useState('')
  const [searchError, setSearchError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [createdInvite, setCreatedInvite] = useState<AdminInviteToken | null>(
    null
  )
  const [createdMember, setCreatedMember] = useState<AdminMembership | null>(
    null
  )
  const [copied, setCopied] = useState(false)

  const normalizedQuery = query.trim()
  const validEmail = EMAIL_PATTERN.test(normalizedQuery)
  const isChecking =
    normalizedQuery.length >= 2 &&
    !selectedUser &&
    searchedQuery !== normalizedQuery

  const inviteToken = createdInvite?.token ?? null
  const inviteUrl = inviteToken
    ? `${typeof window !== 'undefined' ? window.location.origin.replace(':3002', ':3000') : ''}/invite/${inviteToken}`
    : null

  useEffect(() => {
    if (!open || createdInvite || createdMember) return

    const value = query.trim()
    if (selectedUser && value === selectedUser.email) {
      setResults([])
      setSearchedQuery(value)
      setSearchError(null)
      return
    }
    if (value.length < 2) {
      setResults([])
      setSearchedQuery('')
      setSearchError(null)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(async () => {
      const { data, error: searchResultError } = await client.members.search(
        orgId,
        value
      )
      if (cancelled) return

      if (searchResultError) {
        setResults([])
        setSearchError(searchResultError.message ?? 'User search failed.')
        return
      }

      setResults(data ?? [])
      setSearchedQuery(value)
      setSearchError(null)
    }, SEARCH_DELAY_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [createdInvite, createdMember, open, orgId, query, selectedUser])

  function reset() {
    setQuery('')
    setRole(initialRole)
    setResults([])
    setSelectedUser(null)
    setSearchedQuery('')
    setSearchError(null)
    setError(null)
    setCreatedInvite(null)
    setCreatedMember(null)
    setCopied(false)
  }

  function handleOpen(value: boolean) {
    setOpen(value)
    if (!value) reset()
  }

  function handleQuery(value: string) {
    setQuery(value)
    setSelectedUser(null)
    setResults([])
    setSearchedQuery('')
    setSearchError(null)
    setError(null)
  }

  function selectUser(user: AdminUser) {
    setSelectedUser(user)
    setQuery(user.email)
    setResults([])
    setSearchedQuery(user.email)
    setSearchError(null)
    setError(null)
  }

  function handleSubmit() {
    setError(null)

    if (!role) {
      setError('No organization role is available for this member.')
      return
    }

    if (selectedUser) {
      startTransition(async () => {
        const { data, error: createError } = await client.members.create(orgId, {
          userId: selectedUser.id,
          role,
        })
        if (createError || !data) {
          setError(createError?.message ?? 'Failed to add member.')
          return
        }

        setCreatedMember(data)
        router.refresh()
      })
      return
    }

    if (!validEmail) {
      setError('Select an existing user or enter a valid email address.')
      return
    }
    if (searchedQuery !== normalizedQuery) {
      setError('Wait for the existing-user check to finish.')
      return
    }

    startTransition(async () => {
      const { data, error: inviteError } = await client.invites.create(orgId, {
        email: normalizedQuery,
        role,
      })
      if (inviteError || !data) {
        setError(inviteError?.message ?? 'Failed to create invitation.')
        return
      }

      setCreatedInvite(data)
      router.refresh()
    })
  }

  async function handleCopy() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const successTitle = createdMember
    ? 'Member added'
    : createdInvite
      ? 'Invitation created'
      : 'Add member'

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger
        render={
          <Button variant="info" size="sm">
            <UserPlusIcon className="size-4" strokeWidth={2.25} />
            Add member
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{successTitle}</DialogTitle>
        </DialogHeader>

        {createdMember ? (
          <div className="space-y-4">
            <p className="text-[0.8125rem]">
              <span className="font-medium">
                {selectedUser?.email ?? createdMember.user_id}
              </span>{' '}
              is now an active member of {orgName}.
            </p>
            <div className="flex justify-end">
              <Button onClick={() => handleOpen(false)}>Done</Button>
            </div>
          </div>
        ) : createdInvite ? (
          <div className="space-y-4">
            <p className="text-[0.8125rem]">
              An invitation was created for{' '}
              <span className="font-medium">{createdInvite.email}</span>. Share
              the link below — it expires in 7 days.
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
                  aria-label="Copy invitation link"
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
                The invitation was created, but no shareable token was returned.
                Create a new invitation instead of sharing the invite record ID.
              </p>
            )}
            <div className="flex justify-end">
              <Button onClick={() => handleOpen(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label
                className="mb-1.5 block text-[0.8125rem] font-medium"
                htmlFor="member_query"
              >
                Email or user
              </label>
              <Input
                id="member_query"
                type="text"
                value={query}
                onChange={(event) => handleQuery(event.target.value)}
                placeholder="Search users or enter an email"
                autoComplete="off"
                autoFocus
              />

              {isChecking && (
                <p className="text-muted-foreground mt-1.5 text-xs">
                  Checking for an existing 876 user…
                </p>
              )}
              {searchError && (
                <p className="text-destructive mt-1.5 text-xs">{searchError}</p>
              )}

              {!selectedUser && results.length > 0 && (
                <div className="border-border bg-background mt-2 overflow-hidden rounded-md border">
                  {results.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className="hover:bg-muted flex w-full flex-col px-3 py-2 text-left"
                      onClick={() => selectUser(user)}
                    >
                      <span className="text-[0.8125rem] font-medium">
                        {displayName(user)}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {user.email}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {selectedUser && (
                <div className="bg-muted/50 border-border mt-2 rounded-md border px-3 py-2">
                  <p className="text-[0.8125rem] font-medium">
                    {displayName(selectedUser)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {selectedUser.email}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Existing 876 user — this account will be added immediately.
                  </p>
                </div>
              )}

              {!selectedUser &&
                validEmail &&
                searchedQuery === normalizedQuery &&
                !searchError && (
                  <p className="text-muted-foreground mt-1.5 text-xs">
                    No user selected. An invitation will be created for this
                    email.
                  </p>
                )}
            </div>

            <div>
              <label
                className="mb-1.5 block text-[0.8125rem] font-medium"
                htmlFor="member_role"
              >
                Role
              </label>
              <select
                id="member_role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="border-input bg-background text-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-[0.8125rem] focus-visible:ring-2 focus-visible:outline-none"
                disabled={roles.length === 0}
              >
                {roles.map((orgRole) => (
                  <option key={orgRole.id} value={orgRole.name}>
                    {orgRole.display_name}
                  </option>
                ))}
              </select>
              {role === 'owner' && (
                <p className="text-876-gold-fg mt-1.5 text-xs">
                  Owners have full organization control and can manage other
                  owners.
                </p>
              )}
            </div>

            {error && (
              <p className="text-destructive text-[0.8125rem]">{error}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => handleOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  isPending ||
                  !role ||
                  isChecking ||
                  Boolean(searchError) ||
                  (!selectedUser && !validEmail)
                }
              >
                {isPending
                  ? selectedUser
                    ? 'Adding…'
                    : 'Creating…'
                  : selectedUser
                    ? 'Add member'
                    : 'Create invitation'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

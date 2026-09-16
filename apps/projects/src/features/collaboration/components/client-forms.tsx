'use client'

import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { clientGrantsClient } from '@/lib/client/collaboration'

import type { MentionMember } from './mention-input'

const GRANT_FLAGS = [
  { key: 'allowComments', label: 'Comments' },
  { key: 'allowDiscussions', label: 'Discussions' },
  { key: 'allowFiles', label: 'Files' },
  { key: 'allowTime', label: 'Time' },
  { key: 'allowInvoices', label: 'Invoices' },
  { key: 'allowWiki', label: 'Wiki' },
] as const

type GrantFlagKey = (typeof GRANT_FLAGS)[number]['key']

/**
 * Invites an existing organization member as a client on the project.
 *
 * Clients must already hold a 876 account in the organization: the picker
 * searches org members, and the invite records the grant plus a
 * notification with a copyable portal link. There is no email step.
 */
export function GrantInviteForm({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<readonly MentionMember[]>([])
  const [selected, setSelected] = useState<MentionMember | null>(null)
  const [flags, setFlags] = useState<Record<GrantFlagKey, boolean>>({
    allowComments: true,
    allowDiscussions: true,
    allowFiles: true,
    allowTime: true,
    allowInvoices: true,
    allowWiki: true,
  })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (query.trim().length < 2) return
    const controller = new AbortController()
    abortRef.current = controller
    const timer = window.setTimeout(async () => {
      const result = await clientGrantsClient.searchMembers(
        projectId,
        query.trim(),
        controller.signal
      )
      if (controller.signal.aborted) return
      if (result.error || !result.data) {
        setOptions([])
        return
      }
      setOptions(
        result.data.map((member) => ({
          userId: member.userId,
          label: member.label,
        }))
      )
    }, 200)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [projectId, query])

  function onQueryChange(next: string) {
    setQuery(next)
    if (next.trim().length < 2) {
      abortRef.current?.abort()
      setOptions([])
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (pending || !selected) return
    setPending(true)
    setError(null)
    const result = await clientGrantsClient.invite(projectId, {
      userId: selected.userId,
      ...flags,
    })
    setPending(false)
    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/grant-invite-failed',
          message: 'The client could not be invited.',
        }
      )
      return
    }
    setSelected(null)
    setQuery('')
    router.refresh()
  }

  function toggleFlag(key: GrantFlagKey) {
    setFlags((current) => ({ ...current, [key]: !current[key] }))
  }

  return (
    <form
      data-slot="grant-invite-form"
      onSubmit={submit}
      className="space-y-3 rounded-md border p-4"
    >
      <h2 className="text-sm font-semibold">Invite a client</h2>
      {error ? <AppError error={error} variant="banner" /> : null}
      <div className="space-y-1">
        <label htmlFor="grant-member-search" className="text-sm font-medium">
          Organization member
        </label>
        {selected ? (
          <p className="text-sm">
            {selected.label}{' '}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelected(null)}
            >
              Change
            </Button>
          </p>
        ) : (
          <>
            <Input
              id="grant-member-search"
              value={query}
              disabled={pending}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search by name or email (min 2 characters)"
              role="combobox"
              aria-expanded={options.length > 0}
              aria-controls="grant-member-options"
            />
            {options.length > 0 ? (
              <ul
                id="grant-member-options"
                role="listbox"
                className="rounded-md border p-1"
              >
                {options.map((option) => (
                  <li key={option.userId} role="option" aria-selected={false}>
                    <button
                      type="button"
                      className="w-full rounded px-2 py-1 text-left text-sm hover:bg-accent"
                      onClick={() => {
                        setSelected(option)
                        setOptions([])
                      }}
                    >
                      {option.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">Portal access</legend>
        {GRANT_FLAGS.map((flag) => (
          <label key={flag.key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={flags[flag.key]}
              disabled={pending}
              onChange={() => toggleFlag(flag.key)}
            />
            {flag.label}
          </label>
        ))}
      </fieldset>
      <Button type="submit" disabled={pending || !selected}>
        {pending ? 'Inviting…' : 'Invite client'}
      </Button>
    </form>
  )
}

export function SharedFilesForm({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (pending || !url.trim()) return
    setPending(true)
    setError(null)
    let response: Response | null = null
    try {
      response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/attachments`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            url: url.trim(),
            ...(name.trim() ? { name: name.trim() } : {}),
          }),
        }
      )
    } catch {
      setError({
        code: 'projects/attachment-link-failed',
        message: 'The file could not be shared.',
      })
      setPending(false)
      return
    }
    const payload = (await response.json().catch(() => null)) as {
      data?: unknown
      error?: { code: string; message: string } | null
    } | null
    setPending(false)
    if (!response.ok || !payload?.data) {
      setError(
        payload?.error ?? {
          code: 'projects/attachment-link-failed',
          message: 'The file could not be shared.',
        }
      )
      return
    }
    setUrl('')
    setName('')
    router.refresh()
  }

  return (
    <form
      data-slot="shared-files-form"
      onSubmit={submit}
      className="space-y-3 rounded-md border p-4"
    >
      <h2 className="text-sm font-semibold">Share a file link</h2>
      <p className="text-muted-foreground text-xs">
        Links stay internal until marked client visible. Only visible links
        appear in the client portal.
      </p>
      {error ? <AppError error={error} variant="banner" /> : null}
      <div className="space-y-1">
        <label htmlFor="shared-file-url" className="text-sm font-medium">
          File URL
        </label>
        <Input
          id="shared-file-url"
          value={url}
          disabled={pending}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://…"
          inputMode="url"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="shared-file-name" className="text-sm font-medium">
          Display name (optional)
        </label>
        <Input
          id="shared-file-name"
          value={name}
          disabled={pending}
          maxLength={300}
          onChange={(event) => setName(event.target.value)}
          placeholder="Kickoff deck"
        />
      </div>
      <Button type="submit" disabled={pending || !url.trim()}>
        {pending ? 'Sharing…' : 'Share file'}
      </Button>
    </form>
  )
}

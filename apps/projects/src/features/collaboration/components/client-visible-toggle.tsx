'use client'

import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { useState } from 'react'

type ClientVisibleToggleProps = {
  endpoint: string
  initialVisible: boolean
  label: string
}

/**
 * Opt-in client visibility switch for one record.
 *
 * Records stay internal until someone with `projects.edit` flips them, so
 * the portal can only ever read what was deliberately shared. The endpoint
 * answers `{ clientVisible }`; the badge mirrors the confirmed state.
 */
export function ClientVisibleToggle({
  endpoint,
  initialVisible,
  label,
}: ClientVisibleToggleProps) {
  const [visible, setVisible] = useState(initialVisible)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle() {
    if (pending) return
    setPending(true)
    setError(null)
    let response: Response | null = null
    try {
      response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientVisible: !visible }),
      })
    } catch {
      setError('The visibility could not be updated.')
      setPending(false)
      return
    }
    const payload = (await response.json().catch(() => null)) as {
      data?: { clientVisible?: boolean } | null
      error?: { message?: string } | null
    } | null
    setPending(false)
    if (!response.ok || typeof payload?.data?.clientVisible !== 'boolean') {
      setError(payload?.error?.message ?? 'The visibility could not be updated.')
      return
    }
    setVisible(payload.data.clientVisible)
  }

  return (
    <span
      data-slot="client-visible-toggle"
      className="inline-flex flex-wrap items-center gap-2"
    >
      {visible ? <Badge variant="info">Client visible</Badge> : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={toggle}
        aria-pressed={visible}
        aria-label={`${visible ? 'Hide from client' : 'Share with client'}: ${label}`}
      >
        {pending ? 'Saving…' : visible ? 'Hide from client' : 'Share with client'}
      </Button>
      {error ? (
        <span role="alert" className="text-destructive text-xs">
          {error}
        </span>
      ) : null}
    </span>
  )
}

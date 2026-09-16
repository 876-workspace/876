'use client'

import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button, buttonVariants } from '@876/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { eventsClient } from '@/lib/client/events'

export function EventActions({ eventId }: { eventId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  async function remove() {
    if (pending) return
    setPending(true)
    setError(null)
    const result = await eventsClient.delete(eventId)
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.push('/calendar')
  }

  return (
    <div className="space-y-2">
      {error ? (
        <AppError
          title="The event was not deleted"
          error={error}
          variant="banner"
        />
      ) : null}
      <div className="flex gap-2">
        <Link
          href={`/calendar/events/${encodeURIComponent(eventId)}/edit`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Edit
        </Link>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={remove}
          disabled={pending}
        >
          Delete
        </Button>
      </div>
    </div>
  )
}

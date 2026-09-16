'use client'

import type { AttendeeResponse, EventAttendee } from '@876/projects/contracts'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { eventsClient } from '@/lib/client/events'

const RESPONSE_LABELS: Record<string, string> = {
  invited: 'Invited',
  accepted: 'Accepted',
  declined: 'Declined',
  tentative: 'Tentative',
}

const RESPONSE_ACTIONS: readonly {
  response: AttendeeResponse
  label: string
}[] = [
  { response: 'accepted', label: 'Accept' },
  { response: 'tentative', label: 'Tentative' },
  { response: 'declined', label: 'Decline' },
]

type Props = {
  eventId: string
  attendees: readonly EventAttendee[]
  currentUserId: string
  memberNames: Readonly<Record<string, string>>
}

/** Attendees and their answers; the viewer answers for themselves here. */
export function EventAttendeesPanel({
  eventId,
  attendees,
  currentUserId,
  memberNames,
}: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  function nameOf(userId: string) {
    return memberNames[userId] ?? userId
  }

  async function respond(userId: string, response: AttendeeResponse) {
    if (pending) return
    setPending(true)
    setError(null)
    const result = await eventsClient.respondAttendee(eventId, userId, response)
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <section className="876-card space-y-4 p-5 sm:p-6">
      <h2 className="text-base font-semibold">Attendees</h2>

      {error ? (
        <AppError
          title="The response was not saved"
          error={error}
          variant="banner"
        />
      ) : null}

      {attendees.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nobody invited yet.</p>
      ) : (
        <ul aria-label="Attendees" className="space-y-3">
          {attendees.map((attendee) => (
            <li
              key={attendee.id}
              className="flex flex-wrap items-center justify-between gap-3 text-sm"
            >
              <span className="flex items-center gap-2">
                {nameOf(attendee.userId)}
                <span className="876-badge">
                  {RESPONSE_LABELS[attendee.response] ?? attendee.response}
                </span>
              </span>
              {attendee.userId === currentUserId ? (
                <span className="flex gap-2">
                  {RESPONSE_ACTIONS.map((action) => (
                    <Button
                      key={action.response}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => respond(attendee.userId, action.response)}
                      disabled={
                        pending || attendee.response === action.response
                      }
                    >
                      {action.label}
                    </Button>
                  ))}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

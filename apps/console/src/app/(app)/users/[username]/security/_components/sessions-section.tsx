'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { LogOut } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import { client } from '@/lib/client'

export type SessionRow = {
  id: string
  deviceLabel: string | null
  location: string | null
  ipAddress: string | null
  isActive: boolean
  isRevoked: boolean
  createdAt: number
  lastSeenAt: number | null
}

type Props = {
  userId: string
  sessions: SessionRow[]
}

function formatWhen(seconds: number | null) {
  if (seconds === null) return '—'
  return new Date(seconds * 1000).toLocaleString()
}

export function SessionsSection({ userId, sessions }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleRevokeAll() {
    if (
      !window.confirm(
        'Revoke all active sessions for this user? They will be signed out from all devices immediately.'
      )
    ) {
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await client.users.revokeSessions(userId)
      if (result.error) setError(result.error.message)
      else router.refresh()
    })
  }

  function handleRevoke(sessionId: string) {
    if (!window.confirm('Revoke this session?')) return
    setError(null)
    startTransition(async () => {
      const result = await client.sessions.revoke(sessionId)
      if (result.error) setError(result.error.message)
      else router.refresh()
    })
  }

  const hasActive = sessions.some((session) => session.isActive)

  return (
    <div className="876-card p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <LogOut className="text-muted-foreground size-4" />
          Sessions
        </h2>
        {hasActive && (
          <Button
            variant="destructive"
            size="sm"
            disabled={isPending}
            onClick={handleRevokeAll}
          >
            Revoke all
          </Button>
        )}
      </div>

      {sessions.length === 0 ? (
        <p className="text-muted-foreground text-sm">No sessions recorded.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">
                    {session.deviceLabel ?? 'Unknown device'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {session.location ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {session.ipAddress ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={session.isActive ? 'success' : 'secondary'}>
                      {session.isActive
                        ? 'Active'
                        : session.isRevoked
                          ? 'Revoked'
                          : 'Expired'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatWhen(session.lastSeenAt ?? session.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {session.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleRevoke(session.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {error && <p className="text-destructive mt-4 text-sm">{error}</p>}
    </div>
  )
}

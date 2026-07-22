'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { DataTable } from '@876/ui/data-table'

import { client } from '@/lib/client'
import type { PendingTeamInvite } from '@/types/team'

type Props = {
  orgSlug: string
  invites: PendingTeamInvite[]
}

export function PendingInvites({ orgSlug, invites }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (invites.length === 0) return null

  function revoke(inviteId: string) {
    if (isPending) return

    setError(null)
    setRevokingId(inviteId)
    startTransition(async () => {
      const result = await client.team.invites.revoke(orgSlug, inviteId)
      if (result.error) {
        setError(result.error.message)
        setRevokingId(null)
        return
      }

      setRevokingId(null)
      router.refresh()
    })
  }

  const columns: ColumnDef<PendingTeamInvite, unknown>[] = [
    {
      id: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.email}</span>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.role ?? 'member'}</Badge>
      ),
    },
    {
      id: 'expires',
      header: 'Expires',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {formatDate(row.original.expiresAt)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => revoke(row.original.id)}
          >
            {revokingId === row.original.id ? 'Revoking…' : 'Revoke'}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <section className="mt-8">
      <h2 className="876-section-title mb-3">Pending invites</h2>
      {error ? <p className="text-destructive mb-3 text-sm">{error}</p> : null}
      <div className="876-card overflow-hidden">
        <DataTable columns={columns} data={invites} />
      </div>
    </section>
  )
}

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

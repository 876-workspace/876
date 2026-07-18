'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import type { AdminInviteToken } from '@876/admin'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@876/ui/data-table'

import { client } from '@/lib/client'

export function PendingInvites({
  slug,
  invites,
}: {
  slug: string
  invites: AdminInviteToken[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function revoke(inviteId: string) {
    if (isPending) return

    startTransition(async () => {
      const { error } = await client.orgs.invites.revoke(slug, inviteId)
      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Invite revoked.')
      router.refresh()
    })
  }

  const columns: ColumnDef<AdminInviteToken, unknown>[] = [
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
      cell: ({ row }) => <Badge variant="outline">{row.original.role}</Badge>,
    },
    {
      id: 'expires',
      header: 'Expires',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {formatDate(row.original.expires_at)}
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
            Revoke
          </Button>
        </div>
      ),
    },
  ]

  return (
    <section>
      <h2 className="876-section-title mb-3">Pending invites</h2>
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

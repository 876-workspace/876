'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { ArrowDownFromLine, MoreHorizontalIcon, Trash } from '@876/ui/icons'

import { client } from '@/lib/client'
import type { CrmTeamStatus } from '@/types/crm'

export function TeamActions({
  teamId,
  status,
}: {
  teamId: string
  status: CrmTeamStatus
}) {
  const router = useRouter()

  async function changeStatus() {
    const nextStatus = status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE'
    const result = await client.teams.update(teamId, { status: nextStatus })
    if (result.error) {
      toast.error(result.error.message)
      return
    }
    router.refresh()
  }

  async function remove() {
    if (!window.confirm('Delete this team?')) return
    const result = await client.teams.delete(teamId)
    if (result.error) {
      toast.error(result.error.message)
      return
    }
    router.replace('/settings/teams')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="icon-sm" />}
        aria-label="More actions"
      >
        <MoreHorizontalIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-44">
        <DropdownMenuItem onClick={changeStatus}>
          {status === 'ACTIVE' ? 'Archive' : 'Restore'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => window.print()}>
          <ArrowDownFromLine className="size-4" />
          Export
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={remove}>
          <Trash className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

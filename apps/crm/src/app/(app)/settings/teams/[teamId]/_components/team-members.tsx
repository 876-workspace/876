'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@876/ui/button'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { MoreHorizontalIcon, Trash } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { MemberPicker } from '@/features/directory/components/member-picker'
import type { DirectoryMember } from '@/features/directory/types'
import { client } from '@/lib/client'
import type { CrmTeamMemberRole } from '@/types/crm'

export type TeamMemberRow = DirectoryMember & { role: CrmTeamMemberRole }

export function TeamMembers({
  teamId,
  members,
  directory,
}: {
  teamId: string
  members: TeamMemberRow[]
  directory: DirectoryMember[]
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function addMember() {
    if (!selected || saving) return
    setSaving(true)
    const result = await client.teams.members.add(teamId, {
      userId: selected,
      role: 'MEMBER',
    })
    setSaving(false)
    if (result.error) {
      toast.error(result.error.message)
      return
    }
    setSelected(null)
    router.refresh()
  }

  async function updateRole(userId: string, role: CrmTeamMemberRole) {
    const result = await client.teams.members.update(teamId, userId, { role })
    if (result.error) toast.error(result.error.message)
    else router.refresh()
  }

  async function removeMember(userId: string) {
    if (!window.confirm('Remove this member?')) return
    const result = await client.teams.members.remove(teamId, userId)
    if (result.error) toast.error(result.error.message)
    else router.refresh()
  }

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="876-section-title">Members</h2>
        <div className="flex w-full max-w-md items-center gap-2">
          <MemberPicker
            members={directory}
            value={selected}
            onSelect={setSelected}
            exclude={members.map((member) => member.userId)}
            placeholder="Add member"
            emptyLabel="No members found"
          />
          <Button
            type="button"
            variant="info"
            size="sm"
            onClick={addMember}
            disabled={!selected || saving}
          >
            Add
          </Button>
        </div>
      </div>

      <div className="876-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  No members yet
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.userId}>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <CustomerAvatar name={member.name} src={member.avatar} />
                      <span className="font-medium">{member.name}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.email ?? '—'}
                  </TableCell>
                  <TableCell>
                    {member.role === 'LEAD' ? 'Lead' : 'Member'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon-sm" />}
                        aria-label={`Actions for ${member.name}`}
                      >
                        <MoreHorizontalIcon className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-40">
                        <DropdownMenuItem
                          onClick={() => updateRole(member.userId, 'LEAD')}
                        >
                          Make lead
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => updateRole(member.userId, 'MEMBER')}
                        >
                          Make member
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => removeMember(member.userId)}
                        >
                          <Trash className="size-4" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

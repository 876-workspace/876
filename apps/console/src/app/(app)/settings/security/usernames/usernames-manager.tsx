'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ReservedUsername } from '@876/admin'
import { cn } from '@876/core/utils'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { Trash, AtSign } from '@876/ui/icons'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@876/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { reservedUsernames } from '@/lib/client'
import { formatDate } from '@/lib/format'

// ---------------------------------------------------------------------------
// Reason categories — single source for dropdown options and badge colors
// ---------------------------------------------------------------------------

const REASON_BADGES = [
  {
    keywords: ['impersonation'],
    label: 'Impersonation',
    className:
      'border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-400',
  },
  {
    keywords: ['trust', 'safety'],
    label: 'Trust / Safety',
    className: 'border-red-400/40 bg-red-400/10 text-red-700 dark:text-red-400',
  },
  {
    keywords: ['moderation', 'anonymous'],
    label: 'Moderation',
    className:
      'border-purple-400/40 bg-purple-400/10 text-purple-700 dark:text-purple-400',
  },
  {
    keywords: ['mail', 'protocol', 'dns', 'nameserver'],
    label: 'Protocol',
    className: 'border-sky-400/40 bg-sky-400/10 text-sky-700 dark:text-sky-400',
  },
  {
    keywords: ['edge case', 'environment', 'development'],
    label: 'Development',
    className:
      'border-slate-400/40 bg-slate-200/60 text-slate-700 dark:border-slate-500/40 dark:bg-slate-700/40 dark:text-slate-300',
  },
  {
    keywords: ['routing', 'technical reservation'],
    label: 'Routing',
    className:
      'border-blue-400/40 bg-blue-400/10 text-blue-700 dark:text-blue-400',
  },
] as const

const DEFAULT_BADGE = {
  label: 'Other',
  className:
    'border-zinc-400/40 bg-zinc-400/10 text-zinc-600 dark:text-zinc-400',
}

function getReasonBadge(reason: string | null) {
  if (!reason) return DEFAULT_BADGE
  const r = reason.toLowerCase()
  return (
    REASON_BADGES.find((b) => b.keywords.some((k) => r.includes(k))) ??
    DEFAULT_BADGE
  )
}

// ---------------------------------------------------------------------------

interface Props {
  initialItems: ReservedUsername[]
}

export function UsernamesManager({ initialItems }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<ReservedUsername[]>(initialItems)
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [reason, setReason] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = username.trim().toLowerCase()
    if (!trimmed) return
    setAddError(null)
    startTransition(async () => {
      const { data, error } = await reservedUsernames.create({
        username: trimmed,
        reason: reason || undefined,
      })
      if (error || !data) {
        setAddError(error?.message ?? 'Failed to reserve username.')
      } else {
        setItems((prev) => [data, ...prev])
        setOpen(false)
        setUsername('')
        setReason('')
        router.refresh()
      }
    })
  }

  function handleDialogOpenChange(next: boolean) {
    if (!next) {
      setUsername('')
      setReason('')
      setAddError(null)
    }
    setOpen(next)
  }

  function handleDelete(usernameToDelete: string) {
    if (
      !window.confirm(`Remove '${usernameToDelete}' from reserved usernames?`)
    )
      return
    startTransition(async () => {
      const { error } = await reservedUsernames.del(usernameToDelete)
      if (!error) {
        setItems((prev) => prev.filter((i) => i.username !== usernameToDelete))
        router.refresh()
      }
    })
  }

  return (
    <>
      <ResourceToolbar
        title="Reserved Usernames"
        description="Usernames that cannot be claimed during sign-up."
        primaryLabel="Add"
        primaryVariant="info"
        onPrimaryAction={() => setOpen(true)}
        refresh
      />

      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reserve username</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ru-username">Username</Label>
              <Input
                id="ru-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                disabled={isPending}
                className="font-mono"
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ru-reason">
                Reason{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Select value={reason} onValueChange={(v) => setReason(v ?? '')}>
                <SelectTrigger id="ru-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REASON_BADGES.map((b) => (
                    <SelectItem key={b.label} value={b.label}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {addError && <p className="text-destructive text-sm">{addError}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !username.trim()}>
                {isPending ? 'Adding…' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AtSign />
            </EmptyMedia>
            <EmptyTitle>No reserved usernames</EmptyTitle>
          </EmptyHeader>
          <EmptyContent />
        </Empty>
      ) : (
        <div className="876-card overflow-hidden">
          <Table>
            <TableHeader className="876-header-row">
              <TableRow>
                <TableHead className="px-5 py-3.5">Username</TableHead>
                <TableHead className="px-5 py-3.5">Reason</TableHead>
                <TableHead className="px-5 py-3.5">Added</TableHead>
                <TableHead className="px-5 py-3.5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const badge = getReasonBadge(item.reason)
                return (
                  <TableRow key={item.username}>
                    <TableCell className="px-5 py-3.5">
                      <span className="font-mono font-medium">
                        {item.username}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
                          badge.className
                        )}
                      >
                        {badge.label}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-3.5">
                      <span className="text-muted-foreground text-sm">
                        {formatDate(item.created_at)}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        aria-label={`Remove ${item.username}`}
                        onClick={() => handleDelete(item.username)}
                        disabled={isPending}
                      >
                        <Trash className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  )
}

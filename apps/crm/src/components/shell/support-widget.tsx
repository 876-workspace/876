'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'

import { Badge } from '@876/ui/badge'
import { Button, buttonVariants } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@876/ui/popover'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Skeleton } from '@876/ui/skeleton'
import { Textarea } from '@876/ui/textarea'
import { ChatBubbleLeftIcon, ChevronLeftIcon, PlusIcon } from '@876/ui/icons'
import { cn } from '@876/ui/lib/utils'

import { client } from '@/lib/client'
import type { SupportCategory } from './support-categories'

type View = 'list' | 'new'

type MyRequest = {
  id: string
  number: number
  subject: string
  status: string
}

const OPEN_STATUSES = new Set(['OPEN', 'IN_PROGRESS', 'WAITING'])

/**
 * The in-app support widget.
 *
 * CRM is built while being used to run 876, so raising a bug or a piece of
 * feedback has to be possible from wherever you already are rather than by
 * navigating to the requests list and filling in a full form. This is the
 * embedded surface of CRM intake: it opens under the navbar, takes a request,
 * and shows what you already have open.
 *
 * The categories are the organization's own request catalog, so what a person
 * can file here is configured in Settings rather than hard-coded.
 */
export function SupportWidget({
  categories,
}: {
  categories: SupportCategory[]
}) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('list')

  // Reopening should start from what you have open, not from a half-typed
  // form you abandoned, so the view resets each time the panel closes.
  function change(next: boolean) {
    setOpen(next)
    if (!next) setView('list')
  }

  return (
    <Popover open={open} onOpenChange={change}>
      <PopoverTrigger
        aria-label="Support"
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'h-8 w-8 rounded-lg'
        )}
      >
        <ChatBubbleLeftIcon className="size-4" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[24rem] max-w-[calc(100vw-2rem)] overflow-hidden p-0"
      >
        <div className="bg-muted/20 flex items-center justify-between gap-2 border-b px-3 py-2.5">
          {view === 'list' ? (
            <>
              <span className="876-eyebrow text-[0.6875rem]">
                Your requests
              </span>
              <Button
                type="button"
                variant="info"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => setView('new')}
              >
                <PlusIcon className="size-3.5" strokeWidth={2.5} />
                New
              </Button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setView('list')}
                className="text-muted-foreground hover:text-foreground -ml-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-xs font-medium transition-colors"
              >
                <ChevronLeftIcon className="size-3.5" />
                Back
              </button>
              <span className="876-eyebrow text-[0.6875rem]">New request</span>
            </>
          )}
        </div>

        {view === 'new' ? (
          <NewRequestTab
            categories={categories}
            onDone={() => setView('list')}
          />
        ) : (
          <MyRequestsTab open={open} onClose={() => change(false)} />
        )}
      </PopoverContent>
    </Popover>
  )
}

function NewRequestTab({
  categories,
  onDone,
}: {
  categories: SupportCategory[]
  onDone: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<number | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const form = new FormData(event.currentTarget)
    const subject = String(form.get('subject') ?? '').trim()
    if (!subject) return

    setSaving(true)
    setError(null)

    const result = await client.support.create({
      subject,
      description: String(form.get('description') ?? '').trim() || null,
      categoryId: String(form.get('categoryId') ?? '') || null,
    })

    setSaving(false)
    if (result.error) return setError(result.error.message)

    setDone(result.data.number)
    event.currentTarget.reset()
  }

  if (done !== null) {
    return (
      <div className="space-y-3 p-4 text-sm">
        <p className="font-medium">Request #{done} raised.</p>
        <p className="text-muted-foreground text-xs">
          You can follow it under My requests.
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="info" size="sm" onClick={onDone}>
            View it
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDone(null)}
          >
            Raise another
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3 p-4">
      <Input
        name="subject"
        required
        placeholder="What is happening?"
        aria-label="Subject"
      />

      {categories.length > 0 ? (
        <NativeSelect name="categoryId" aria-label="Category" defaultValue="">
          <NativeSelectOption value="">No category</NativeSelectOption>
          {categories.map((category) => (
            <NativeSelectOption key={category.id} value={category.id}>
              {category.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      ) : null}

      <Textarea
        name="description"
        placeholder="Any detail that would help someone reproduce or act on it…"
        className="min-h-24 resize-y"
        aria-label="Description"
      />

      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" variant="info" size="sm" disabled={saving}>
          {saving ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </form>
  )
}

function MyRequestsTab({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [requests, setRequests] = useState<MyRequest[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false

    client.support.list().then((result) => {
      if (cancelled) return
      if (result.error) return setError(result.error.message)
      setRequests(
        result.data.data.map((entry) => ({
          id: entry.id,
          number: entry.number,
          subject: entry.subject,
          status: entry.status,
        }))
      )
    })

    return () => {
      cancelled = true
    }
  }, [open])

  if (error)
    return (
      <p className="text-destructive p-4 text-xs" role="alert">
        {error}
      </p>
    )

  if (requests === null)
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    )

  const openRequests = requests.filter((entry) =>
    OPEN_STATUSES.has(entry.status)
  )

  if (openRequests.length === 0)
    return (
      <div className="space-y-1 px-6 py-8 text-center">
        <p className="text-sm font-medium">Nothing open</p>
        <p className="text-muted-foreground text-xs">
          Anything you raise from here shows up in this list.
        </p>
      </div>
    )

  return (
    <ul className="divide-border/60 max-h-80 divide-y overflow-y-auto">
      {openRequests.map((entry) => (
        <li key={entry.id}>
          <Link
            href={`/requests/${entry.id}`}
            onClick={onClose}
            className="hover:bg-muted/40 flex items-center gap-3 px-4 py-2.5 transition-colors"
          >
            <span className="text-info shrink-0 font-mono text-xs tabular-nums">
              #{entry.number}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">
              {entry.subject}
            </span>
            <Badge variant="secondary" className="shrink-0 text-[0.625rem]">
              {entry.status.replaceAll('_', ' ').toLowerCase()}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  )
}

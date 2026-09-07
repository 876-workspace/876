'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'

import type {
  CrmRequest,
  RequestCategoryList,
  RequestList,
  Result,
  SupportRequestDraft,
} from '@876/crm'
import { Badge } from '@876/ui/badge'
import { Button, buttonVariants } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { ChevronLeftIcon, FlagIcon, PlusIcon } from '@876/ui/icons'
import { cn } from '@876/ui/lib/utils'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Popover, PopoverContent, PopoverTrigger } from '@876/ui/popover'
import { Skeleton } from '@876/ui/skeleton'
import { Textarea } from '@876/ui/textarea'

type View = 'list' | 'new'

export interface SupportWidgetTransport {
  listCategories(): Promise<Result<RequestCategoryList>>
  listRequests(): Promise<Result<RequestList>>
  createRequest(input: SupportRequestDraft): Promise<Result<CrmRequest>>
}

export interface SupportWidgetLabels {
  trigger: string
  listTitle: string
  newTitle: string
  newButton: string
  emptyTitle: string
  emptyDescription: string
  subjectPlaceholder: string
  descriptionPlaceholder: string
  sendButton: string
}

const DEFAULT_LABELS: SupportWidgetLabels = {
  trigger: 'Support',
  listTitle: 'Organization requests',
  newTitle: 'New request',
  newButton: 'New',
  emptyTitle: 'Nothing open',
  emptyDescription: 'Anything your organization raises with 876 shows up here.',
  subjectPlaceholder: 'What is happening?',
  descriptionPlaceholder:
    'Any detail that would help someone reproduce or act on it…',
  sendButton: 'Send',
}

const OPEN_STATUSES = new Set(['OPEN', 'IN_PROGRESS', 'WAITING'])

export function SupportWidget({
  transport,
  labels,
  requestHref,
}: {
  transport: SupportWidgetTransport
  labels?: Partial<SupportWidgetLabels>
  requestHref?: (requestId: string) => string | null
}) {
  const copy = { ...DEFAULT_LABELS, ...labels }
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('list')
  const [requests, setRequests] = useState<RequestList['data'] | null>(null)
  const [categories, setCategories] = useState<
    RequestCategoryList['data'] | null
  >(null)
  const [requestsError, setRequestsError] = useState<string | null>(null)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false

    setRequests(null)
    setCategories(null)
    setRequestsError(null)
    setCategoriesError(null)

    void transport.listRequests().then((result) => {
      if (cancelled) return
      if (result.error) {
        setRequestsError(result.error.message)
        return
      }
      setRequests(result.data.data)
    })

    void transport.listCategories().then((result) => {
      if (cancelled) return
      if (result.error) {
        setCategoriesError(result.error.message)
        return
      }
      setCategories(result.data.data.filter((category) => category.isActive))
    })

    return () => {
      cancelled = true
    }
  }, [open, transport])

  function change(next: boolean) {
    setOpen(next)
    if (!next) setView('list')
  }

  return (
    <Popover open={open} onOpenChange={change}>
      <PopoverTrigger
        aria-label={copy.trigger}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'h-8 w-8 rounded-lg'
        )}
      >
        <FlagIcon className="size-4" />
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
                {copy.listTitle}
              </span>
              <Button
                type="button"
                variant="info"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => setView('new')}
              >
                <PlusIcon className="size-3.5" strokeWidth={2.5} />
                {copy.newButton}
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
              <span className="876-eyebrow text-[0.6875rem]">
                {copy.newTitle}
              </span>
            </>
          )}
        </div>

        {view === 'new' ? (
          <NewRequestTab
            categories={categories}
            categoriesError={categoriesError}
            labels={copy}
            createRequest={transport.createRequest}
            onCreated={(created) => {
              setRequests((current) => [created, ...(current ?? [])])
              setView('list')
            }}
          />
        ) : (
          <RequestsTab
            requests={requests}
            error={requestsError}
            labels={copy}
            requestHref={requestHref}
            onClose={() => change(false)}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}

function NewRequestTab({
  categories,
  categoriesError,
  labels,
  createRequest,
  onCreated,
}: {
  categories: RequestCategoryList['data'] | null
  categoriesError: string | null
  labels: SupportWidgetLabels
  createRequest: SupportWidgetTransport['createRequest']
  onCreated: (request: CrmRequest) => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const form = new FormData(event.currentTarget)
    const subject = String(form.get('subject') ?? '').trim()
    if (!subject) return

    setSaving(true)
    setError(null)

    const result = await createRequest({
      subject,
      description: String(form.get('description') ?? '').trim() || null,
      categoryId: String(form.get('categoryId') ?? '') || null,
    })

    setSaving(false)
    if (result.error) {
      setError(result.error.message)
      return
    }

    event.currentTarget.reset()
    onCreated(result.data)
  }

  return (
    <form onSubmit={submit} className="space-y-3 p-4">
      <Input
        name="subject"
        required
        placeholder={labels.subjectPlaceholder}
        aria-label="Subject"
      />

      {categories && categories.length > 0 ? (
        <NativeSelect name="categoryId" aria-label="Category" defaultValue="">
          <NativeSelectOption value="">No category</NativeSelectOption>
          {categories.map((category) => (
            <NativeSelectOption key={category.id} value={category.id}>
              {category.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      ) : null}

      {categoriesError ? (
        <p className="text-muted-foreground text-xs">
          Categories are unavailable. You can still send this request.
        </p>
      ) : null}

      <Textarea
        name="description"
        placeholder={labels.descriptionPlaceholder}
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
          {saving ? 'Sending…' : labels.sendButton}
        </Button>
      </div>
    </form>
  )
}

function RequestsTab({
  requests,
  error,
  labels,
  requestHref,
  onClose,
}: {
  requests: RequestList['data'] | null
  error: string | null
  labels: SupportWidgetLabels
  requestHref?: (requestId: string) => string | null
  onClose: () => void
}) {
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
        <p className="text-sm font-medium">{labels.emptyTitle}</p>
        <p className="text-muted-foreground text-xs">
          {labels.emptyDescription}
        </p>
      </div>
    )

  return (
    <ul className="divide-border/60 max-h-80 divide-y overflow-y-auto">
      {openRequests.map((entry) => {
        const href = requestHref?.(entry.id) ?? null
        const content = <RequestRow request={entry} />

        return (
          <li key={entry.id}>
            {href ? (
              <Link
                href={href}
                onClick={onClose}
                className="hover:bg-muted/40 flex items-center gap-3 px-4 py-2.5 transition-colors"
              >
                {content}
              </Link>
            ) : (
              <div className="flex items-center gap-3 px-4 py-2.5">
                {content}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function RequestRow({ request }: { request: CrmRequest }) {
  return (
    <>
      <span className="text-info shrink-0 font-mono text-xs tabular-nums">
        #{request.number}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm">{request.subject}</span>
      <Badge variant="secondary" className="shrink-0 text-[0.625rem]">
        {request.status.replaceAll('_', ' ').toLowerCase()}
      </Badge>
    </>
  )
}

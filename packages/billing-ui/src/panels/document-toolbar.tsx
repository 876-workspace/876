'use client'

import { useState, useTransition } from 'react'

import { Link } from '../link'
import { DocumentShareControls } from './document-share-controls'
import { RECURRING_INTERVAL_UNITS } from '../recurring-invoice-form'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@876/ui/alert-dialog'
import { AppError } from '@876/ui/app-error'
import { Button, buttonVariants } from '@876/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@876/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import {
  ArrowPathIcon,
  ChatBubbleLeftIcon,
  ChevronDownIcon,
  Copy,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  EllipsisHorizontalIcon,
  EnvelopeIcon,
  Pencil,
  Printer,
  Trash,
} from '@876/ui/icons'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { cn } from '@876/ui/lib/utils'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { RadioGroup, RadioGroupItem } from '@876/ui/radio-group'
import { Textarea } from '@876/ui/textarea'

import { collectibleStatuses } from '../invoice-status'

export { collectibleStatuses } from '../invoice-status'

export type DocumentToolbarStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'SENT'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'PAID'
  | 'UNCOLLECTIBLE'
  | 'VOID'

export interface DocumentToolbarActionResult {
  error: string | null
}

export type DocumentRecurrenceIntervalUnit =
  (typeof RECURRING_INTERVAL_UNITS)[number]

export type DocumentRecurrenceGenerationMode =
  'draft' | 'finalize' | 'finalize-and-send'

/** The schedule half of a recurring profile; the document half comes from the invoice. */
export interface DocumentMakeRecurringSchedule {
  profileName: string
  frequency: {
    intervalUnit: DocumentRecurrenceIntervalUnit
    intervalCount: number
  }
  startAt: number
  endAt: number | null
  maxCycles: number | null
  generationMode: DocumentRecurrenceGenerationMode
}

export interface DocumentToolbarProps {
  status: DocumentToolbarStatus
  /**
   * The document's path in the host app. The absolute URL is resolved against
   * `window.location.origin` when a control is used, so Share and WhatsApp
   * produce a link the recipient can actually open.
   */
  sharePath: string
  document: { number: string; totalAmount: string }
  editHref?: string
  recordPaymentHref?: string
  /** Billing-only settings surface; Invoice omits the item rather than linking nowhere. */
  preferencesHref?: string
  canEdit?: boolean
  canDelete?: boolean
  onFinalize?: () => Promise<DocumentToolbarActionResult>
  onSend?: () => Promise<DocumentToolbarActionResult>
  onVoid?: (reason: string | null) => Promise<DocumentToolbarActionResult>
  onWriteOff?: (reason: string) => Promise<DocumentToolbarActionResult>
  onDelete?: () => Promise<DocumentToolbarActionResult>
  onClone?: () => Promise<DocumentToolbarActionResult>
  onMakeRecurring?: (
    schedule: DocumentMakeRecurringSchedule
  ) => Promise<DocumentToolbarActionResult>
}

function canRecordSend(status: DocumentToolbarStatus) {
  return collectibleStatuses.has(status) || status === 'PAID'
}

function canVoidFromStatus(status: DocumentToolbarStatus) {
  return status === 'OPEN' || status === 'SENT'
}

function todayDateInput() {
  return new Date().toISOString().slice(0, 10)
}

const COPY_CONFIRMATION_MS = 2000

/** The document toolbar: the secondary action row above a rendered document. */
export function DocumentToolbar({
  status,
  sharePath,
  document,
  editHref,
  recordPaymentHref,
  preferencesHref,
  canEdit = false,
  canDelete = false,
  onFinalize,
  onSend,
  onVoid,
  onWriteOff,
  onDelete,
  onClone,
  onMakeRecurring,
}: DocumentToolbarProps) {
  const [isPending, startTransition] = useTransition()
  const [voidOpen, setVoidOpen] = useState(false)
  const [writeOffOpen, setWriteOffOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [recurringOpen, setRecurringOpen] = useState(false)
  const [voidReason, setVoidReason] = useState('')
  const [writeOffReason, setWriteOffReason] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function run(
    action: () => Promise<DocumentToolbarActionResult>,
    onSuccess?: () => void
  ) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.error) {
        setError(result.error)
        return
      }
      onSuccess?.()
    })
  }

  function documentUrl() {
    return new URL(sharePath, window.location.origin).toString()
  }

  async function copyLink() {
    setError(null)
    try {
      await navigator.clipboard.writeText(documentUrl())
      setCopied(true)
      window.setTimeout(() => setCopied(false), COPY_CONFIRMATION_MS)
    } catch {
      setError('Copy the invoice link from the address bar.')
    }
  }

  function shareOnWhatsApp() {
    const text = `${document.number} · ${document.totalAmount}\n${documentUrl()}`
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  const collectible = collectibleStatuses.has(status)
  const moreItems = [
    onClone ? 'clone' : null,
    onMakeRecurring ? 'recurring' : null,
    canVoidFromStatus(status) && onVoid ? 'void' : null,
    collectible && onWriteOff ? 'writeOff' : null,
    canDelete && onDelete ? 'delete' : null,
    preferencesHref ? 'preferences' : null,
  ].filter((item) => item !== null)

  const groups = [
    status === 'DRAFT' && onFinalize ? (
      <Button
        key="finalize"
        type="button"
        variant="secondary"
        disabled={isPending}
        onClick={() => run(onFinalize)}
      >
        {isPending ? 'Finalizing…' : 'Finalize'}
      </Button>
    ) : null,
    canEdit && editHref ? (
      <Link
        key="edit"
        href={editHref}
        className={cn(buttonVariants({ variant: 'ghost' }))}
      >
        <Pencil className="size-4" />
        Edit
      </Link>
    ) : null,
    canRecordSend(status) && onSend ? (
      <DropdownMenu key="send">
        <DropdownMenuTrigger
          className={cn(buttonVariants({ variant: 'ghost' }))}
          aria-label="Send"
          disabled={isPending}
        >
          <EnvelopeIcon className="size-4" />
          Send
          <ChevronDownIcon className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-44">
          <DropdownMenuItem onClick={() => run(onSend)}>
            <EnvelopeIcon className="size-4" />
            Email
          </DropdownMenuItem>
          <DropdownMenuItem onClick={shareOnWhatsApp}>
            <ChatBubbleLeftIcon className="size-4" />
            WhatsApp
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null,
    <DocumentShareControls
      key="share"
      sharePath={sharePath}
      documentLabel="invoice"
      disabled={isPending}
    />,
    collectible && recordPaymentHref ? (
      <Link
        key="record-payment"
        href={recordPaymentHref}
        className={cn(buttonVariants({ variant: 'ghost' }))}
      >
        Record payment
      </Link>
    ) : null,
    moreItems.length > 0 ? (
      <DropdownMenu key="more">
        <DropdownMenuTrigger
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
          aria-label="More actions"
          disabled={isPending}
        >
          <EllipsisHorizontalIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          {onClone ? (
            <DropdownMenuItem onClick={() => run(onClone)}>
              <DocumentDuplicateIcon className="size-4" />
              Clone
            </DropdownMenuItem>
          ) : null}
          {onMakeRecurring ? (
            <DropdownMenuItem onClick={() => setRecurringOpen(true)}>
              <ArrowPathIcon className="size-4" />
              Make recurring
            </DropdownMenuItem>
          ) : null}
          {onClone || onMakeRecurring ? <DropdownMenuSeparator /> : null}
          {canVoidFromStatus(status) && onVoid ? (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setVoidOpen(true)}
            >
              Void
            </DropdownMenuItem>
          ) : null}
          {collectible && onWriteOff ? (
            <DropdownMenuItem onClick={() => setWriteOffOpen(true)}>
              Write off
            </DropdownMenuItem>
          ) : null}
          {canDelete && onDelete ? (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash className="size-4" />
              Delete
            </DropdownMenuItem>
          ) : null}
          {preferencesHref ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href={preferencesHref} />}>
                Invoice preferences
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null,
  ].filter((group) => group !== null)

  return (
    <div className="print:hidden">
      <div className="border-border flex min-h-11 flex-wrap items-center gap-0.5 border-b">
        {groups.map((group, index) => (
          <div key={index} className="flex items-center gap-1">
            {index > 0 ? (
              <span
                aria-hidden
                className="bg-border mx-1.5 h-5 w-px"
                data-toolbar-divider
              />
            ) : null}
            {group}
          </div>
        ))}
      </div>

      {error && !voidOpen && !writeOffOpen && !deleteOpen && !recurringOpen ? (
        <p role="alert" className="text-destructive mt-2 text-sm">
          {error}
        </p>
      ) : null}

      {canVoidFromStatus(status) && onVoid ? (
        <AlertDialog open={voidOpen} onOpenChange={setVoidOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Void this invoice?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the remaining receivable and reverses the sale's
                stock movement. The invoice stays in the audit trail.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label htmlFor="invoice-void-reason">Reason (optional)</Label>
              <Textarea
                id="invoice-void-reason"
                value={voidReason}
                onChange={(event) => setVoidReason(event.target.value)}
                placeholder="Why is this invoice being voided?"
                rows={3}
              />
              {error ? (
                <AppError
                  error={{ code: 'invoice/void-failed', message: error }}
                  variant="form"
                />
              ) : null}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>
                Keep invoice
              </AlertDialogCancel>
              <AlertDialogAction
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={() =>
                  run(
                    () => onVoid(voidReason.trim() || null),
                    () => {
                      setVoidOpen(false)
                      setVoidReason('')
                    }
                  )
                }
              >
                {isPending ? 'Voiding…' : 'Void invoice'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      {collectible && onWriteOff ? (
        <AlertDialog open={writeOffOpen} onOpenChange={setWriteOffOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Write off the remaining balance?
              </AlertDialogTitle>
              <AlertDialogDescription>
                The remaining receivable will be cleared as uncollectible
                without recording cash or reversing the sale.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label htmlFor="invoice-write-off-reason">Reason</Label>
              <Textarea
                id="invoice-write-off-reason"
                value={writeOffReason}
                onChange={(event) => setWriteOffReason(event.target.value)}
                placeholder="Why is this balance being written off?"
                rows={3}
              />
              {error ? (
                <AppError
                  error={{ code: 'invoice/write-off-failed', message: error }}
                  variant="form"
                />
              ) : null}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                type="button"
                variant="destructive"
                disabled={isPending || writeOffReason.trim().length === 0}
                onClick={() =>
                  run(
                    () => onWriteOff(writeOffReason.trim()),
                    () => {
                      setWriteOffOpen(false)
                      setWriteOffReason('')
                    }
                  )
                }
              >
                {isPending ? 'Writing off…' : 'Write off balance'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      {canDelete && onDelete ? (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
              <AlertDialogDescription>
                This draft invoice will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {error ? (
              <AppError
                error={{ code: 'invoice/delete-failed', message: error }}
                variant="form"
              />
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={() => run(onDelete, () => setDeleteOpen(false))}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      {onMakeRecurring ? (
        <MakeRecurringDialog
          open={recurringOpen}
          onOpenChange={setRecurringOpen}
          defaultProfileName={document.number}
          pending={isPending}
          error={error}
          onSubmit={(schedule) =>
            run(
              () => onMakeRecurring(schedule),
              () => setRecurringOpen(false)
            )
          }
        />
      ) : null}
    </div>
  )
}

function MakeRecurringDialog({
  open,
  onOpenChange,
  defaultProfileName,
  pending,
  error,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultProfileName: string
  pending: boolean
  error: string | null
  onSubmit: (schedule: DocumentMakeRecurringSchedule) => void
}) {
  const [profileName, setProfileName] = useState(defaultProfileName)
  const [intervalUnit, setIntervalUnit] =
    useState<DocumentRecurrenceIntervalUnit>('month')
  const [intervalCount, setIntervalCount] = useState('1')
  const [startDate, setStartDate] = useState(todayDateInput)
  const [endDate, setEndDate] = useState('')
  const [maxCycles, setMaxCycles] = useState('')
  const [generationMode, setGenerationMode] =
    useState<DocumentRecurrenceGenerationMode>('draft')
  const [validationError, setValidationError] = useState<string | null>(null)

  function submit() {
    if (!profileName.trim()) {
      setValidationError('Enter a profile name.')
      return
    }
    const count = Number(intervalCount)
    if (!Number.isInteger(count) || count < 1) {
      setValidationError(
        'Enter how often to repeat, at least every 1 interval.'
      )
      return
    }
    const startAt = Date.parse(`${startDate}T00:00:00.000Z`)
    if (Number.isNaN(startAt)) {
      setValidationError('Enter a valid start date.')
      return
    }
    let endAt: number | null = null
    if (endDate) {
      const parsed = Date.parse(`${endDate}T00:00:00.000Z`)
      if (Number.isNaN(parsed)) {
        setValidationError('Enter a valid end date.')
        return
      }
      if (parsed < startAt) {
        setValidationError('The end date must be on or after the start date.')
        return
      }
      endAt = Math.floor(parsed / 1000)
    }
    let cycles: number | null = null
    if (maxCycles) {
      const parsed = Number(maxCycles)
      if (!Number.isInteger(parsed) || parsed < 1) {
        setValidationError(
          'Enter the number of invoices to generate (at least 1).'
        )
        return
      }
      cycles = parsed
    }

    setValidationError(null)
    onSubmit({
      profileName: profileName.trim(),
      frequency: { intervalUnit, intervalCount: count },
      startAt: Math.floor(startAt / 1000),
      endAt,
      maxCycles: cycles,
      generationMode,
    })
  }

  const shownError = validationError ?? error

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Make recurring</DialogTitle>
          <DialogDescription>
            Creates a recurring profile from this invoice. The customer,
            currency, lines, terms, notes and discount come from the invoice.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="toolbar-recurring-name">Profile name</Label>
            <Input
              id="toolbar-recurring-name"
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="toolbar-recurring-count">Repeats every</Label>
            <div className="flex gap-2">
              <Input
                id="toolbar-recurring-count"
                type="number"
                min="1"
                value={intervalCount}
                onChange={(event) => setIntervalCount(event.target.value)}
                className="w-24"
              />
              <NativeSelect
                aria-label="Frequency unit"
                value={intervalUnit}
                onChange={(event) =>
                  setIntervalUnit(
                    event.target.value as DocumentRecurrenceIntervalUnit
                  )
                }
              >
                {RECURRING_INTERVAL_UNITS.map((unit) => (
                  <NativeSelectOption key={unit} value={unit}>
                    {unit === 'day'
                      ? 'Day(s)'
                      : unit === 'week'
                        ? 'Week(s)'
                        : unit === 'month'
                          ? 'Month(s)'
                          : 'Year(s)'}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="toolbar-recurring-start">Start date</Label>
            <Input
              id="toolbar-recurring-start"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="toolbar-recurring-end">End date</Label>
            <Input
              id="toolbar-recurring-end"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="toolbar-recurring-cycles">Number of invoices</Label>
            <Input
              id="toolbar-recurring-cycles"
              type="number"
              min="1"
              value={maxCycles}
              onChange={(event) => setMaxCycles(event.target.value)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label id="toolbar-recurring-mode-label">Generated invoices</Label>
            <RadioGroup
              aria-labelledby="toolbar-recurring-mode-label"
              value={generationMode}
              onValueChange={(value) =>
                setGenerationMode(value as DocumentRecurrenceGenerationMode)
              }
              className="gap-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem
                  value="draft"
                  id="toolbar-recurring-mode-draft"
                />
                <Label htmlFor="toolbar-recurring-mode-draft" className="mb-0">
                  Save as draft
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem
                  value="finalize"
                  id="toolbar-recurring-mode-finalize"
                />
                <Label
                  htmlFor="toolbar-recurring-mode-finalize"
                  className="mb-0"
                >
                  Finalize
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem
                  value="finalize-and-send"
                  id="toolbar-recurring-mode-send"
                />
                <Label htmlFor="toolbar-recurring-mode-send" className="mb-0">
                  Finalize and send
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {shownError ? (
          <AppError
            error={{
              code: 'invoice/make-recurring-failed',
              message: shownError,
            }}
            variant="form"
          />
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? 'Creating…' : 'Create profile'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'
import type { ClientResult } from '@/types/api'
import type { SubscriptionStatus } from '@/types/subscription'

export function SubscriptionLifecycleForm({
  subscriptionId,
  status,
  cancelAtPeriodEnd,
  remainingCycles,
}: {
  subscriptionId: string
  status: SubscriptionStatus
  cancelAtPeriodEnd: boolean
  remainingCycles: number | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [deleteConfirmed, setDeleteConfirmed] = useState(false)

  function run(
    operation: () => Promise<ClientResult<unknown>>,
    success: string,
    redirect = false
  ) {
    setMessage(null)
    startTransition(async () => {
      const result = await operation()
      if (result.error) {
        setMessage(result.error.message)
        return
      }
      if (redirect) router.push('/subscriptions')
      else {
        setMessage(success)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      {message ? (
        <p role="status" className="876-card text-muted-foreground p-4 text-sm">
          {message}
        </p>
      ) : null}

      {status === 'ACTIVE' ? (
        <ActionForm
          title="Pause service"
          description="Stop renewal invoicing and optionally resume on a future date. Scheduled changes are canceled when the pause takes effect."
          submitLabel="Pause subscription"
          pending={isPending}
          onSubmit={(data) =>
            run(
              () =>
                client.subscriptions.pause(subscriptionId, {
                  timing: timing(data),
                  effectiveAt: optionalTimestamp(data.get('effectiveAt')),
                  resumeAt: optionalTimestamp(data.get('resumeAt')),
                  pauseUnbilledBehavior: stringValue(data, 'unbilled') as
                    | 'RETAIN'
                    | 'INVOICE_IMMEDIATELY',
                  pauseCreditBehavior: stringValue(data, 'credit') as
                    | 'NONE'
                    | 'PRORATE_CREDIT',
                  resumeBillingBehavior: stringValue(data, 'resumeBehavior') as
                    | 'CONTINUE_EXISTING_PERIOD'
                    | 'START_NEW_PERIOD',
                  reason: optionalString(data.get('reason')),
                }),
              'Pause request saved.'
            )
          }
        >
          <TimingFields idPrefix="pause" />
          <div className="space-y-2">
            <Label htmlFor="pause-resume-at">Automatic resume date</Label>
            <Input id="pause-resume-at" name="resumeAt" type="datetime-local" />
          </div>
          <Select
            name="unbilled"
            label="Unbilled charges"
            options={[
              ['RETAIN', 'Retain for the next invoice'],
              ['INVOICE_IMMEDIATELY', 'Invoice when paused'],
            ]}
          />
          <Select
            name="credit"
            label="Unused prepaid service"
            options={[
              ['NONE', 'No credit'],
              ['PRORATE_CREDIT', 'Issue prorated credit note'],
            ]}
          />
          <Select
            name="resumeBehavior"
            label="Resume period"
            options={[
              [
                'CONTINUE_EXISTING_PERIOD',
                'Continue if the period is still open',
              ],
              ['START_NEW_PERIOD', 'Start a new billing period'],
            ]}
          />
        </ActionForm>
      ) : null}

      {status === 'PAUSED' ? (
        <ActionForm
          title="Resume service"
          description="Continue the existing period when it is still open, or start a new billing period."
          submitLabel="Resume subscription"
          pending={isPending}
          onSubmit={(data) =>
            run(
              () =>
                client.subscriptions.resume(subscriptionId, {
                  timing:
                    data.get('timing') === 'SCHEDULED'
                      ? 'SCHEDULED'
                      : 'IMMEDIATE',
                  effectiveAt: optionalTimestamp(data.get('effectiveAt')),
                  resumeBillingBehavior: stringValue(data, 'resumeBehavior') as
                    | 'CONTINUE_EXISTING_PERIOD'
                    | 'START_NEW_PERIOD',
                  reason: optionalString(data.get('reason')),
                }),
              'Resume request saved.'
            )
          }
        >
          <TimingFields idPrefix="resume" scheduledOnly />
          <Select
            name="resumeBehavior"
            label="Billing period"
            options={[
              ['CONTINUE_EXISTING_PERIOD', 'Continue existing period'],
              ['START_NEW_PERIOD', 'Start a new period'],
            ]}
          />
        </ActionForm>
      ) : null}

      {cancelAtPeriodEnd || status === 'CANCELED' || status === 'ENDED' ? (
        <ActionForm
          title="Reactivate subscription"
          description={
            cancelAtPeriodEnd
              ? 'Stop the scheduled cancellation without creating a new agreement.'
              : 'Create a successor subscription while preserving this agreement and its history.'
          }
          submitLabel="Reactivate"
          pending={isPending}
          onSubmit={(data) =>
            run(
              () =>
                client.subscriptions.reactivate(subscriptionId, {
                  startAt: optionalTimestamp(data.get('startAt')) ?? undefined,
                  reason: optionalString(data.get('reason')),
                }),
              'Subscription reactivated.'
            )
          }
        >
          {!cancelAtPeriodEnd ? (
            <div className="space-y-2">
              <Label htmlFor="reactivate-start">New start date</Label>
              <Input
                id="reactivate-start"
                name="startAt"
                type="datetime-local"
              />
            </div>
          ) : null}
        </ActionForm>
      ) : null}

      {!['CANCELED', 'ENDED'].includes(status) ? (
        <ActionForm
          title="Cancel subscription"
          description="Cancel now, at the end of the current term, or on a specific future date. Financial history remains available."
          submitLabel="Schedule cancellation"
          pending={isPending}
          destructive
          onSubmit={(data) =>
            run(
              () =>
                client.subscriptions.cancel(subscriptionId, {
                  timing: timing(data),
                  effectiveAt: optionalTimestamp(data.get('effectiveAt')),
                  reasonCode: optionalString(data.get('reasonCode')),
                  reason: optionalString(data.get('reason')),
                  feedback: optionalString(data.get('feedback')),
                }),
              'Cancellation request saved.'
            )
          }
        >
          <TimingFields idPrefix="cancel" />
          <div className="space-y-2">
            <Label htmlFor="cancel-code">Reason code</Label>
            <Input
              id="cancel-code"
              name="reasonCode"
              placeholder="customer_request"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="cancel-feedback">Customer feedback</Label>
            <Textarea id="cancel-feedback" name="feedback" rows={3} />
          </div>
        </ActionForm>
      ) : null}

      {!['CANCELED', 'ENDED'].includes(status) && remainingCycles !== null ? (
        <ActionForm
          title="Extend term"
          description={`Current remaining cycles: ${remainingCycles ?? 'unlimited'}. Add cycles or convert the agreement to never expire.`}
          submitLabel="Extend subscription"
          pending={isPending}
          onSubmit={(data) =>
            run(
              () =>
                client.subscriptions.extend(subscriptionId, {
                  additionalCycles: Math.max(
                    1,
                    Number(data.get('additionalCycles'))
                  ),
                  neverExpires: data.get('neverExpires') === 'on',
                  reason: optionalString(data.get('reason')),
                }),
              'Subscription term extended.'
            )
          }
        >
          <div className="space-y-2">
            <Label htmlFor="additional-cycles">Additional cycles</Label>
            <Input
              id="additional-cycles"
              name="additionalCycles"
              type="number"
              min="1"
              defaultValue="1"
              required
            />
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input name="neverExpires" type="checkbox" className="size-4" />{' '}
            Never expires
          </label>
        </ActionForm>
      ) : null}

      <section className="border-destructive/30 bg-destructive/5 space-y-4 rounded-xl border p-5">
        <div>
          <h2 className="font-semibold">Delete from active records</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            This is a soft deletion. Invoices, credit notes, events, and
            reporting joins are retained.
          </p>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={deleteConfirmed}
            onChange={(event) => setDeleteConfirmed(event.target.checked)}
            className="size-4"
          />{' '}
          I understand this removes the subscription from normal views.
        </label>
        <Button
          type="button"
          variant="destructive"
          disabled={isPending || !deleteConfirmed}
          onClick={() =>
            run(
              () => client.subscriptions.delete(subscriptionId),
              'Subscription deleted.',
              true
            )
          }
        >
          Delete subscription
        </Button>
      </section>
    </div>
  )
}

function ActionForm({
  title,
  description,
  submitLabel,
  pending,
  destructive = false,
  onSubmit,
  children,
}: {
  title: string
  description: string
  submitLabel: string
  pending: boolean
  destructive?: boolean
  onSubmit: (data: FormData) => void
  children: React.ReactNode
}) {
  const reasonId = `${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}-reason`
  return (
    <form
      className="876-card space-y-5 p-5"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(new FormData(event.currentTarget))
      }}
    >
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {children}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={reasonId}>Internal reason</Label>
          <Textarea id={reasonId} name="reason" rows={2} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          variant={destructive ? 'destructive' : 'default'}
          disabled={pending}
        >
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}

function TimingFields({
  idPrefix,
  scheduledOnly = false,
}: {
  idPrefix: string
  scheduledOnly?: boolean
}) {
  const [selectedTiming, setSelectedTiming] = useState('IMMEDIATE')

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-timing`}>Effective</Label>
        <NativeSelect
          id={`${idPrefix}-timing`}
          name="timing"
          value={selectedTiming}
          onChange={(event) => setSelectedTiming(event.target.value)}
          className="w-full"
        >
          {(scheduledOnly
            ? [
                ['IMMEDIATE', 'Immediately'],
                ['SCHEDULED', 'Scheduled date'],
              ]
            : [
                ['IMMEDIATE', 'Immediately'],
                ['END_OF_TERM', 'End of current term'],
                ['SCHEDULED', 'Scheduled date'],
              ]
          ).map(([value, text]) => (
            <NativeSelectOption key={value} value={value}>
              {text}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-effective`}>Scheduled date</Label>
        <Input
          id={`${idPrefix}-effective`}
          name="effectiveAt"
          type="datetime-local"
          disabled={selectedTiming !== 'SCHEDULED'}
          required={selectedTiming === 'SCHEDULED'}
        />
      </div>
    </>
  )
}

function Select({
  name,
  label,
  options,
}: {
  name: string
  label: string
  options: Array<[string, string]>
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <NativeSelect id={name} name={name} className="w-full">
        {options.map(([value, text]) => (
          <NativeSelectOption key={value} value={value}>
            {text}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  )
}

function timing(data: FormData) {
  return stringValue(data, 'timing') as
    | 'IMMEDIATE'
    | 'END_OF_TERM'
    | 'SCHEDULED'
}
function stringValue(data: FormData, name: string) {
  return String(data.get(name) ?? '')
}
function optionalString(value: FormDataEntryValue | null) {
  return String(value ?? '').trim() || null
}
function optionalTimestamp(value: FormDataEntryValue | null) {
  const text = String(value ?? '')
  return text ? Math.floor(new Date(text).getTime() / 1000) : null
}

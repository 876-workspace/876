'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'
import {
  formatMinorAmountInput,
  minorAmountInputStep,
  parseMinorAmountInput,
} from '@/lib/format'

interface InvoicePreferenceValues {
  defaultTaxBehavior: 'EXCLUSIVE' | 'INCLUSIVE'
  defaultNotes: string | null
  defaultTerms: string | null
  allowEditingSentInvoices: boolean
  lateFeesEnabled: boolean
  lateFeeCalculationType: 'PERCENTAGE' | 'FIXED'
  lateFeePercent: string | null
  lateFeeAmount: string | null
  lateFeeGraceDays: number
  lateFeeGenerateAsDraft: boolean
}

export function InvoicePreferenceForm({
  initial,
  currency,
  decimalPlaces,
  canManage,
}: {
  initial: InvoicePreferenceValues
  currency: string
  decimalPlaces: number
  canManage: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isAssessing, startAssessment] = useTransition()
  const [taxBehavior, setTaxBehavior] = useState(initial.defaultTaxBehavior)
  const [lateFeesEnabled, setLateFeesEnabled] = useState(
    initial.lateFeesEnabled
  )
  const [lateFeeType, setLateFeeType] = useState(initial.lateFeeCalculationType)
  const [message, setMessage] = useState<string | null>(null)
  const fixedAmount = initial.lateFeeAmount
    ? formatMinorAmountInput(initial.lateFeeAmount, decimalPlaces)
    : ''

  return (
    <div className="space-y-4">
      <form
        className="876-card space-y-6 p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          const lateFeeAmount =
            lateFeeType === 'FIXED'
              ? parseMinorAmountInput(
                  String(data.get('lateFeeValue') ?? ''),
                  decimalPlaces
                )
              : null
          const lateFeePercent =
            lateFeeType === 'PERCENTAGE'
              ? Number(data.get('lateFeeValue'))
              : null
          if (
            lateFeesEnabled &&
            ((lateFeeType === 'FIXED' && lateFeeAmount === null) ||
              (lateFeeType === 'PERCENTAGE' &&
                (!lateFeePercent || lateFeePercent <= 0)))
          ) {
            setMessage('Enter a late-fee value greater than zero.')
            return
          }

          setMessage(null)
          startTransition(async () => {
            const result = await client.invoicePreferences.update({
              defaultTaxBehavior: taxBehavior,
              defaultNotes:
                String(data.get('defaultNotes') ?? '').trim() || null,
              defaultTerms:
                String(data.get('defaultTerms') ?? '').trim() || null,
              allowEditingSentInvoices:
                data.get('allowEditingSentInvoices') === 'on',
              lateFeesEnabled,
              lateFeeCalculationType: lateFeeType,
              lateFeePercent,
              lateFeeAmount,
              lateFeeGraceDays: Number(data.get('lateFeeGraceDays')),
              lateFeeGenerateAsDraft:
                data.get('lateFeeGenerateAsDraft') === 'on',
            })
            if (result.error) {
              setMessage(result.error.message)
              return
            }

            setMessage('Invoice preferences saved.')
            router.refresh()
          })
        }}
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="invoice-default-tax-behavior">
              Default tax display
            </Label>
            <NativeSelect
              id="invoice-default-tax-behavior"
              value={taxBehavior}
              onChange={(event) =>
                setTaxBehavior(event.target.value as typeof taxBehavior)
              }
              disabled={!canManage}
              className="w-full"
            >
              <NativeSelectOption value="EXCLUSIVE">
                Tax exclusive
              </NativeSelectOption>
              <NativeSelectOption value="INCLUSIVE">
                Tax inclusive
              </NativeSelectOption>
            </NativeSelect>
            <p className="text-muted-foreground text-xs text-pretty">
              New invoices snapshot this choice. Existing invoices never change.
            </p>
          </div>
          <label className="border-border flex items-start gap-3 rounded-lg border p-4 text-sm">
            <input
              name="allowEditingSentInvoices"
              type="checkbox"
              defaultChecked={initial.allowEditingSentInvoices}
              disabled={!canManage}
              className="mt-0.5 size-4"
            />
            <span>
              <span className="font-medium">
                Allow sent invoice header edits
              </span>
              <span className="text-muted-foreground mt-1 block text-xs text-pretty">
                Amounts and posted ledger entries remain locked.
              </span>
            </span>
          </label>
          <div className="space-y-2">
            <Label htmlFor="invoice-default-notes">Default customer note</Label>
            <Textarea
              id="invoice-default-notes"
              name="defaultNotes"
              defaultValue={initial.defaultNotes ?? ''}
              disabled={!canManage}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-default-terms">Default terms</Label>
            <Textarea
              id="invoice-default-terms"
              name="defaultTerms"
              defaultValue={initial.defaultTerms ?? ''}
              disabled={!canManage}
              rows={4}
            />
          </div>
        </div>

        <div className="border-border space-y-5 border-t pt-6">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={lateFeesEnabled}
              onChange={(event) => setLateFeesEnabled(event.target.checked)}
              disabled={!canManage}
              className="mt-0.5 size-4"
            />
            <span>
              <span className="font-medium">Enable late fees</span>
              <span className="text-muted-foreground mt-1 block text-xs text-pretty">
                Eligible overdue invoices receive one separately traceable
                late-fee invoice.
              </span>
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="late-fee-type">Calculation</Label>
              <NativeSelect
                id="late-fee-type"
                value={lateFeeType}
                onChange={(event) =>
                  setLateFeeType(event.target.value as typeof lateFeeType)
                }
                disabled={!canManage || !lateFeesEnabled}
                className="w-full"
              >
                <NativeSelectOption value="PERCENTAGE">
                  Percentage of amount due
                </NativeSelectOption>
                <NativeSelectOption value="FIXED">
                  Fixed amount
                </NativeSelectOption>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="late-fee-value">
                {lateFeeType === 'PERCENTAGE'
                  ? 'Percentage'
                  : `Amount (${currency})`}
              </Label>
              <Input
                key={lateFeeType}
                id="late-fee-value"
                name="lateFeeValue"
                type="number"
                min="0"
                max={lateFeeType === 'PERCENTAGE' ? '100' : undefined}
                step={
                  lateFeeType === 'PERCENTAGE'
                    ? '0.0001'
                    : minorAmountInputStep(decimalPlaces)
                }
                defaultValue={
                  lateFeeType === 'PERCENTAGE'
                    ? (initial.lateFeePercent ?? '')
                    : fixedAmount
                }
                disabled={!canManage || !lateFeesEnabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="late-fee-grace-days">Grace period (days)</Label>
              <Input
                id="late-fee-grace-days"
                name="lateFeeGraceDays"
                type="number"
                min="0"
                max="3650"
                defaultValue={initial.lateFeeGraceDays}
                disabled={!canManage || !lateFeesEnabled}
              />
            </div>
            <label className="border-border flex items-center gap-3 rounded-lg border px-4 py-3 text-sm">
              <input
                name="lateFeeGenerateAsDraft"
                type="checkbox"
                defaultChecked={initial.lateFeeGenerateAsDraft}
                disabled={!canManage || !lateFeesEnabled}
                className="size-4"
              />
              Generate as draft for review
            </label>
          </div>
        </div>

        {message ? (
          <p role="status" className="text-muted-foreground text-sm">
            {message}
          </p>
        ) : null}

        {canManage ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isAssessing || !lateFeesEnabled}
              onClick={() => {
                setMessage(null)
                startAssessment(async () => {
                  const result =
                    await client.invoicePreferences.assessLateFees()
                  if (result.error || !result.data) {
                    setMessage(
                      result.error?.message ?? 'Failed to assess late fees.'
                    )
                    return
                  }
                  setMessage(
                    `Created ${result.data.created} late-fee invoice${result.data.created === 1 ? '' : 's'}; skipped ${result.data.skipped}.${result.data.hasMore ? ' More eligible invoices remain; run the assessment again.' : ''}`
                  )
                  router.refresh()
                })
              }}
            >
              {isAssessing ? 'Assessing…' : 'Assess overdue invoices'}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save preferences'}
            </Button>
          </div>
        ) : null}
      </form>
    </div>
  )
}

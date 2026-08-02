'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { client } from '@/lib/client'
import type { SubscriptionPreferenceUpdateInput } from '@/types/subscription'

type Preferences = SubscriptionPreferenceUpdateInput & {
  advanceRules: Array<{
    intervalUnit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
    daysBefore: number
  }>
}

export function SubscriptionPreferenceForm({
  initial,
  canManage,
}: {
  initial: Preferences
  canManage: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [calendarMode, setCalendarMode] = useState(initial.calendarMode)
  const [advanceEnabled, setAdvanceEnabled] = useState(
    initial.advanceBillingEnabled
  )
  const [message, setMessage] = useState<string | null>(null)

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const calendarDays = numberList(data.get('calendarDays'), 1, 31)
        const calendarMonths = numberList(data.get('calendarMonths'), 1, 12)
        if (calendarMode === 'FIXED_DATES' && calendarDays.length === 0) {
          setMessage('Enter at least one calendar billing day.')
          return
        }

        const advanceRules = (
          ['DAY', 'WEEK', 'MONTH', 'YEAR'] as const
        ).flatMap((intervalUnit) => {
          const value = Number(data.get(`advance-${intervalUnit}`))

          return Number.isInteger(value) && value > 0
            ? [{ intervalUnit, daysBefore: value }]
            : []
        })
        setMessage(null)
        startTransition(async () => {
          const result = await client.subscriptions.updatePreferences({
            defaultTaxBehavior: value(data, 'defaultTaxBehavior'),
            defaultCollectionMethod: value(data, 'defaultCollectionMethod'),
            defaultBillingTiming: value(data, 'defaultBillingTiming'),
            defaultProrationBehavior: value(data, 'defaultProrationBehavior'),
            defaultInvoiceMode: value(data, 'defaultInvoiceMode'),
            notifyDraftInvoice: checked(data, 'notifyDraftInvoice'),
            consolidatedBillingEnabled: checked(
              data,
              'consolidatedBillingEnabled'
            ),
            calendarMode,
            calendarDays,
            calendarMonths,
            pauseResumeEnabled: checked(data, 'pauseResumeEnabled'),
            pauseUnbilledChargeBehavior: value(
              data,
              'pauseUnbilledChargeBehavior'
            ),
            pauseCreditBehavior: value(data, 'pauseCreditBehavior'),
            defaultResumeBillingBehavior: value(
              data,
              'defaultResumeBillingBehavior'
            ),
            defaultRenewalPricingPolicy: value(
              data,
              'defaultRenewalPricingPolicy'
            ),
            lockTrialAndFutureActivationPrice: checked(
              data,
              'lockTrialAndFutureActivationPrice'
            ),
            autoApplyCredits: checked(data, 'autoApplyCredits'),
            autoApplyExcessPayments: checked(data, 'autoApplyExcessPayments'),
            advanceBillingEnabled: advanceEnabled,
            advanceBillingMethod: value(data, 'advanceBillingMethod'),
            automateAdvanceBilling: checked(data, 'automateAdvanceBilling'),
            advanceTermsFromPeriodStart: checked(
              data,
              'advanceTermsFromPeriodStart'
            ),
            notifyAdvanceBillingFailure: checked(
              data,
              'notifyAdvanceBillingFailure'
            ),
            advanceRules,
          } as SubscriptionPreferenceUpdateInput)
          if (result.error) {
            setMessage(result.error.message)
            return
          }
          setMessage('Subscription preferences saved.')
          router.refresh()
        })
      }}
    >
      <SettingsSection
        title="Invoice and renewal defaults"
        description="Defaults apply to new subscriptions. Existing agreements retain explicit overrides."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField
            name="defaultTaxBehavior"
            label="Tax display"
            initial={initial.defaultTaxBehavior}
            options={[
              ['EXCLUSIVE', 'Tax exclusive'],
              ['INCLUSIVE', 'Tax inclusive'],
            ]}
            disabled={!canManage}
          />
          <SelectField
            name="defaultCollectionMethod"
            label="Payment mode"
            initial={initial.defaultCollectionMethod}
            options={[
              ['SEND_INVOICE', 'Send invoice'],
              ['AUTO_CHARGE', 'Auto charge'],
            ]}
            disabled={!canManage}
          />
          <SelectField
            name="defaultBillingTiming"
            label="Billing timing"
            initial={initial.defaultBillingTiming}
            options={[
              ['IN_ADVANCE', 'Bill in advance'],
              ['IN_ARREARS', 'Bill in arrears'],
            ]}
            disabled={!canManage}
          />
          <SelectField
            name="defaultProrationBehavior"
            label="Plan-change proration"
            initial={initial.defaultProrationBehavior}
            options={[
              ['CREATE_PRORATIONS', 'Add to next invoice'],
              ['ALWAYS_INVOICE', 'Invoice immediately'],
              ['NONE', 'Do not prorate'],
            ]}
            disabled={!canManage}
          />
          <SelectField
            name="defaultInvoiceMode"
            label="Generated invoice state"
            initial={initial.defaultInvoiceMode}
            options={[
              ['AUTO_FINALIZE', 'Finalize automatically'],
              ['DRAFT', 'Create draft for review'],
            ]}
            disabled={!canManage}
          />
          <SelectField
            name="defaultRenewalPricingPolicy"
            label="Renewal pricing"
            initial={initial.defaultRenewalPricingPolicy}
            options={[
              ['RETAIN_EXISTING', 'Retain subscribed price'],
              ['USE_LATEST', 'Use latest catalog price'],
              ['MARKUP', 'Apply renewal markup'],
              ['MARKDOWN', 'Apply renewal markdown'],
            ]}
            disabled={!canManage}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <CheckField
            name="notifyDraftInvoice"
            initial={initial.notifyDraftInvoice}
            label="Queue a staff notification when a draft renewal invoice is ready"
            disabled={!canManage}
          />
          <CheckField
            name="lockTrialAndFutureActivationPrice"
            initial={initial.lockTrialAndFutureActivationPrice}
            label="Lock catalog price when a trial or future subscription is created"
            disabled={!canManage}
          />
          <CheckField
            name="autoApplyCredits"
            initial={initial.autoApplyCredits}
            label="Apply available customer credits to finalized invoices"
            disabled={!canManage}
          />
          <CheckField
            name="autoApplyExcessPayments"
            initial={initial.autoApplyExcessPayments}
            label="Keep excess offline payments as customer credit"
            disabled={!canManage}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Consolidated and calendar billing"
        description="Combine compatible manual-collection renewals and align new periods to approved dates."
      >
        <CheckField
          name="consolidatedBillingEnabled"
          initial={initial.consolidatedBillingEnabled}
          label="Consolidate compatible subscriptions for the same customer"
          disabled={!canManage}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="calendarMode">Calendar billing</Label>
            <NativeSelect
              id="calendarMode"
              value={calendarMode}
              onChange={(event) =>
                setCalendarMode(event.target.value as typeof calendarMode)
              }
              disabled={!canManage}
              className="w-full"
            >
              <NativeSelectOption value="ANNIVERSARY">
                Subscription anniversary
              </NativeSelectOption>
              <NativeSelectOption value="FIXED_DATES">
                Fixed calendar dates
              </NativeSelectOption>
            </NativeSelect>
          </div>
          <TextField
            name="calendarDays"
            label="Days of month"
            initial={initial.calendarDays.join(', ')}
            placeholder="1, 15, 28"
            disabled={!canManage || calendarMode !== 'FIXED_DATES'}
          />
          <TextField
            name="calendarMonths"
            label="Months (optional)"
            initial={initial.calendarMonths.join(', ')}
            placeholder="1, 4, 7, 10"
            disabled={!canManage || calendarMode !== 'FIXED_DATES'}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Pause and resume"
        description="Control unbilled charges, unused prepaid service, and the default resume period."
      >
        <CheckField
          name="pauseResumeEnabled"
          initial={initial.pauseResumeEnabled}
          label="Allow subscriptions to be paused and resumed"
          disabled={!canManage}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            name="pauseUnbilledChargeBehavior"
            label="Unbilled charges"
            initial={initial.pauseUnbilledChargeBehavior}
            options={[
              ['RETAIN', 'Retain for next invoice'],
              ['INVOICE_IMMEDIATELY', 'Invoice when paused'],
            ]}
            disabled={!canManage}
          />
          <SelectField
            name="pauseCreditBehavior"
            label="Unused prepaid service"
            initial={initial.pauseCreditBehavior}
            options={[
              ['NONE', 'Do not issue credit'],
              ['PRORATE_CREDIT', 'Issue prorated credit note'],
            ]}
            disabled={!canManage}
          />
          <SelectField
            name="defaultResumeBillingBehavior"
            label="Resume billing"
            initial={initial.defaultResumeBillingBehavior}
            options={[
              ['CONTINUE_EXISTING_PERIOD', 'Continue current period'],
              ['START_NEW_PERIOD', 'Start a new period'],
            ]}
            disabled={!canManage}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Advance billing"
        description="Generate future renewal invoices before the service period without moving the entitlement period early."
      >
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={advanceEnabled}
            onChange={(event) => setAdvanceEnabled(event.target.checked)}
            disabled={!canManage}
            className="mt-0.5 size-4"
          />
          <span className="font-medium">Enable advance billing</span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(['DAY', 'WEEK', 'MONTH', 'YEAR'] as const).map((unit) => (
            <TextField
              key={unit}
              name={`advance-${unit}`}
              label={`${unit.toLowerCase()} plans — days before`}
              initial={String(
                initial.advanceRules.find((rule) => rule.intervalUnit === unit)
                  ?.daysBefore ?? ''
              )}
              type="number"
              disabled={!canManage || !advanceEnabled}
            />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            name="advanceBillingMethod"
            label="Document"
            initial={initial.advanceBillingMethod}
            options={[['INVOICE', 'Advance invoice']]}
            disabled={!canManage || !advanceEnabled}
          />
          <CheckField
            name="automateAdvanceBilling"
            initial={initial.automateAdvanceBilling}
            label="Generate automatically from cadence rules"
            disabled={!canManage || !advanceEnabled}
          />
          <CheckField
            name="advanceTermsFromPeriodStart"
            initial={initial.advanceTermsFromPeriodStart}
            label="Calculate payment terms from period start"
            disabled={!canManage || !advanceEnabled}
          />
          <CheckField
            name="notifyAdvanceBillingFailure"
            initial={initial.notifyAdvanceBillingFailure}
            label="Queue a staff notification when advance billing fails"
            disabled={!canManage || !advanceEnabled}
          />
        </div>
      </SettingsSection>

      {message ? (
        <p role="status" className="text-muted-foreground text-sm">
          {message}
        </p>
      ) : null}
      {canManage ? (
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save subscription preferences'}
          </Button>
        </div>
      ) : null}
    </form>
  )
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="876-card space-y-5 p-5 sm:p-6">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      {children}
    </section>
  )
}

function SelectField({
  name,
  label,
  initial,
  options,
  disabled,
}: {
  name: string
  label: string
  initial: string
  options: Array<[string, string]>
  disabled: boolean
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <NativeSelect
        id={name}
        name={name}
        defaultValue={initial}
        disabled={disabled}
        className="w-full"
      >
        {options.map(([value, text]) => (
          <NativeSelectOption key={value} value={value}>
            {text}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  )
}

function TextField({
  name,
  label,
  initial,
  placeholder,
  type = 'text',
  disabled,
}: {
  name: string
  label: string
  initial: string
  placeholder?: string
  type?: string
  disabled: boolean
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        min={type === 'number' ? '1' : undefined}
        defaultValue={initial}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  )
}

function CheckField({
  name,
  label,
  initial,
  disabled,
}: {
  name: string
  label: string
  initial: boolean
  disabled: boolean
}) {
  return (
    <label className="border-border flex items-start gap-3 rounded-lg border p-4 text-sm">
      <input
        name={name}
        type="checkbox"
        defaultChecked={initial}
        disabled={disabled}
        className="mt-0.5 size-4"
      />
      <span>{label}</span>
    </label>
  )
}

function checked(data: FormData, name: string) {
  return data.get(name) === 'on'
}
function value<T extends string>(data: FormData, name: string): T {
  return String(data.get(name) ?? '') as T
}
function numberList(
  value: FormDataEntryValue | null,
  min: number,
  max: number
) {
  return [
    ...new Set(
      String(value ?? '')
        .split(',')
        .map((entry) => Number(entry.trim()))
        .filter(
          (entry) => Number.isInteger(entry) && entry >= min && entry <= max
        )
    ),
  ]
}

'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { client } from '@/lib/client'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function ReportPreferencesForm({
  initial,
  timeZones,
  canManage,
}: {
  initial: { timezone: string; fiscalYearStartMonth: number }
  timeZones: string[]
  canManage: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const filteredZones = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return needle
      ? timeZones.filter((zone) => zone.toLowerCase().includes(needle))
      : timeZones
  }, [query, timeZones])

  return (
    <div className="space-y-4">
      <form
        className="876-card space-y-6 p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          const timezone = String(data.get('timezone') ?? '').trim()
          const fiscalYearStartMonth = Number(data.get('fiscalYearStartMonth'))
          if (!timezone || !timeZones.includes(timezone)) {
            setMessage('Select a reporting timezone from the list.')
            return
          }
          if (
            !Number.isInteger(fiscalYearStartMonth) ||
            fiscalYearStartMonth < 1 ||
            fiscalYearStartMonth > 12
          ) {
            setMessage('Select a fiscal year start month between 1 and 12.')
            return
          }
          setMessage(null)
          startTransition(async () => {
            const result = await client.reportPreferences.update({
              timezone,
              fiscalYearStartMonth,
            })
            if (result.error) {
              setMessage(result.error.message)
              return
            }
            router.refresh()
          })
        }}
      >
        <FormRow label="Reporting timezone" htmlFor="report-timezone">
          <Input
            id="report-timezone-search"
            type="search"
            placeholder="Search timezones"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            disabled={!canManage}
            aria-label="Search timezones"
          />
          <Input
            id="report-timezone"
            name="timezone"
            list="report-timezone-options"
            defaultValue={initial.timezone}
            disabled={!canManage}
            autoComplete="off"
          />
          <datalist id="report-timezone-options">
            {filteredZones.map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
        </FormRow>
        <FormRow label="Fiscal year start" htmlFor="report-fiscal-month">
          <NativeSelect
            id="report-fiscal-month"
            name="fiscalYearStartMonth"
            defaultValue={String(initial.fiscalYearStartMonth)}
            disabled={!canManage}
          >
            {MONTH_NAMES.map((name, index) => (
              <NativeSelectOption key={name} value={String(index + 1)}>
                {name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormRow>
        {canManage ? (
          <Button type="submit" variant="info" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        ) : null}
      </form>
      {message ? (
        <p role="alert" className="text-destructive text-sm">
          {message}
        </p>
      ) : null}
    </div>
  )
}

import Link from 'next/link'
import { buttonVariants } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import {
  REPORT_PRESETS,
  REPORT_PRESET_LABELS,
  resolveReportPreset,
  type ReportPreset,
} from '@876/billing-ui/report-range'

import { unixTimestampToDateInput } from '@/lib/format'

import type { ReportPageParams } from '../_lib/report-params'

function presetHref(
  preset: ReportPreset,
  timeZone: string,
  now: number,
  groupBy: ReportPageParams['groupBy']
): string {
  if (preset === 'custom') return '?preset=custom'
  const range = resolveReportPreset(preset, timeZone, now)
  const query = new URLSearchParams({
    preset,
    from: String(range.from),
    to: String(range.to),
    groupBy,
  })
  return `?${query.toString()}`
}

export function ReportRangeControl({
  timeZone,
  now,
  current,
}: {
  timeZone: string
  now: number
  current: ReportPageParams
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Date range">
        {REPORT_PRESETS.map((preset) => (
          <Link
            key={preset}
            href={presetHref(preset, timeZone, now, current.groupBy)}
            aria-current={current.preset === preset ? 'page' : undefined}
            className={buttonVariants({
              variant: current.preset === preset ? 'secondary' : 'outline',
              size: 'sm',
            })}
          >
            {REPORT_PRESET_LABELS[preset]}
          </Link>
        ))}
      </div>
      {current.preset === 'custom' ? (
        <form method="get" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="preset" value="custom" />
          <div className="grid gap-1.5">
            <Label htmlFor="reports-from-date">From</Label>
            <Input
              id="reports-from-date"
              name="fromDate"
              type="date"
              defaultValue={unixTimestampToDateInput(current.from)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="reports-to-date">To</Label>
            <Input
              id="reports-to-date"
              name="toDate"
              type="date"
              defaultValue={unixTimestampToDateInput(current.to - 1)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="reports-group-by">Group by</Label>
            <NativeSelect
              id="reports-group-by"
              name="groupBy"
              defaultValue={current.groupBy}
            >
              <NativeSelectOption value="day">Day</NativeSelectOption>
              <NativeSelectOption value="week">Week</NativeSelectOption>
              <NativeSelectOption value="month">Month</NativeSelectOption>
            </NativeSelect>
          </div>
          <button
            type="submit"
            className={buttonVariants({ variant: 'info', size: 'sm' })}
          >
            Apply
          </button>
        </form>
      ) : null}
    </div>
  )
}

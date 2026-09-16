'use client'

import Link from 'next/link'

import { formatDay } from '../finance/format-money'

export type ReportPeriodNavProps = {
  basePath: string
  from: number
  to: number
}

const LINK_CLASS = 'text-sm font-medium underline underline-offset-4'

function periodHref(basePath: string, from: number, to: number): string {
  const separator = basePath.includes('?') ? '&' : '?'
  return `${basePath}${separator}from=${from}&to=${to}`
}

function monthStart(now: Date): number {
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000)
}

function nextMonthStart(now: Date): number {
  return Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) / 1000
  )
}

export function ReportPeriodNav({ basePath, from, to }: ReportPeriodNavProps) {
  const span = to - from
  const previous = { from: from - span, to: from }
  const next = { from: to, to: to + span }
  const now = new Date()
  const thisMonth = { from: monthStart(now), to: nextMonthStart(now) }

  return (
    <nav
      aria-label="Report period"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-sm font-medium">
        {formatDay(from)} – {formatDay(to - 1)}
      </p>
      <div className="flex items-center gap-4">
        <Link
          className={LINK_CLASS}
          href={periodHref(basePath, previous.from, previous.to)}
        >
          Previous
        </Link>
        <Link
          className={LINK_CLASS}
          href={periodHref(basePath, thisMonth.from, thisMonth.to)}
        >
          This month
        </Link>
        <Link
          className={LINK_CLASS}
          href={periodHref(basePath, next.from, next.to)}
        >
          Next
        </Link>
      </div>
    </nav>
  )
}

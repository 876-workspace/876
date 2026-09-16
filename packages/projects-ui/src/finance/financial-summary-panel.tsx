'use client'

import type { FinancialSummary } from '@876/projects'

import {
  formatMinutes,
  formatMoney,
  formatMoneyOrUnpriced,
} from './format-money'

export type FinancialSummaryPanelProps = {
  summary: FinancialSummary
  currency: string
}

function MinutesVariance({ value }: { value: number }) {
  const tone = value < 0 ? 'text-destructive' : value > 0 ? 'text-emerald-600' : ''
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return <span className={tone}>{`${sign}${formatMinutes(Math.abs(value))}`}</span>
}

function MoneyVariance({
  value,
  currency,
}: {
  value: number
  currency: string
}) {
  const tone = value < 0 ? 'text-destructive' : value > 0 ? 'text-emerald-600' : ''
  const formatted = formatMoney(Math.abs(value), currency) ?? '—'
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return (
    <span className={tone}>
      {sign}
      {formatted}
    </span>
  )
}

function ConsumptionBar({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent))
  const over = percent >= 100
  return (
    <div
      className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={over ? 'bg-destructive h-full' : 'bg-sky-500 h-full'}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

export function FinancialSummaryPanel({
  summary,
  currency,
}: FinancialSummaryPanelProps) {
  return (
    <div className="space-y-4">
      <div className="876-card grid gap-4 p-5 sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Hours
          </p>
          <p className="mt-1 text-lg font-semibold">
            {formatMinutes(summary.minutes.actualMinutes)}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Planned {formatMinutes(summary.minutes.plannedMinutes)} · Variance{' '}
            <MinutesVariance value={summary.minutes.varianceMinutes} />
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Cost
          </p>
          <p className="mt-1 text-lg font-semibold">
            {formatMoneyOrUnpriced(summary.cost.actualMinor, currency)}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Planned{' '}
            {summary.cost.plannedMinor === null
              ? '—'
              : formatMoneyOrUnpriced(summary.cost.plannedMinor, currency)}
            {' · Variance '}
            {summary.cost.varianceMinor === null ? (
              '—'
            ) : (
              <MoneyVariance
                value={summary.cost.varianceMinor}
                currency={currency}
              />
            )}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Revenue
          </p>
          <p className="mt-1 text-lg font-semibold">
            {formatMoneyOrUnpriced(summary.revenue.actualMinor, currency)}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Planned{' '}
            {summary.revenue.plannedMinor === null
              ? '—'
              : formatMoneyOrUnpriced(summary.revenue.plannedMinor, currency)}
            {' · Variance '}
            {summary.revenue.varianceMinor === null ? (
              '—'
            ) : (
              <MoneyVariance
                value={summary.revenue.varianceMinor}
                currency={currency}
              />
            )}
          </p>
        </div>
      </div>
      {summary.unpricedMinutes > 0 ? (
        <p
          role="status"
          className="border-border bg-muted/20 rounded-lg border px-4 py-3 text-sm"
        >
          {formatMinutes(summary.unpricedMinutes)} of tracked time has no rate
          and is excluded from cost and revenue.
        </p>
      ) : null}
      <div className="876-card space-y-4 p-5">
        <h3 className="text-sm font-semibold">Budget consumption</h3>
        {summary.budgets.length === 0 ? (
          <p className="text-muted-foreground text-sm">No budgets yet</p>
        ) : (
          <ul className="space-y-4">
            {summary.budgets.map((consumption) => {
              const unit =
                consumption.kind === 'hours'
                  ? `${formatMinutes(consumption.spent)} of ${formatMinutes(consumption.budget)}`
                  : `${formatMoneyOrUnpriced(consumption.spent, currency)} of ${formatMoneyOrUnpriced(consumption.budget, currency)}`
              return (
                <li key={consumption.budgetId} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{consumption.scope}</span>
                    <span className="text-muted-foreground">
                      {unit} · {consumption.percent}%
                    </span>
                  </div>
                  <ConsumptionBar percent={consumption.percent} />
                  {consumption.overBudget ? (
                    <p className="text-destructive text-xs font-medium">
                      Over budget
                    </p>
                  ) : consumption.overThreshold ? (
                    <p className="text-amber-600 text-xs font-medium">
                      Over threshold
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

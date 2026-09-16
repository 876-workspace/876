'use client'

import type { BillingMethod, ProjectBilling } from '@876/projects'
import Link from 'next/link'

import { formatMoneyOrUnpriced } from './format-money'

export type BillingConfigSummaryProps = {
  billing: ProjectBilling | null
  editHref: string
  canEdit: boolean
}

export const BILLING_METHOD_LABELS: Record<BillingMethod, string> = {
  'non-billable': 'Non-billable',
  'fixed-fee': 'Fixed fee',
  'time-and-materials': 'Time and materials',
  hourly: 'Hourly',
  'phase-based': 'Phase-based',
}

export function isBillableMethod(method: BillingMethod): boolean {
  return method !== 'non-billable'
}

export function BillingConfigSummary({
  billing,
  editHref,
  canEdit,
}: BillingConfigSummaryProps) {
  if (!billing)
    return (
      <div className="876-card space-y-2 p-5">
        <h3 className="text-sm font-semibold">Billing</h3>
        <p className="text-muted-foreground text-sm">
          No billing configuration yet
        </p>
        {canEdit ? (
          <Link
            className="text-sm font-medium underline underline-offset-4"
            href={editHref}
          >
            Set up billing
          </Link>
        ) : null}
      </div>
    )

  return (
    <div className="876-card space-y-2 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">Billing</h3>
        {canEdit ? (
          <Link
            className="text-sm font-medium underline underline-offset-4"
            href={editHref}
          >
            Edit
          </Link>
        ) : null}
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Method</dt>
          <dd className="font-medium">
            {BILLING_METHOD_LABELS[billing.billingMethod]}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Currency</dt>
          <dd className="font-medium">{billing.currency}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Billing customer</dt>
          <dd className="font-medium">{billing.billingCustomerId ?? 'None'}</dd>
        </div>
        {billing.billingMethod === 'fixed-fee' ? (
          <div>
            <dt className="text-muted-foreground">Fixed fee</dt>
            <dd className="font-medium">
              {formatMoneyOrUnpriced(billing.fixedFeeAmount, billing.currency)}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  )
}

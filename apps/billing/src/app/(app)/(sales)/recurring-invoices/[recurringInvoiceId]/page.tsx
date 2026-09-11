import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  formatRecurringFrequency,
} from '@876/billing-ui/recurring-invoices-list'
import {
  recurringInvoiceStatusVariant,
  type RecurringInvoiceStatus,
} from '@876/billing-ui/document-status'
import { Badge } from '@876/ui/badge'
import {
  DetailCard,
  DetailCardBody,
  DetailCardFact,
  DetailCardFacts,
  DetailCardHeader,
  DetailCardHeadline,
  DetailCardIcon,
  DetailCardIdBar,
  DetailCardSection,
} from '@876/ui/detail-card'
import { ReceiptText } from '@876/ui/icons'

import {
  getWorkspaceContext,
  hasPermission,
} from '@/lib/auth/billing-context'
import { formatDate, formatMoney } from '@/lib/format'
import { getBilling } from '@/lib/services/billing'
import { BillingRecurringInvoiceLifecycleActions } from '../_components/recurring-invoice-lifecycle-actions'

type Props = { params: Promise<{ recurringInvoiceId: string }> }

export const metadata = {
  title: 'Recurring Invoice',
  description: 'Recurring invoice schedule details.',
}

type Profile = Record<string, unknown>

function text(value: unknown, fallback = '—'): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function timestamp(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

function formatGenerationMode(value: unknown): string {
  if (value === 'finalize-and-send') return 'Finalize and send'
  if (value === 'finalize') return 'Finalize'
  return 'Save as draft'
}

export default async function RecurringInvoiceDetailPage({ params }: Props) {
  const { recurringInvoiceId } = await params
  const billing = await getBilling()
  const [result, context] = await Promise.all([
    billing.recurringInvoices.retrieve(recurringInvoiceId),
    getWorkspaceContext(),
  ])
  if (result.error) {
    if (result.error.code === 'billing/recurring-invoice-not-found')
      notFound()
    return (
      <DetailCard aria-label="Recurring invoice unavailable">
        <DetailCardBody>
          <p className="text-muted-foreground text-sm">
            Recurring invoice details are unavailable right now.
          </p>
        </DetailCardBody>
      </DetailCard>
    )
  }

  const profile = result.data as unknown as Profile
  const status = text(profile.status, 'active') as RecurringInvoiceStatus
  const currency = text(profile.currency, 'JMD')
  const frequency = profile.frequency as
    | { intervalUnit?: unknown; intervalCount?: unknown }
    | undefined
  const frequencyLabel = formatRecurringFrequency(
    String(frequency?.intervalUnit ?? 'month'),
    typeof frequency?.intervalCount === 'number'
      ? frequency.intervalCount
      : 1
  )
  const customerId = text(profile.customerId, '')
  const [customer, children] = await Promise.all([
    customerId ? billing.customers.retrieve(customerId) : null,
    billing.invoices.list({ recurringInvoiceId: profile.id as string }),
  ])
  const customerName =
    !customer || customer.error ? '—' : text(customer.data.name, '—')
  const generatedCount =
    typeof profile.generatedCount === 'number' ? profile.generatedCount : 0
  const canWrite = context !== null && hasPermission(context, 'sales:write')
  const lines = Array.isArray(profile.lines)
    ? (profile.lines as Profile[])
    : []
  const childInvoices = children.error ? null : children.data.data

  return (
    <DetailCard aria-label={`Recurring invoice details: ${text(profile.profileName)}`}>
      <DetailCardHeader
        icon={
          <DetailCardIcon>
            <ReceiptText className="size-5" />
          </DetailCardIcon>
        }
        title={text(profile.profileName)}
        meta={
          <Badge variant={recurringInvoiceStatusVariant(status)}>
            <span className="capitalize">{status}</span>
          </Badge>
        }
        subtitle={`${customerName} · ${frequencyLabel}`}
        actions={
          <BillingRecurringInvoiceLifecycleActions
            recurringInvoiceId={String(profile.id)}
            status={status}
            generatedCount={generatedCount}
            canWrite={canWrite}
          />
        }
        closeHref="/recurring-invoices"
        closeLabel="Close recurring invoice details"
      />
      <DetailCardBody className="space-y-8">
        <DetailCardHeadline
          value={formatMoney(
            String(profile.totalAmount ?? '0'),
            currency
          )}
          caption="Template total"
        />
        <DetailCardSection title="Schedule">
          <DetailCardFacts>
            <DetailCardFact label="Customer" value={customerName} />
            <DetailCardFact label="Frequency" value={frequencyLabel} />
            <DetailCardFact
              label="Start date"
              value={formatDate(timestamp(profile.startAt))}
            />
            <DetailCardFact
              label="End date"
              value={
                timestamp(profile.endAt) === null
                  ? '—'
                  : formatDate(timestamp(profile.endAt))
              }
            />
            <DetailCardFact
              label="Invoice limit"
              value={
                typeof profile.maxCycles === 'number'
                  ? String(profile.maxCycles)
                  : '—'
              }
            />
            <DetailCardFact
              label="Next run"
              value={
                timestamp(profile.nextRunAt) === null
                  ? '—'
                  : formatDate(timestamp(profile.nextRunAt))
              }
            />
            <DetailCardFact
              label="Last run"
              value={
                timestamp(profile.lastRunAt) === null
                  ? '—'
                  : formatDate(timestamp(profile.lastRunAt))
              }
            />
            <DetailCardFact
              label="Generated"
              value={String(generatedCount)}
            />
            <DetailCardFact
              label="Generated invoices"
              value={formatGenerationMode(profile.generationMode)}
            />
            <DetailCardFact label="Currency" value={currency} mono />
          </DetailCardFacts>
        </DetailCardSection>
        <DetailCardSection title="Template lines">
          {lines.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              This template has no lines yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {lines.map((line, index) => (
                <li
                  key={String(line.id ?? index)}
                  className="flex items-baseline justify-between gap-4 text-sm"
                >
                  <span className="font-medium">
                    {text(line.description, '—')}
                    <span className="text-muted-foreground ml-2 text-xs font-normal">
                      × {String(line.quantity ?? 1)}
                    </span>
                  </span>
                  <span className="tabular-nums">
                    {formatMoney(String(line.unitAmount ?? '0'), currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DetailCardSection>
        <DetailCardSection title="Generated invoices">
          {childInvoices === null ? (
            <p className="text-muted-foreground text-sm">
              Generated invoices are unavailable right now.
            </p>
          ) : childInvoices.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No invoices have been generated from this schedule yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {childInvoices.map((invoice) => {
                const record = invoice as unknown as Profile
                return (
                  <li
                    key={String(record.id)}
                    className="flex items-baseline justify-between gap-4 text-sm"
                  >
                    <Link
                      href={`/invoices/${String(record.id)}`}
                      className="font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
                    >
                      {text(record.number, String(record.id))}
                    </Link>
                    <span className="tabular-nums">
                      {formatMoney(String(record.totalAmount ?? '0'), currency)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </DetailCardSection>
        {canWrite ? (
          <p className="text-sm">
            <Link
              href={`/recurring-invoices/${String(profile.id)}/edit`}
              className="font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
            >
              Edit this schedule
            </Link>
          </p>
        ) : null}
      </DetailCardBody>
      <DetailCardIdBar>
        <span className="truncate">{String(profile.id)}</span>
      </DetailCardIdBar>
    </DetailCard>
  )
}

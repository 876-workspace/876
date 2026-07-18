import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArrowRight } from '@876/ui/icons'

import { resolveApp } from './_data'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from '@876/ui/card'
import { Button } from '@876/ui/button'
import { $billing } from '@/lib/billing'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'App not found' }
  return { title: `${app.name} - Apps` }
}

async function retrieveBillingStats(sourceAppId: string) {
  try {
    const result = await $billing.stats.apps.retrieve(sourceAppId)
    if (result.error) {
      console.error(
        '[console.billing.stats] app stats retrieve failed:',
        sourceAppId,
        result.error.message
      )
      return null
    }

    return result.data
  } catch (error) {
    console.error(
      '[console.billing.stats] app stats retrieve failed:',
      sourceAppId,
      error
    )
    return null
  }
}

function formatMoney(amount: string, currency: string): string {
  const minorUnits = Number(amount)
  if (!Number.isFinite(minorUnits)) return '$0.00'

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(minorUnits / 100)
  } catch {
    return '$0.00'
  }
}

export default async function AppOverviewPage({ params }: Props) {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) notFound()

  const billingStats = await retrieveBillingStats(app.id)
  const stats = [
    {
      label: 'Monthly recurring revenue',
      value: billingStats
        ? formatMoney(
            billingStats.monthlyRecurringRevenue,
            billingStats.currency
          )
        : '$0.00',
      detail: '+0.0% from last month',
      positive: true,
    },
    {
      label: 'Active subscribers',
      value: String(billingStats?.activeSubscriptions ?? 0),
      detail: '0 new this week',
      positive: true,
    },
    {
      label: 'In trial',
      value: String(billingStats?.trialingSubscriptions ?? 0),
      detail: '0% conversion rate',
      positive: null,
    },
    {
      label: 'Monthly churn',
      value: '0.0%',
      detail: '-0.0% from last month',
      positive: true,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-label="App performance"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        {stats.map((item) => (
          <div key={item.label} className="876-card flex flex-col gap-1 p-5">
            <span className="text-muted-foreground text-xs">{item.label}</span>
            <span className="text-2xl font-semibold tracking-tight tabular-nums">
              {item.value}
            </span>
            <span
              className={
                item.positive
                  ? 'text-xs text-emerald-500'
                  : 'text-muted-foreground text-xs'
              }
            >
              {item.detail}
            </span>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {app.app_kind === 'product' ? (
            <Card className="876-card bg-[var(--876-surface)] ring-0">
              <CardHeader>
                <CardTitle>Recent subscriptions</CardTitle>
                <CardDescription>
                  Latest subscriptions across all plans
                </CardDescription>
                <CardAction>
                  <Button variant="ghost" size="sm" disabled>
                    View all
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6">Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Plan
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Started
                      </TableHead>
                      <TableHead className="pr-6 text-right">MRR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-muted-foreground h-24 text-center"
                      >
                        No recent subscriptions
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <div className="876-card flex h-64 items-center justify-center">
              <span className="text-muted-foreground text-sm">
                No active subscriptions for this app type.
              </span>
            </div>
          )}
        </div>
        <aside aria-label="Additional info" className="lg:col-span-1">
          <div className="876-card flex h-64 items-center justify-center">
            <span className="text-muted-foreground text-sm">
              More insights coming soon
            </span>
          </div>
        </aside>
      </div>
    </div>
  )
}

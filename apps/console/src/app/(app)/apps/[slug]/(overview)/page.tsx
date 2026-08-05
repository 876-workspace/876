import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ArrowRight } from '@876/ui/icons'

import { resolveApp } from '../_data'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from '@876/ui/card'
import { Button } from '@876/ui/button'
import { Skeleton } from '@876/ui/skeleton'
import { $876 } from '@/lib/876'
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
    const result = await $876.billing.stats.apps.retrieve(sourceAppId)
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

export default function AppOverviewPage({ params }: Props) {
  return (
    <Suspense fallback={<AppOverviewSkeleton />}>
      <AppOverviewData params={params} />
    </Suspense>
  )
}

async function AppOverviewData({ params }: Props) {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) notFound()

  if (app.app_kind !== 'product') return null

  return (
    <Suspense fallback={<AppOverviewSkeleton />}>
      <AppPerformance appId={app.id} />
    </Suspense>
  )
}

async function AppPerformance({ appId }: { appId: string }) {
  const billingStats = await retrieveBillingStats(appId)
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
                    <TableHead className="hidden md:table-cell">Plan</TableHead>
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

function AppOverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}

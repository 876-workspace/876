import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { $876 } from '@/lib/876'
import { $billing } from '@/lib/billing'
import { resolveApp } from '../../../_data'
import { SubscribersTable } from './subscribers-table'

type Props = { params: Promise<{ slug: string; planSlug: string }> }

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, planSlug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'Plan Subscribers not found' }

  const { data } = await $876.products.list({ appId: app.id })
  const products = data?.data ?? []
  const product = products.find((p) => p.slug === planSlug || p.id === planSlug)

  if (!product) return { title: 'Plan not found' }
  return { title: `${product.name} Subscribers • ${app.name}` }
}

export default async function PlanSubscribersPage({ params }: Props) {
  const { slug, planSlug } = await params
  const app = await resolveApp(slug)

  if (!app || app.app_kind !== 'product') notFound()

  const { data } = await $876.products.list({ appId: app.id })
  const products = data?.data ?? []

  const product = products.find((p) => p.slug === planSlug || p.id === planSlug)
  if (!product) notFound()

  const billingStats = await retrieveBillingStats(app.id)
  const planStats = billingStats?.plans.find(
    (plan) => plan.entitlementReferenceId === product.id
  )
  const subscribers =
    planStats?.subscribers.map((subscriber) => ({
      id: subscriber.subscriptionId,
      name: subscriber.customerName,
      email: subscriber.externalReference ?? subscriber.customerId,
      status: subscriber.status,
      startedAt: subscriber.startAt,
      mrr: Number(subscriber.monthlyRecurringRevenue),
    })) ?? []

  return (
    <div className="space-y-5">
      <div className="mb-2">
        <h2 className="text-lg font-medium tracking-tight">Subscribers</h2>
      </div>
      <SubscribersTable subscribers={subscribers} />
    </div>
  )
}

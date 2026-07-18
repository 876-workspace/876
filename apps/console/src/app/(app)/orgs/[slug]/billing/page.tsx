import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { buttonVariants } from '@876/ui/button'
import { ArrowRight, CreditCard, Users } from '@876/ui/icons'

import { $billingIntegration } from '@/lib/billing'
import { resolveOrg } from '../_data'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Billing' }
  return { title: `${org.name ?? org.slug} • Billing - Organizations` }
}

export default async function OrganizationBillingPage({ params }: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const billingWorkspace = await $billingIntegration.organizations.retrieve(
    org.id
  )

  const base = `/orgs/${slug}/billing`

  return (
    <div className="space-y-5">
      <h1 className="876-page-title">Billing</h1>

      {billingWorkspace.data && (
        <div className="876-card grid gap-4 p-4 text-sm sm:grid-cols-3">
          <BillingFact label="Workspace" value={billingWorkspace.data.name} />
          <BillingFact
            label="Default currency"
            value={billingWorkspace.data.defaultCurrency}
          />
          <BillingFact label="Status" value={billingWorkspace.data.status} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <BillingLinkCard
          href={`${base}/accounts`}
          icon={<CreditCard className="size-5" aria-hidden="true" />}
          title="Accounts"
          description="Create and maintain invoice profiles, billing emails, and currencies."
        />
        <BillingLinkCard
          href={`${base}/customers`}
          icon={<Users className="size-5" aria-hidden="true" />}
          title="Customers"
          description="View and manage Billing-owned customers through the organization integration API."
        />
        <BillingLinkCard
          href={`${base}/subscriptions`}
          icon={<CreditCard className="size-5" aria-hidden="true" />}
          title="Subscriptions"
          description="Assign plans, switch prices, and update subscription statuses."
        />
      </div>
    </div>
  )
}

function BillingFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  )
}

function BillingLinkCard({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <article className="876-card flex min-h-44 flex-col justify-between p-4">
      <div className="space-y-3">
        <div className="bg-muted text-foreground flex size-10 items-center justify-center rounded-md">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <Link
          href={href}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Open
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}

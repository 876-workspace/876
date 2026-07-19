import { Page, PageHeader, PageTitle } from '@876/ui/page'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getManageContext } from '@/lib/auth/manage-context'

export default async function OrgDashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const ctx = await getManageContext(orgSlug)
  if (!ctx) return null

  if (!ctx.tenant) redirect('/onboarding')

  const { tenant } = ctx

  return (
    <Page>
      <PageHeader>
        <PageTitle>{tenant.name}</PageTitle>
      </PageHeader>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="bg-876-surface rounded-lg border p-5">
          <h2 className="mb-1 font-semibold">Subdomain</h2>
          <p className="text-muted-foreground font-mono text-sm">
            {tenant.slug}.couriers.876.app
          </p>
        </div>
        <div className="bg-876-surface rounded-lg border p-5">
          <h2 className="mb-1 font-semibold">Status</h2>
          <p className="text-sm capitalize">{tenant.status.toLowerCase()}</p>
        </div>
      </section>

      <nav className="mt-6 flex gap-3">
        <Link
          href={`/org/${orgSlug}/settings`}
          className="hover:bg-muted rounded-md border px-4 py-2 text-sm transition-colors"
        >
          Settings
        </Link>
        <Link
          href={`/org/${orgSlug}/domains`}
          className="hover:bg-muted rounded-md border px-4 py-2 text-sm transition-colors"
        >
          Domains
        </Link>
      </nav>
    </Page>
  )
}

import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getManageContext } from '@/lib/auth/manage-context'
import { PageHeader, PageTitle, PageDescription } from '@876/ui/page'

export default async function ManageDashboardPage() {
  const ctx = await getManageContext()
  // Layout guarantees ctx is non-null by the time we reach here.
  if (!ctx) return null

  // No tenant yet — send to onboarding.
  if (!ctx.tenant) {
    redirect('/manage/onboarding')
  }

  const { tenant } = ctx

  return (
    <div className="space-y-8">
      <PageHeader>
        <PageTitle>{tenant.name}</PageTitle>
        <PageDescription>
          Manage your courier platform settings and domains.
        </PageDescription>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-5">
          <h2 className="mb-1 font-semibold">Subdomain</h2>
          <p className="text-muted-foreground font-mono text-sm">
            {tenant.slug}.couriers.876.app
          </p>
        </div>
        <div className="rounded-lg border p-5">
          <h2 className="mb-1 font-semibold">Status</h2>
          <p className="text-sm capitalize">{tenant.status.toLowerCase()}</p>
        </div>
      </section>

      <nav className="flex gap-3">
        <Link
          href="/manage/settings"
          className="hover:bg-muted rounded-md border px-4 py-2 text-sm transition-colors"
        >
          Settings
        </Link>
        <Link
          href="/manage/domains"
          className="hover:bg-muted rounded-md border px-4 py-2 text-sm transition-colors"
        >
          Domains
        </Link>
      </nav>
    </div>
  )
}

import { Page, PageBreadcrumb } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'

import { ProvisioningNav } from '@/app/(app)/orgs/provisioning/_components/provisioning-nav'

/**
 * Detail-shaped, and scoped to this route rather than the `runs` segment — a
 * fallback one level up would be the boundary above the runs table too, and
 * would replay that table on the way into a single run.
 *
 * The breadcrumb, the eyebrow and the section nav are static, so they render on
 * the click; only the run's own identity and facts shimmer.
 */
export default function Loading() {
  return (
    <Page className="space-y-6">
      <PageBreadcrumb
        href="/orgs/provisioning/runs"
        label="Runs"
        className="mb-4"
      />
      <div>
        <p className="876-eyebrow">Provisioning run</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <Skeleton className="h-7 w-72 max-w-full" />
          <Skeleton className="h-5 w-20 rounded-md" />
        </div>
        <Skeleton className="mt-2 h-5 w-56" />
      </div>
      <ProvisioningNav current="runs" />

      <section className="876-card grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-28" />
          </div>
        ))}
      </section>

      <Skeleton className="h-64 w-full rounded-lg" />
    </Page>
  )
}

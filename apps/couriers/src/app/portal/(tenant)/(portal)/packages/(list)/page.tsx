import { Suspense } from 'react'
import { Skeleton } from '@876/ui/skeleton'

import { PackageList } from '@/features/portal/components/package-list'
import { requirePortalCustomer } from '@/lib/portal/customer'
import {
  createPortalCouriersClient,
  listAllPortalPackages,
  requirePortalData,
  toPortalPackageListItem,
} from '@/lib/portal/client'

export default function PortalPackagesPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Packages
      </h1>
      <Suspense fallback={<PackagesSkeleton />}>
        <PackagesData />
      </Suspense>
    </div>
  )
}

async function PackagesData() {
  const { session, tenant } = await requirePortalCustomer('/portal/packages')
  const packages = requirePortalData(
    await listAllPortalPackages(
      createPortalCouriersClient(session.accessToken),
      tenant.id
    )
  ).map(toPortalPackageListItem)

  return (
    <>
      {packages.length > 0 ? (
        <PackageList packages={packages} />
      ) : (
        <div className="text-muted-foreground rounded-xl border border-dashed px-5 py-12 text-center text-[0.8125rem] font-medium">
          No packages yet
        </div>
      )}
    </>
  )
}

function PackagesSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="rounded-xl border p-5">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="mt-3 h-4 w-2/3" />
        </div>
      ))}
    </div>
  )
}

import { PackageList } from '@/components/portal/package-list'
import { requirePortalCustomer } from '@/lib/portal/customer'
import { service } from '@/lib/service'

export default async function PortalPackagesPage() {
  const { tenant, profile } = await requirePortalCustomer('/portal/packages')
  const packages = await service.packages.list({
    tenantId: tenant.id,
    customerId: profile.id,
  })

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Packages
      </h1>

      {packages.length > 0 ? (
        <PackageList packages={packages} />
      ) : (
        <div className="text-muted-foreground rounded-xl border border-dashed px-5 py-12 text-center text-sm font-medium">
          No packages yet
        </div>
      )}
    </div>
  )
}

import Link from 'next/link'
import { Suspense } from 'react'

import { buttonVariants } from '@876/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@876/ui/card'
import { MapPin } from '@876/ui/icons'
import { Skeleton } from '@876/ui/skeleton'

import { CopyableAddressLine } from '@/features/portal/components/copyable-address-line'
import { PackageList } from '@/features/portal/components/package-list'
import { requirePortalCustomer } from '@/lib/portal/customer'
import { service } from '@/lib/service'

export default function PortalDashboardPage() {
  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Dashboard
      </h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <PortalDashboardData />
      </Suspense>
    </div>
  )
}

async function PortalDashboardData() {
  const { session, tenant, profile } = await requirePortalCustomer('/portal')
  const [warehouses, mailboxes, packages] = await Promise.all([
    service.warehouses.list({ tenantId: tenant.id }),
    service.mailboxes.list({
      tenantId: tenant.id,
      customerId: profile.id,
    }),
    service.packages.list({
      tenantId: tenant.id,
      customerId: profile.id,
    }),
  ])
  const warehouse = warehouses[0]
  const mailbox = mailboxes[0]
  const customerName =
    [session.user.firstName, session.user.lastName].filter(Boolean).join(' ') ||
    session.user.email ||
    'Customer'

  return (
    <>
      <Card className="border-primary/15 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="text-primary size-5" />
            Your US shipping address
          </CardTitle>
        </CardHeader>
        <CardContent>
          {warehouse ? (
            <div className="divide-y">
              <CopyableAddressLine label="Full name" value={customerName} />
              <CopyableAddressLine
                label="Address line 1"
                value={[warehouse.address.line1, warehouse.address.line2]
                  .filter(Boolean)
                  .join(', ')}
              />
              {mailbox ? (
                <CopyableAddressLine
                  label="Address line 2"
                  value={mailbox.number}
                />
              ) : (
                <div className="text-muted-foreground py-3 text-[0.8125rem]">
                  Mailbox assignment pending
                </div>
              )}
              <CopyableAddressLine
                label="City, state, ZIP"
                value={formatLocality(
                  warehouse.address.city,
                  warehouse.address.regionName ?? warehouse.address.regionCode,
                  warehouse.address.postalCode
                )}
              />
            </div>
          ) : mailbox ? (
            <div className="space-y-3">
              <CopyableAddressLine
                label="Mailbox number"
                value={mailbox.number}
              />
              <p className="text-muted-foreground text-[0.8125rem]">
                US shipping address pending
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-[0.8125rem]">
              Mailbox assignment pending
            </p>
          )}
        </CardContent>
      </Card>

      <section aria-labelledby="recent-packages-title" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2
            id="recent-packages-title"
            className="text-xl font-semibold tracking-tight"
          >
            Recent packages
          </h2>
          <Link
            href="/portal/packages"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            View all
          </Link>
        </div>

        {packages.length > 0 ? (
          <PackageList packages={packages.slice(0, 5)} />
        ) : (
          <div className="text-muted-foreground rounded-xl border border-dashed px-5 py-10 text-center text-[0.8125rem] font-medium">
            No packages yet
          </div>
        )}
      </section>
    </>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <Card className="border-primary/15 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="text-primary size-5" />
            Your US shipping address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>

      <section aria-labelledby="recent-packages-title" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2
            id="recent-packages-title"
            className="text-xl font-semibold tracking-tight"
          >
            Recent packages
          </h2>
          <Link
            href="/portal/packages"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            View all
          </Link>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="rounded-xl border p-5">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="mt-3 h-4 w-2/3" />
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

function formatLocality(
  city: string,
  state: string | null,
  postalCode: string | null
): string {
  const region = [state, postalCode].filter(Boolean).join(' ')
  return [city, region].filter(Boolean).join(', ')
}

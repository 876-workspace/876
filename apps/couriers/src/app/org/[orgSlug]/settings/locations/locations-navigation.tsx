'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PageBreadcrumb } from '@876/ui/page'
import { Tabs, TabsList, TabsTrigger } from '@876/ui/tabs'

type Props = {
  orgSlug: string
}

export function LocationsNavigation({ orgSlug }: Props) {
  const pathname = usePathname()
  const locationsHref = `/org/${orgSlug}/settings/locations`
  const warehousesHref = `${locationsHref}/warehouses`
  const isWarehouseRoute = pathname.startsWith(warehousesHref)
  const listHref = isWarehouseRoute ? warehousesHref : locationsHref
  const listLabel = isWarehouseRoute ? 'Warehouses' : 'Locations'
  const activeTab = isWarehouseRoute ? 'warehouses' : 'branches'

  return (
    <>
      <PageBreadcrumb
        href={pathname === listHref ? `/org/${orgSlug}/settings` : listHref}
        label={pathname === listHref ? 'Settings' : listLabel}
        className="mb-4"
      />

      {/* The shared layout keeps URL-based tab selection stable across forms. */}
      <Tabs value={activeTab} className="mb-6 gap-0">
        <TabsList variant="line" className="h-auto gap-1 rounded-none p-0">
          <TabsTrigger
            value="branches"
            render={<Link href={locationsHref} />}
            className="h-auto flex-none rounded-none px-3 py-2.5"
          >
            Branches
          </TabsTrigger>
          <TabsTrigger
            value="warehouses"
            render={<Link href={warehousesHref} />}
            className="h-auto flex-none rounded-none px-3 py-2.5"
          >
            Warehouses
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </>
  )
}

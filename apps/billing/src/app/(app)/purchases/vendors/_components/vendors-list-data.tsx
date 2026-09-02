import type { ComponentProps } from 'react'
import { Building2 } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { VendorsList } from './vendors-list'

export async function VendorsListData() {
  const context = await getWorkspaceContext()
  if (!context) return null

  // Fetch unfiltered because layout receives no searchParams.
  const vendors = await service.vendors.list(context.tenant.id)
  const rows = vendors.map((vendor) => ({
    id: vendor.id,
    name: vendor.name,
    email: vendor.email,
    phone: vendor.phone,
    reference: vendor.externalReference ?? 'External vendor',
    defaultCurrency: vendor.defaultCurrency ?? context.tenant.defaultCurrency,
    status: vendor.status,
  }))

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <VendorsList
        vendors={
          rows as unknown as ComponentProps<typeof VendorsList>['vendors']
        }
        emptyState={
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Building2 />
              </EmptyMedia>
              <EmptyTitle>No vendors yet</EmptyTitle>
              <EmptyDescription>
                Vendors will appear here when you add them.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
    </div>
  )
}

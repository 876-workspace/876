import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { UsersIcon } from '@876/ui/icons'
import { get876Client } from '@/lib/876'
import { getManageContext } from '@/lib/auth/manage-context'
import { service } from '@/lib/service'
import { customerStatusSchema } from '@/types/customer'

import { CustomersTable, type CustomerTableRow } from './customers-table'
import { FAKE_CUSTOMERS } from '../_lib/fake-customers'

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string }>
}

export async function CustomersTableData({ params, searchParams }: Props) {
  const { orgSlug } = await params
  const { status } = await searchParams
  const selectedStatus =
    status === 'active' || status === 'suspended' ? status : 'all'
  const profileStatus =
    selectedStatus === 'all'
      ? undefined
      : customerStatusSchema.parse(selectedStatus.toUpperCase())

  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) return <CustomersTable customers={FAKE_CUSTOMERS} />

  // Layer 3 first: this workspace's own enrolled customers are the list. The
  // shared registry is then read only for the identity of those customers.
  const profiles = await service.customerProfiles.list(
    ctx.tenant.id,
    profileStatus
  )

  if (profiles.length === 0) {
    return <CustomersTable customers={FAKE_CUSTOMERS} />
  }

  const billingCustomerIds = profiles.flatMap((profile) =>
    profile.billingCustomerId ? [profile.billingCustomerId] : []
  )

  const $876 = await get876Client()
  const registry = billingCustomerIds.length
    ? await $876.billing.customers.list(ctx.orgId, {
        limit: 100,
        ids: billingCustomerIds,
      })
    : null

  const identityById = new Map(
    registry?.data?.data.map((customer) => [customer.id, customer]) ?? []
  )

  const rows: CustomerTableRow[] = profiles.map((profile) => {
    const identity = identityById.get(profile.billingCustomerId)
    const contact = identity?.primaryContact ?? null
    const customerName =
      [identity?.firstName, identity?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      identity?.name ||
      profile.billingCustomerId

    return {
      id: profile.id,
      billingCustomerId: profile.billingCustomerId,
      customerName,
      companyName: identity?.companyName ?? null,
      email: contact?.email ?? identity?.email ?? null,
      phone: identity?.phone ?? identity?.workPhone ?? null,
      mailboxNumber: profile.mailboxes?.[0]?.number ?? null,
    }
  })

  return (
    <>
      {registry?.error ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive mb-4 rounded-lg border p-4 text-sm">
          {registry.error.message}
        </div>
      ) : null}

      <CustomersTable
        customers={rows}
        emptyState={
          <Empty className="border-0 py-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersIcon />
              </EmptyMedia>
              <EmptyTitle>No customers</EmptyTitle>
            </EmptyHeader>
          </Empty>
        }
      />
    </>
  )
}

import type { CourierCustomerProfile } from '@/lib/db'
import type { CustomerView } from '@/types/customer'

/**
 * Projects a stored profile onto the view contract.
 *
 * The fields are listed rather than spread-minus-tombstones so the view is a
 * declared shape: a column added to the model later has to be added here on
 * purpose before it can reach a caller, instead of leaking out on its own.
 */
export function toCustomerView(profile: CourierCustomerProfile): CustomerView {
  return {
    id: profile.id,
    tenantId: profile.tenantId,
    userId: profile.userId,
    billingCustomerId: profile.billingCustomerId,
    branchId: profile.branchId,
    status: profile.status,
    trn: profile.trn,
    isCommercial: profile.isCommercial,
    firstSeenAt: profile.firstSeenAt,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  }
}

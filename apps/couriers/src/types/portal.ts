import type { CourierCustomerProfile, Tenant } from '@/lib/db'
import type { ServiceResult } from '@/types/api'
import type { PackageStatus } from '@/types/package'

export interface PortalCustomer extends CourierCustomerProfile {
  primaryMailboxNumber: string
}

export interface PortalCustomerEnsureParams {
  tenant: Tenant
  userId: string
  email: string
  firstName?: string | null
  lastName?: string | null
}

export type EnsurePortalCustomerResult = ServiceResult<PortalCustomer>

export type PortalTimelineState = 'reached' | 'current' | 'pending'

export interface PortalTimelineStep {
  status: PackageStatus
  label: string
  state: PortalTimelineState
}

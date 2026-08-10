import type { ServiceResult } from '@/types/api'
import type { CouriersTenant } from '@/types/auth'
import type { PackageStatus } from '@/types/package'

export interface PortalCustomer {
  id: string
  tenantId: string
  userId: string | null
  billingCustomerId: string
  branchId: string | null
  status: 'ACTIVE' | 'SUSPENDED'
  trn: string | null
  isCommercial: boolean
  firstSeenAt: number
  createdAt: number
  updatedAt: number
  deletedAt?: number | null
  deletedBy?: string | null
  deletionReason?: string | null
  primaryMailboxNumber: string
}

export interface PortalCustomerEnsureParams {
  tenant: CouriersTenant
  userId: string
  email: string
  firstName?: string | null
  lastName?: string | null
  accessToken?: string
}

export type EnsurePortalCustomerResult = ServiceResult<PortalCustomer>

export type PortalTimelineState = 'reached' | 'current' | 'pending'

export interface PortalTimelineStep {
  status: PackageStatus
  label: string
  state: PortalTimelineState
}

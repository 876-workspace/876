/**
 * The finance permission vocabulary is owned by `@876/core/access` — the route
 * handlers that persist a role need the same types and cannot import a React
 * package. Re-exported here so a panel has one import for everything it renders.
 */
export type {
  FinanceApp,
  FinancePermissionKey,
  FinancePermissionModule,
  FinancePermissionSurface,
} from '@876/core/access/finance-catalog'

import type { FinancePermissionKey } from '@876/core/access/finance-catalog'

export type FinanceRoleSummary = {
  id: string
  slug: string
  name: string
  description: string
  permissions: FinancePermissionKey[]
  isSystem: boolean
  isDefault: boolean
  memberCount: number
}

export type FinanceMemberSummary = {
  id: string
  userId: string
  name: string
  email: string
  avatarUrl: string | null
  joinedAt?: number | null
  roleId: string
  roleName: string
  status: 'ACTIVE' | 'SUSPENDED'
}

export type FinanceInviteSummary = {
  id: string
  email: string
  roleId: string
  roleName: string
  expiresAt: number | null
}

export type FinanceActionResult = {
  error: { code: string; message: string } | null
}

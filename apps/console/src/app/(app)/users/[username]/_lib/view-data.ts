import type { AdminAccount, AdminUser, AdminUserApp } from '@876/admin'

import type {
  AccountShape,
  EnforcementTag,
  UserOrgMembership,
  UserRelationship,
  UserRequestSummary,
} from '@/types/customer'

/**
 * Everything the three overview variants read.
 *
 * Resolved once in `page.tsx` and handed to whichever variant is active, so the
 * layouts differ only in composition — never in what data they can see. A
 * variant that fetched its own data would make the comparison meaningless, and
 * would be three places to wire 876 Desk into instead of one.
 */
export type UserViewData = {
  user: AdminUser
  shape: AccountShape
  tags: EnforcementTag[]
  accounts: AdminAccount[]
  memberships: UserOrgMembership[]
  apps: AdminUserApp[]
  relationships: UserRelationship[]
  requests: UserRequestSummary[]
  addressCount: number
  contactCount: number
}

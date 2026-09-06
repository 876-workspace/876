import { describe, expect, it } from 'vitest'
import { memberInitials, memberName, memberRoleLabel } from './member-utils'
import type { OrgMember } from './member-types'
const base: OrgMember = { object: 'organization_member', id: 'mem_1', user_id: 'usr_1', role: 'super-admin', role_id: null, position: null, status: 'active', first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com', avatar: null, created_at: 1 }
describe('shared member utilities', () => {
  it('prefers the full member name', () => { expect(memberName(base)).toBe('Ada Lovelace') })
  it('falls back to email', () => { expect(memberName({ ...base, first_name: null, last_name: null })).toBe('ada@example.com') })
  it('falls back to user id and creates initials', () => { const value = { ...base, first_name: null, last_name: null, email: null }; expect(memberName(value)).toBe('usr_1'); expect(memberInitials(value)).toBe('U') })
  it('humanizes role keys', () => { expect(memberRoleLabel('super-admin')).toBe('Super Admin'); expect(memberRoleLabel('billing_manager')).toBe('Billing Manager') })
})

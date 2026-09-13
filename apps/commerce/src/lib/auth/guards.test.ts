import { describe, expect, it } from 'vitest'
import { resolveCommerceAccess } from './guards'
describe('Commerce guards', () => {
  it('identifies signed-out visitors', () =>
    expect(
      resolveCommerceAccess({
        signedIn: false,
        hasOrganization: false,
        isAdmin: false,
        entitled: false,
      })
    ).toBe('signed-out'))
  it('identifies accounts without an organization', () =>
    expect(
      resolveCommerceAccess({
        signedIn: true,
        hasOrganization: false,
        isAdmin: false,
        entitled: false,
      })
    ).toBe('no-organization'))
  it('sends admins without an entitlement to onboarding', () =>
    expect(
      resolveCommerceAccess({
        signedIn: true,
        hasOrganization: true,
        isAdmin: true,
        entitled: false,
      })
    ).toBe('admin-without-entitlement'))
  it('denies members without an entitlement', () =>
    expect(
      resolveCommerceAccess({
        signedIn: true,
        hasOrganization: true,
        isAdmin: false,
        entitled: false,
      })
    ).toBe('member-without-entitlement'))
  it('allows entitled members', () =>
    expect(
      resolveCommerceAccess({
        signedIn: true,
        hasOrganization: true,
        isAdmin: false,
        entitled: true,
      })
    ).toBe('entitled'))
})

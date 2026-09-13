import { describe, expect, it } from 'vitest'
import { resolveCommerceAccess } from './guards'
describe('Commerce guards', () => {
  it('identifies signed-out visitors', () =>
    expect(
      resolveCommerceAccess({
        signedIn: false,
        enterpriseRealm: false,
        hasOrganization: false,
        isAdmin: false,
        accessStatus: 'none',
      })
    ).toBe('signed-out'))
  it('identifies accounts without an organization', () =>
    expect(
      resolveCommerceAccess({
        signedIn: true,
        enterpriseRealm: false,
        hasOrganization: false,
        isAdmin: false,
        accessStatus: 'none',
      })
    ).toBe('wrong-account'))
  it('identifies enterprise accounts without an organization', () =>
    expect(
      resolveCommerceAccess({
        signedIn: true,
        enterpriseRealm: true,
        hasOrganization: false,
        isAdmin: false,
        accessStatus: 'none',
      })
    ).toBe('no-organization'))
  it('sends admins without an entitlement to onboarding', () =>
    expect(
      resolveCommerceAccess({
        signedIn: true,
        enterpriseRealm: true,
        hasOrganization: true,
        isAdmin: true,
        accessStatus: 'none',
      })
    ).toBe('admin-without-entitlement'))
  it('denies members without an entitlement', () =>
    expect(
      resolveCommerceAccess({
        signedIn: true,
        enterpriseRealm: true,
        hasOrganization: true,
        isAdmin: false,
        accessStatus: 'none',
      })
    ).toBe('member-without-entitlement'))
  it('allows entitled members', () =>
    expect(
      resolveCommerceAccess({
        signedIn: true,
        enterpriseRealm: true,
        hasOrganization: true,
        isAdmin: false,
        accessStatus: 'active',
      })
    ).toBe('entitled'))
  it('allows trialing members', () =>
    expect(
      resolveCommerceAccess({
        signedIn: true,
        enterpriseRealm: true,
        hasOrganization: true,
        isAdmin: false,
        accessStatus: 'trialing',
      })
    ).toBe('entitled'))
  it('marks a blocked entitlement for onboarding to deny', () =>
    expect(
      resolveCommerceAccess({
        signedIn: true,
        enterpriseRealm: true,
        hasOrganization: true,
        isAdmin: true,
        accessStatus: 'blocked',
      })
    ).toBe('blocked'))
})

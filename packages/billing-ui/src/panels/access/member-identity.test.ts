import { describe, expect, it } from 'vitest'
import {
  toFinanceMemberSummaries,
  type FinanceGrant,
  type MemberIdentity,
} from './member-identity'

describe('toFinanceMemberSummaries', () => {
  it('a grant whose identity is present renders "First Last"', () => {
    const grants: FinanceGrant[] = [
      {
        userId: 'user_2kL9mN4q',
        roleId: 'role_billing_admin',
        roleName: 'Billing Administrator',
        status: 'ACTIVE',
        joinedAt: 1714560000,
      },
    ]
    const identities: MemberIdentity[] = [
      {
        userId: 'user_2kL9mN4q',
        firstName: 'Raheem',
        lastName: 'Sterling',
        email: 'raheem@efesto.example',
        avatarUrl: 'https://cdn.efesto.example/avatars/raheem.png',
      },
    ]

    expect(toFinanceMemberSummaries(grants, identities)).toEqual([
      {
        id: 'user_2kL9mN4q',
        userId: 'user_2kL9mN4q',
        name: 'Raheem Sterling',
        email: 'raheem@efesto.example',
        avatarUrl: 'https://cdn.efesto.example/avatars/raheem.png',
        joinedAt: 1714560000,
        roleId: 'role_billing_admin',
        roleName: 'Billing Administrator',
        status: 'ACTIVE',
      },
    ])
  })

  it('an identity with no first/last name falls back to its email', () => {
    const grants: FinanceGrant[] = [
      {
        userId: 'user_7xR3pQ8w',
        roleId: 'role_bookkeeper',
        roleName: 'Bookkeeper',
        status: 'ACTIVE',
        joinedAt: 1717238400,
      },
    ]
    const identities: MemberIdentity[] = [
      {
        userId: 'user_7xR3pQ8w',
        firstName: null,
        lastName: null,
        email: 'accounting-ops@efesto.example',
        avatarUrl: null,
      },
    ]

    expect(toFinanceMemberSummaries(grants, identities)).toEqual([
      {
        id: 'user_7xR3pQ8w',
        userId: 'user_7xR3pQ8w',
        name: 'accounting-ops@efesto.example',
        email: 'accounting-ops@efesto.example',
        avatarUrl: null,
        joinedAt: 1717238400,
        roleId: 'role_bookkeeper',
        roleName: 'Bookkeeper',
        status: 'ACTIVE',
      },
    ])
  })

  it('a grant with no matching identity is still returned, labelled with the account id, and is not dropped', () => {
    const grants: FinanceGrant[] = [
      {
        userId: 'user_4mK1vT9z',
        roleId: 'role_auditor',
        roleName: 'Auditor',
        status: 'ACTIVE',
        joinedAt: 1719830400,
      },
    ]
    const identities: MemberIdentity[] = []

    expect(toFinanceMemberSummaries(grants, identities)).toEqual([
      {
        id: 'user_4mK1vT9z',
        userId: 'user_4mK1vT9z',
        name: 'user_4mK1vT9z',
        email: '',
        avatarUrl: null,
        joinedAt: 1719830400,
        roleId: 'role_auditor',
        roleName: 'Auditor',
        status: 'ACTIVE',
      },
    ])
  })

  it("the email is '' and the avatar null when no identity matches", () => {
    const grants: FinanceGrant[] = [
      {
        userId: 'user_9bH6eF2d',
        roleId: 'role_viewer',
        roleName: 'Viewer',
        status: 'SUSPENDED',
        joinedAt: null,
      },
    ]
    const identities: MemberIdentity[] = [
      {
        userId: 'user_other_account',
        firstName: 'Elena',
        lastName: 'Rostova',
        email: 'elena.rostova@efesto.example',
        avatarUrl: 'https://cdn.efesto.example/avatars/elena.png',
      },
    ]

    expect(toFinanceMemberSummaries(grants, identities)).toEqual([
      {
        id: 'user_9bH6eF2d',
        userId: 'user_9bH6eF2d',
        name: 'user_9bH6eF2d',
        email: '',
        avatarUrl: null,
        joinedAt: null,
        roleId: 'role_viewer',
        roleName: 'Viewer',
        status: 'SUSPENDED',
      },
    ])
  })

  it('joinedAt defaults to null when the grant omits it', () => {
    const grants: FinanceGrant[] = [
      {
        userId: 'user_5vC8jP3x',
        roleId: 'role_viewer',
        roleName: 'Viewer',
        status: 'ACTIVE',
      },
    ]
    const identities: MemberIdentity[] = [
      {
        userId: 'user_5vC8jP3x',
        firstName: 'Alyssa',
        lastName: 'Chen',
        email: 'alyssa.chen@efesto.example',
        avatarUrl: null,
      },
    ]

    expect(toFinanceMemberSummaries(grants, identities)).toEqual([
      {
        id: 'user_5vC8jP3x',
        userId: 'user_5vC8jP3x',
        name: 'Alyssa Chen',
        email: 'alyssa.chen@efesto.example',
        avatarUrl: null,
        joinedAt: null,
        roleId: 'role_viewer',
        roleName: 'Viewer',
        status: 'ACTIVE',
      },
    ])
  })

  it('the returned array has exactly one entry per grant, in grant order', () => {
    const grants: FinanceGrant[] = [
      {
        userId: 'user_2kL9mN4q',
        roleId: 'role_billing_admin',
        roleName: 'Billing Administrator',
        status: 'ACTIVE',
        joinedAt: 1714560000,
      },
      {
        userId: 'user_7xR3pQ8w',
        roleId: 'role_bookkeeper',
        roleName: 'Bookkeeper',
        status: 'ACTIVE',
        joinedAt: 1717238400,
      },
      {
        userId: 'user_4mK1vT9z',
        roleId: 'role_viewer',
        roleName: 'Viewer',
        status: 'SUSPENDED',
        joinedAt: null,
      },
    ]
    const identities: MemberIdentity[] = [
      {
        userId: 'user_4mK1vT9z',
        firstName: 'Tariq',
        lastName: 'Mansour',
        email: 'tariq.mansour@efesto.example',
        avatarUrl: null,
      },
      {
        userId: 'user_7xR3pQ8w',
        firstName: 'Marina',
        lastName: 'Silva',
        email: 'marina.silva@efesto.example',
        avatarUrl: 'https://cdn.efesto.example/avatars/marina.png',
      },
      {
        userId: 'user_2kL9mN4q',
        firstName: 'Raheem',
        lastName: 'Sterling',
        email: 'raheem@efesto.example',
        avatarUrl: 'https://cdn.efesto.example/avatars/raheem.png',
      },
    ]

    expect(toFinanceMemberSummaries(grants, identities)).toEqual([
      {
        id: 'user_2kL9mN4q',
        userId: 'user_2kL9mN4q',
        name: 'Raheem Sterling',
        email: 'raheem@efesto.example',
        avatarUrl: 'https://cdn.efesto.example/avatars/raheem.png',
        joinedAt: 1714560000,
        roleId: 'role_billing_admin',
        roleName: 'Billing Administrator',
        status: 'ACTIVE',
      },
      {
        id: 'user_7xR3pQ8w',
        userId: 'user_7xR3pQ8w',
        name: 'Marina Silva',
        email: 'marina.silva@efesto.example',
        avatarUrl: 'https://cdn.efesto.example/avatars/marina.png',
        joinedAt: 1717238400,
        roleId: 'role_bookkeeper',
        roleName: 'Bookkeeper',
        status: 'ACTIVE',
      },
      {
        id: 'user_4mK1vT9z',
        userId: 'user_4mK1vT9z',
        name: 'Tariq Mansour',
        email: 'tariq.mansour@efesto.example',
        avatarUrl: null,
        joinedAt: null,
        roleId: 'role_viewer',
        roleName: 'Viewer',
        status: 'SUSPENDED',
      },
    ])
  })

  it('neither input array is mutated', () => {
    const grant: FinanceGrant = {
      userId: 'user_2kL9mN4q',
      roleId: 'role_billing_admin',
      roleName: 'Billing Administrator',
      status: 'ACTIVE',
      joinedAt: 1714560000,
    }
    const identity: MemberIdentity = {
      userId: 'user_2kL9mN4q',
      firstName: 'Raheem',
      lastName: 'Sterling',
      email: 'raheem@efesto.example',
      avatarUrl: 'https://cdn.efesto.example/avatars/raheem.png',
    }

    const grants = Object.freeze([Object.freeze({ ...grant })])
    const identities = Object.freeze([Object.freeze({ ...identity })])

    const result = toFinanceMemberSummaries(grants, identities)

    expect(grants).toEqual([grant])
    expect(identities).toEqual([identity])
    expect(result).toEqual([
      {
        id: 'user_2kL9mN4q',
        userId: 'user_2kL9mN4q',
        name: 'Raheem Sterling',
        email: 'raheem@efesto.example',
        avatarUrl: 'https://cdn.efesto.example/avatars/raheem.png',
        joinedAt: 1714560000,
        roleId: 'role_billing_admin',
        roleName: 'Billing Administrator',
        status: 'ACTIVE',
      },
    ])
  })

  it('a duplicate identity for the same userId does not duplicate the row', () => {
    const grants: FinanceGrant[] = [
      {
        userId: 'user_2kL9mN4q',
        roleId: 'role_billing_admin',
        roleName: 'Billing Administrator',
        status: 'ACTIVE',
        joinedAt: 1714560000,
      },
    ]
    const identities: MemberIdentity[] = [
      {
        userId: 'user_2kL9mN4q',
        firstName: 'Raheem',
        lastName: 'Sterling',
        email: 'raheem.old@efesto.example',
        avatarUrl: null,
      },
      {
        userId: 'user_2kL9mN4q',
        firstName: 'Raheem',
        lastName: 'Sterling',
        email: 'raheem@efesto.example',
        avatarUrl: 'https://cdn.efesto.example/avatars/raheem.png',
      },
    ]

    expect(toFinanceMemberSummaries(grants, identities)).toEqual([
      {
        id: 'user_2kL9mN4q',
        userId: 'user_2kL9mN4q',
        name: 'Raheem Sterling',
        email: 'raheem@efesto.example',
        avatarUrl: 'https://cdn.efesto.example/avatars/raheem.png',
        joinedAt: 1714560000,
        roleId: 'role_billing_admin',
        roleName: 'Billing Administrator',
        status: 'ACTIVE',
      },
    ])
  })

  it('renders only first name when last name is null', () => {
    const grants: FinanceGrant[] = [
      {
        userId: 'user_3hJ5kL7m',
        roleId: 'role_viewer',
        roleName: 'Viewer',
        status: 'ACTIVE',
        joinedAt: 1720000000,
      },
    ]
    const identities: MemberIdentity[] = [
      {
        userId: 'user_3hJ5kL7m',
        firstName: 'Zainab',
        lastName: null,
        email: 'zainab@efesto.example',
        avatarUrl: null,
      },
    ]

    expect(toFinanceMemberSummaries(grants, identities)).toEqual([
      {
        id: 'user_3hJ5kL7m',
        userId: 'user_3hJ5kL7m',
        name: 'Zainab',
        email: 'zainab@efesto.example',
        avatarUrl: null,
        joinedAt: 1720000000,
        roleId: 'role_viewer',
        roleName: 'Viewer',
        status: 'ACTIVE',
      },
    ])
  })

  it('renders only last name when first name is null', () => {
    const grants: FinanceGrant[] = [
      {
        userId: 'user_6pQ8rS0t',
        roleId: 'role_viewer',
        roleName: 'Viewer',
        status: 'ACTIVE',
        joinedAt: 1721000000,
      },
    ]
    const identities: MemberIdentity[] = [
      {
        userId: 'user_6pQ8rS0t',
        firstName: null,
        lastName: 'Kovacs',
        email: 'kovacs@efesto.example',
        avatarUrl: null,
      },
    ]

    expect(toFinanceMemberSummaries(grants, identities)).toEqual([
      {
        id: 'user_6pQ8rS0t',
        userId: 'user_6pQ8rS0t',
        name: 'Kovacs',
        email: 'kovacs@efesto.example',
        avatarUrl: null,
        joinedAt: 1721000000,
        roleId: 'role_viewer',
        roleName: 'Viewer',
        status: 'ACTIVE',
      },
    ])
  })

  it('falls back to account id when identity has empty name and null email', () => {
    const grants: FinanceGrant[] = [
      {
        userId: 'user_8xY2wZ4v',
        roleId: 'role_bookkeeper',
        roleName: 'Bookkeeper',
        status: 'ACTIVE',
        joinedAt: 1722000000,
      },
    ]
    const identities: MemberIdentity[] = [
      {
        userId: 'user_8xY2wZ4v',
        firstName: null,
        lastName: null,
        email: null,
        avatarUrl: null,
      },
    ]

    expect(toFinanceMemberSummaries(grants, identities)).toEqual([
      {
        id: 'user_8xY2wZ4v',
        userId: 'user_8xY2wZ4v',
        name: 'user_8xY2wZ4v',
        email: '',
        avatarUrl: null,
        joinedAt: 1722000000,
        roleId: 'role_bookkeeper',
        roleName: 'Bookkeeper',
        status: 'ACTIVE',
      },
    ])
  })

  it('returns an empty array when grants is empty even if identities exist', () => {
    const identities: MemberIdentity[] = [
      {
        userId: 'user_2kL9mN4q',
        firstName: 'Raheem',
        lastName: 'Sterling',
        email: 'raheem@efesto.example',
        avatarUrl: 'https://cdn.efesto.example/avatars/raheem.png',
      },
    ]

    expect(toFinanceMemberSummaries([], identities)).toEqual([])
  })
})

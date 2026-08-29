import { describe, expect, it } from 'vitest'
import { validateTeamGrant } from './validation'

describe('validateTeamGrant — comprehensive access control', () => {
  const now = BigInt(1_000_000)

  it('staff without extra fields passes', () => {
    expect(
      validateTeamGrant(
        {
          affiliation: 'staff',
          title: null,
          expiresAt: null,
          justification: null,
        },
        'admin',
        now
      ).error
    ).toBeNull()
  })

  it('staff with title fails (external title not allowed)', () => {
    const r = validateTeamGrant(
      { affiliation: 'staff', title: 'Manager' },
      'admin',
      now
    )
    expect(r.error?.code).toBe('team/staff-title-not-allowed')
  })

  it('contractor requires expiry and justification', () => {
    expect(
      validateTeamGrant(
        { affiliation: 'contractor', expiresAt: null, justification: 'need' },
        'admin',
        now
      ).error?.code
    ).toBe('team/expiry-required')
    expect(
      validateTeamGrant(
        {
          affiliation: 'contractor',
          expiresAt: BigInt(2_000_000),
          justification: null,
        },
        'admin',
        now
      ).error?.code
    ).toBe('team/justification-required')
  })

  it('contractor with past expiry fails', () => {
    const r = validateTeamGrant(
      {
        affiliation: 'contractor',
        expiresAt: BigInt(500_000),
        justification: 'j',
      },
      'admin',
      now
    )
    expect(r.error?.code).toBe('team/expiry-invalid')
  })

  it('contractor with future expiry and justification passes', () => {
    const r = validateTeamGrant(
      {
        affiliation: 'contractor',
        expiresAt: BigInt(2_000_000),
        justification: 'project',
      },
      'staff',
      now
    )
    expect(r.error).toBeNull()
    expect(r.data?.affiliation).toBe('contractor')
  })

  it('external requires expiry and justification and title allowed', () => {
    const r = validateTeamGrant(
      {
        affiliation: 'external',
        title: 'Consultant',
        expiresAt: BigInt(2_000_000),
        justification: 'audit',
      },
      'staff',
      now
    )
    expect(r.error).toBeNull()
    expect(r.data?.title).toBe('Consultant')
  })

  it('invalid affiliation fails', () => {
    const r = validateTeamGrant(
      {
        affiliation: 'intern' as unknown as 'staff',
        expiresAt: null,
        justification: null,
      },
      'admin',
      now
    )
    expect(r.error?.code).toBe('team/invalid-affiliation')
  })

  it('staff-only roles not allowed for contractor/external', () => {
    for (const role of ['owner', 'super_admin']) {
      expect(
        validateTeamGrant(
          {
            affiliation: 'contractor',
            expiresAt: BigInt(2_000_000),
            justification: 'j',
          },
          role,
          now
        ).error?.code
      ).toBe('team/role-not-allowed-for-affiliation')
      expect(
        validateTeamGrant(
          {
            affiliation: 'external',
            expiresAt: BigInt(2_000_000),
            justification: 'j',
          },
          role,
          now
        ).error?.code
      ).toBe('team/role-not-allowed-for-affiliation')
    }
  })

  it('staff-only roles allowed for staff', () => {
    expect(
      validateTeamGrant({ affiliation: 'staff' }, 'owner', now).error
    ).toBeNull()
    expect(
      validateTeamGrant({ affiliation: 'staff' }, 'super_admin', now).error
    ).toBeNull()
  })

  it('normal roles allowed for contractor', () => {
    expect(
      validateTeamGrant(
        {
          affiliation: 'contractor',
          expiresAt: BigInt(2_000_000),
          justification: 'j',
        },
        'admin',
        now
      ).error
    ).toBeNull()
    expect(
      validateTeamGrant(
        {
          affiliation: 'contractor',
          expiresAt: BigInt(2_000_000),
          justification: 'j',
        },
        'staff',
        now
      ).error
    ).toBeNull()
  })

  it('trims whitespace in title and justification', () => {
    const r = validateTeamGrant(
      {
        affiliation: 'external',
        title: '  Consultant  ',
        expiresAt: BigInt(2_000_000),
        justification: '  audit reason  ',
      },
      'staff',
      now
    )
    expect(r.data?.title).toBe('Consultant')
    expect(r.data?.justification).toBe('audit reason')
  })

  it('empty string justification after trim fails for contractor', () => {
    const r = validateTeamGrant(
      {
        affiliation: 'contractor',
        expiresAt: BigInt(2_000_000),
        justification: '   ',
      },
      'staff',
      now
    )
    expect(r.error?.code).toBe('team/justification-required')
  })

  it('expiry exactly at now fails (must be future)', () => {
    const r = validateTeamGrant(
      { affiliation: 'contractor', expiresAt: now, justification: 'j' },
      'staff',
      now
    )
    expect(r.error?.code).toBe('team/expiry-invalid')
  })

  it('expiry one second future passes', () => {
    const r = validateTeamGrant(
      {
        affiliation: 'contractor',
        expiresAt: now + BigInt(1),
        justification: 'j',
      },
      'staff',
      now
    )
    expect(r.error).toBeNull()
  })

  it('defaults affiliation to staff when omitted', () => {
    const r = validateTeamGrant(
      { title: null, expiresAt: null, justification: null },
      'admin',
      now
    )
    expect(r.data?.affiliation).toBe('staff')
    expect(r.error).toBeNull()
  })

  it('handles very distant future expiry', () => {
    const distant = BigInt(9_999_999_999)
    const r = validateTeamGrant(
      {
        affiliation: 'external',
        expiresAt: distant,
        justification: 'long term',
      },
      'staff',
      now
    )
    expect(r.error).toBeNull()
  })

  it('legacy permissions not part of validation — only affiliation/title/expiry', () => {
    // Validation is orthogonal to permission catalog; ensure legacy alias not confused
    const r = validateTeamGrant({ affiliation: 'staff' }, 'admin', now)
    expect(r.error).toBeNull()
  })
})

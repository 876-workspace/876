import { describe, expect, it } from 'vitest'
import { validateTeamGrant } from './validation'
import type { TeamAffiliation, TeamGrantFields } from '@/types/team'

describe('validateTeamGrant — weird edge cases', () => {
  const now = BigInt(1_000_000)

  it('accepts staff with no extras (happy path)', () => {
    const res = validateTeamGrant({}, 'admin', now)
    expect(res.error).toBeNull()
    expect(res.data?.affiliation).toBe('staff')
  })

  it('staff with title fails (even single char)', () => {
    const res = validateTeamGrant(
      { affiliation: 'staff', title: 'a' },
      'admin',
      now
    )
    expect(res.error?.code).toBe('team/staff-title-not-allowed')
  })
  it('staff with spaces-only title is treated as null and passes', () => {
    const res = validateTeamGrant(
      { affiliation: 'staff', title: '   ' },
      'admin',
      now
    )
    expect(res.error).toBeNull()
    expect(res.data?.title).toBeNull()
  })
  it('staff with unicode title fails', () => {
    expect(
      validateTeamGrant({ affiliation: 'staff', title: 'CEO 👑' }, 'admin', now)
        .error?.code
    ).toBe('team/staff-title-not-allowed')
  })
  it('staff with 10k title fails (still staff-title-not-allowed)', () => {
    expect(
      validateTeamGrant(
        { affiliation: 'staff', title: 'a'.repeat(10000) },
        'admin',
        now
      ).error?.code
    ).toBe('team/staff-title-not-allowed')
  })
  it('rejects invalid affiliation numeric', () => {
    expect(
      validateTeamGrant(
        { affiliation: 42 as unknown as TeamAffiliation },
        'admin',
        now
      ).error?.code
    ).toBe('team/invalid-affiliation')
  })
  it('treats null affiliation as staff (nullish coalescing defaults)', () => {
    const res = validateTeamGrant(
      { affiliation: null as unknown as TeamAffiliation },
      'admin',
      now
    )
    expect(res.error).toBeNull()
    expect(res.data?.affiliation).toBe('staff')
  })
  it('rejects invalid affiliation empty string', () => {
    expect(
      validateTeamGrant(
        { affiliation: '' as unknown as TeamAffiliation },
        'admin',
        now
      ).error?.code
    ).toBe('team/invalid-affiliation')
  })
  it('rejects affiliation with spaces', () => {
    expect(
      validateTeamGrant(
        { affiliation: ' staff' as unknown as TeamAffiliation },
        'admin',
        now
      ).error?.code
    ).toBe('team/invalid-affiliation')
  })
  it('rejects affiliation uppercase', () => {
    expect(
      validateTeamGrant(
        { affiliation: 'Staff' as unknown as TeamAffiliation },
        'admin',
        now
      ).error?.code
    ).toBe('team/invalid-affiliation')
  })
  it('rejects __proto__ affiliation', () => {
    expect(
      validateTeamGrant(
        { affiliation: '__proto__' as unknown as TeamAffiliation },
        'admin',
        now
      ).error?.code
    ).toBe('team/invalid-affiliation')
  })
  it('contractor without expiry fails', () => {
    expect(
      validateTeamGrant({ affiliation: 'contractor' }, 'admin', now).error?.code
    ).toBe('team/expiry-required')
  })
  it('external without expiry fails', () => {
    expect(
      validateTeamGrant({ affiliation: 'external' }, 'admin', now).error?.code
    ).toBe('team/expiry-required')
  })
  it('contractor with expiry in past fails', () => {
    expect(
      validateTeamGrant(
        {
          affiliation: 'contractor',
          expiresAt: now - BigInt(1),
          justification: 'need',
        },
        'admin',
        now
      ).error?.code
    ).toBe('team/expiry-invalid')
  })
  it('contractor with expiry exactly now fails (must be future)', () => {
    expect(
      validateTeamGrant(
        { affiliation: 'contractor', expiresAt: now, justification: 'need' },
        'admin',
        now
      ).error?.code
    ).toBe('team/expiry-invalid')
  })
  it('contractor with expiry 1 second in future passes (if justification present)', () => {
    const res = validateTeamGrant(
      {
        affiliation: 'contractor',
        expiresAt: now + BigInt(1),
        justification: 'need',
      },
      'admin',
      now
    )
    expect(res.error).toBeNull()
  })
  it('contractor with future expiry but missing justification fails', () => {
    expect(
      validateTeamGrant(
        {
          affiliation: 'contractor',
          expiresAt: now + BigInt(100),
          justification: null,
        },
        'admin',
        now
      ).error?.code
    ).toBe('team/justification-required')
  })
  it('contractor with spaces-only justification fails', () => {
    expect(
      validateTeamGrant(
        {
          affiliation: 'contractor',
          expiresAt: now + BigInt(100),
          justification: '   ',
        },
        'admin',
        now
      ).error?.code
    ).toBe('team/justification-required')
  })
  it('contractor with future expiry and justification with spaces trimmed passes', () => {
    const res = validateTeamGrant(
      {
        affiliation: 'contractor',
        expiresAt: now + BigInt(100),
        justification: '  urgent need  ',
      },
      'admin',
      now
    )
    expect(res.error).toBeNull()
    expect(res.data?.justification).toBe('urgent need')
  })
  it('handles very distant future expiry (year 3000)', () => {
    const far = BigInt(32503680000)
    expect(
      validateTeamGrant(
        { affiliation: 'external', expiresAt: far, justification: 'long' },
        'admin',
        now
      ).error
    ).toBeNull()
  })
  it('handles bigint 0 as expiry (invalid if not null)', () => {
    expect(
      validateTeamGrant(
        { affiliation: 'contractor', expiresAt: BigInt(0), justification: 'x' },
        'admin',
        now
      ).error?.code
    ).toBe('team/expiry-invalid')
  })
  it('handles negative bigint expiry (invalid)', () => {
    expect(
      validateTeamGrant(
        {
          affiliation: 'contractor',
          expiresAt: BigInt(-100),
          justification: 'x',
        },
        'admin',
        now
      ).error?.code
    ).toBe('team/expiry-invalid')
  })
  it('staff ignores expiry and justification (even if provided)', () => {
    const res = validateTeamGrant(
      { affiliation: 'staff', expiresAt: now - BigInt(100), justification: '' },
      'admin',
      now
    )
    expect(res.error).toBeNull()
    expect(res.data?.expiresAt).toBe(now - BigInt(100))
    // need to check current impl: staff does not validate expiry at all, so it passes even with past expiry
  })
  it('contractor title trimmed and null fallback', () => {
    const res = validateTeamGrant(
      {
        affiliation: 'contractor',
        title: '  Contractor Title  ',
        expiresAt: now + BigInt(10),
        justification: 'j',
      },
      'admin',
      now
    )
    expect(res.data?.title).toBe('Contractor Title')
  })
  it('contractor empty title becomes null', () => {
    const res = validateTeamGrant(
      {
        affiliation: 'contractor',
        title: '   ',
        expiresAt: now + BigInt(10),
        justification: 'j',
      },
      'admin',
      now
    )
    expect(res.data?.title).toBeNull()
  })
  it('invitedBy trimmed and null fallback', () => {
    const res = validateTeamGrant(
      { affiliation: 'staff', invitedBy: '  user_123  ' },
      'admin',
      now
    )
    expect(res.data?.invitedBy).toBe('user_123')
    const res2 = validateTeamGrant(
      { affiliation: 'staff', invitedBy: '   ' },
      'admin',
      now
    )
    expect(res2.data?.invitedBy).toBeNull()
  })
  it('handles affiliation as Symbol (invalid)', () => {
    expect(
      validateTeamGrant(
        { affiliation: Symbol('staff') as unknown as TeamAffiliation },
        'admin',
        now
      ).error?.code
    ).toBe('team/invalid-affiliation')
  })
  it('handles very long justification (10k) still passes', () => {
    const res = validateTeamGrant(
      {
        affiliation: 'contractor',
        expiresAt: now + BigInt(10),
        justification: 'a'.repeat(10000),
      },
      'admin',
      now
    )
    expect(res.error).toBeNull()
  })
  it('handles justification with null char (trimmed still has length, passes)', () => {
    const res = validateTeamGrant(
      {
        affiliation: 'contractor',
        expiresAt: now + BigInt(10),
        justification: 'need\u0000',
      },
      'admin',
      now
    )
    expect(res.error).toBeNull()
  })
  it('handles justification with emoji', () => {
    const res = validateTeamGrant(
      {
        affiliation: 'contractor',
        expiresAt: now + BigInt(10),
        justification: 'need 😀',
      },
      'admin',
      now
    )
    expect(res.error).toBeNull()
  })
  it('handles affiliation undefined defaults to staff', () => {
    expect(
      validateTeamGrant({ affiliation: undefined }, 'admin', now).data
        ?.affiliation
    ).toBe('staff')
  })
  it('handles input with extra unknown keys (ignored)', () => {
    const res = validateTeamGrant(
      {
        affiliation: 'staff',
        extra: 'evil',
      } as unknown as Partial<TeamGrantFields>,
      'admin',
      now
    )
    expect(res.error).toBeNull()
  })
  it('handles input as Object.create(null) (no prototype)', () => {
    const input = Object.create(null) as Partial<TeamGrantFields>
    input.affiliation = 'contractor'
    input.expiresAt = now + BigInt(10)
    input.justification = 'need'
    expect(validateTeamGrant(input, 'admin', now).error).toBeNull()
  })
  it('handles frozen input', () => {
    const input = Object.freeze({
      affiliation: 'external' as const,
      expiresAt: now + BigInt(10),
      justification: 'need',
    })
    expect(validateTeamGrant(input, 'admin', now).error).toBeNull()
  })
  it('handles nowSeconds default (Date.now) not crashing for staff', () => {
    expect(
      validateTeamGrant({ affiliation: 'staff' }, 'admin').error
    ).toBeNull()
  })
  it('staff with __proto__ title weird (still title present fails)', () => {
    expect(
      validateTeamGrant(
        { affiliation: 'staff', title: '__proto__' },
        'admin',
        now
      ).error?.code
    ).toBe('team/staff-title-not-allowed')
  })
  it('contractor with expiresAt as number (not bigint) coerces in comparison (JS allows mixed BigInt/Number)', () => {
    // In modern Node, 123 <= 1000000n is true (no TypeError), so it is treated as expiry-invalid
    const res = validateTeamGrant(
      {
        affiliation: 'contractor',
        expiresAt: 123 as unknown as bigint,
        justification: 'j',
      },
      'admin',
      now
    )
    expect(res.error?.code).toBe('team/expiry-invalid')
  })
  it('external with justification containing only RTL override still passes (non-empty)', () => {
    const res = validateTeamGrant(
      {
        affiliation: 'external',
        expiresAt: now + BigInt(10),
        justification: '\u202e',
      },
      'admin',
      now
    )
    expect(res.error).toBeNull()
  })
})

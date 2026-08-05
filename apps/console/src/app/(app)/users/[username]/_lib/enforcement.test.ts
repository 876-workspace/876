import type { AdminUser } from '@876/admin'
import { describe, expect, it } from 'vitest'

import {
  accountShapeClass,
  accountShapeLabel,
  enforcementTags,
  enforcementToneClass,
} from './enforcement'

function createUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    object: 'user',
    id: 'user_2kL9mN4q',
    company: null,
    company_short_name: null,
    company_logo: null,
    workos_user_id: 'user_workos_2kL9',
    stripe_customer_id: null,
    email: 'alejandra@example.com',
    username: 'alejandra',
    email_verified: true,
    first_name: 'Alejandra',
    last_name: 'Reyes',
    middle_name: null,
    avatar: null,
    avatar_file_id: null,
    status: 'active',
    platform_role: null,
    banned: false,
    banned_reason: null,
    deleted_at: null,
    deleted_by: null,
    deletion_reason: null,
    created_at: 1_700_000_000,
    updated_at: 1_700_000_000,
    ...overrides,
  }
}

describe('enforcementTags', () => {
  describe('clean accounts', () => {
    it('returns exactly one good-standing tag for an unremarkable account', () => {
      const tags = enforcementTags(createUser())

      expect(tags).toEqual([
        { key: 'good-standing', label: 'Good standing', tone: 'neutral' },
      ])
    })
  })

  describe('individual states', () => {
    it('reports a deleted account with the deletion date as detail', () => {
      const tags = enforcementTags(createUser({ deleted_at: 1_700_000_000 }))

      expect(tags).toHaveLength(1)
      expect(tags[0].key).toBe('deleted')
      expect(tags[0].tone).toBe('danger')
      expect(tags[0].detail).toBeTruthy()
    })

    it('reports a ban and carries the reason through as detail', () => {
      const tags = enforcementTags(
        createUser({ banned: true, banned_reason: 'Payment fraud' })
      )

      expect(tags).toEqual([
        {
          key: 'banned',
          label: 'Banned',
          tone: 'danger',
          detail: 'Payment fraud',
        },
      ])
    })

    it('reports a ban with no detail when no reason was recorded', () => {
      const tags = enforcementTags(createUser({ banned: true }))

      expect(tags[0].key).toBe('banned')
      expect(tags[0].detail).toBeUndefined()
    })

    it('reports a suspended status as a warning', () => {
      const tags = enforcementTags(createUser({ status: 'suspended' }))

      expect(tags).toEqual([
        { key: 'suspended', label: 'Suspended', tone: 'warning' },
      ])
    })

    it('reports an unverified email as a warning', () => {
      const tags = enforcementTags(createUser({ email_verified: false }))

      expect(tags).toEqual([
        { key: 'email-unverified', label: 'Email unverified', tone: 'warning' },
      ])
    })

    it('reports an inactive status as neutral', () => {
      const tags = enforcementTags(createUser({ status: 'inactive' }))

      expect(tags).toEqual([
        { key: 'inactive', label: 'Inactive', tone: 'neutral' },
      ])
    })

    it('surfaces a platform role using the role name as the label', () => {
      const tags = enforcementTags(createUser({ platform_role: 'support' }))

      expect(tags).toEqual([
        { key: 'platform-role', label: 'support', tone: 'neutral' },
      ])
    })
  })

  describe('combined states', () => {
    // The whole point of the tag row: an agent must see every standing fact at
    // once rather than discovering the second one after acting on the first.
    it('reports every state together, most severe first', () => {
      const tags = enforcementTags(
        createUser({
          deleted_at: 1_700_000_000,
          banned: true,
          banned_reason: 'Chargeback abuse',
          status: 'suspended',
          email_verified: false,
          platform_role: 'support',
        })
      )

      expect(tags.map((tag) => tag.key)).toEqual([
        'deleted',
        'banned',
        'suspended',
        'email-unverified',
        'platform-role',
      ])
    })

    it('does not add good-standing once any other tag applies', () => {
      const tags = enforcementTags(createUser({ email_verified: false }))

      expect(tags.map((tag) => tag.key)).not.toContain('good-standing')
    })

    it('does not report suspended and inactive together for one status', () => {
      const tags = enforcementTags(createUser({ status: 'suspended' }))

      expect(tags.map((tag) => tag.key)).not.toContain('inactive')
    })
  })
})

describe('enforcementToneClass', () => {
  it('gives danger a red treatment', () => {
    expect(enforcementToneClass('danger')).toContain('red')
  })

  it('gives warning an amber treatment', () => {
    expect(enforcementToneClass('warning')).toContain('amber')
  })

  it('gives neutral a muted treatment with no colour hue', () => {
    const className = enforcementToneClass('neutral')

    expect(className).toContain('muted')
    expect(className).not.toContain('red')
    expect(className).not.toContain('amber')
  })

  // Green is reserved for status indicators; a tone class must never introduce it.
  it.each(['danger', 'warning', 'neutral'] as const)(
    'never uses green for the %s tone',
    (tone) => {
      expect(enforcementToneClass(tone)).not.toContain('green')
      expect(enforcementToneClass(tone)).not.toContain('emerald')
    }
  )
})

describe('accountShapeLabel', () => {
  it('labels a consumer account', () => {
    expect(accountShapeLabel('consumer')).toBe('Consumer')
  })

  it('labels an enterprise account', () => {
    expect(accountShapeLabel('enterprise')).toBe('Enterprise')
  })

  it('names both halves of a dual account rather than picking one', () => {
    expect(accountShapeLabel('dual')).toBe('Enterprise + Consumer')
  })
})

describe('accountShapeClass', () => {
  it.each([
    ['consumer', 'sky'],
    ['enterprise', 'amber'],
    ['dual', 'violet'],
  ] as const)('gives %s a distinct %s treatment', (shape, hue) => {
    expect(accountShapeClass(shape)).toContain(hue)
  })

  it('gives each shape a different class so they never read alike', () => {
    const classes = new Set([
      accountShapeClass('consumer'),
      accountShapeClass('enterprise'),
      accountShapeClass('dual'),
    ])

    expect(classes.size).toBe(3)
  })
})

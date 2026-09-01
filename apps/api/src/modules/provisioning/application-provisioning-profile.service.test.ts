import type {
  ApplicationProvisioningProfileCondition,
  ApplicationProvisioningProfileSelectionCandidate,
} from '@876/core/types/application-provisioning-profile'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const repository = vi.hoisted(() => ({
  findAppByIdOrSlug: vi.fn(),
  findProvisioningSetupByKey: vi.fn(),
  findProductForApp: vi.fn(),
  findProfile: vi.fn(),
  findProfileById: vi.fn(),
  findDefaultProfile: vi.fn(),
  listProfiles: vi.fn(),
  listActiveProfiles: vi.fn(),
  ensureDefaultProfile: vi.fn(),
  createProfile: vi.fn(),
  updateProfile: vi.fn(),
  makeDefaultProfile: vi.fn(),
  replaceConditions: vi.fn(),
  findManifestState: vi.fn(),
  findPublishedRevision: vi.fn(),
  findPersistedSelection: vi.fn(),
  persistSelection: vi.fn(),
  findOrganizationSelectionContext: vi.fn(),
  countActiveDefaults: vi.fn(),
}))

vi.mock('./application-provisioning-profile.repository', () => repository)
vi.mock('./provisioning.repository', () => ({
  findManifestFirst: vi.fn(),
  findRevisionByStatus: vi.fn(),
  replaceDraft: vi.fn(),
  retrieveDraftForUpdate: vi.fn(),
  promoteDraft: vi.fn(),
}))

import {
  createApplicationProvisioningProfile,
  resolveAndPersistApplicationProvisioningProfile,
  resolveApplicationProvisioningProfileFromCandidates,
  updateApplicationProvisioningProfile,
} from './application-provisioning-profile.service'

const APP_ID = 'rap_crm'
const APP_SLUG = '876-crm'
const NOW = 1_788_163_200

function condition(
  overrides: Partial<ApplicationProvisioningProfileCondition> &
    Pick<ApplicationProvisioningProfileCondition, 'group_key' | 'field' | 'value'>
): ApplicationProvisioningProfileCondition {
  return {
    object: 'application_provisioning_profile_condition',
    id: `apc_${overrides.group_key}_${overrides.field}_${overrides.value}`,
    operator: 'equals',
    priority: 0,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  }
}

function candidate(
  key: string,
  options: {
    id?: string
    appId?: string
    appSlug?: string
    isDefault?: boolean
    conditions?: ApplicationProvisioningProfileCondition[]
  } = {}
): ApplicationProvisioningProfileSelectionCandidate {
  return {
    id: options.id ?? `apppr_${key}`,
    app_id: options.appId ?? APP_ID,
    app_slug: options.appSlug ?? APP_SLUG,
    key,
    is_default: options.isDefault ?? false,
    conditions: options.conditions ?? [],
  }
}

const DEFAULT = candidate('default', { isDefault: true })

function dbCondition(
  groupKey: string,
  field: string,
  value: string,
  priority = 0
) {
  return {
    id: `apc_${groupKey}_${field}_${value}`,
    groupKey,
    field,
    operator: 'equals',
    value,
    priority,
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
  }
}

function activeProfile(
  key: string,
  options: {
    id?: string
    isDefault?: boolean
    conditions?: ReturnType<typeof dbCondition>[]
  } = {}
) {
  return {
    id: options.id ?? `apppr_${key}`,
    appId: APP_ID,
    key,
    isDefault: options.isDefault ?? false,
    app: { id: APP_ID, slug: APP_SLUG },
    conditions: options.conditions ?? [],
  }
}

function mutableProfile(
  key: string,
  options: {
    isDefault?: boolean
    status?: 'draft' | 'active' | 'archived'
    conditions?: ReturnType<typeof dbCondition>[]
  } = {}
) {
  return {
    id: `apppr_${key}`,
    appId: APP_ID,
    key,
    name: key,
    description: null,
    status: options.status ?? 'active',
    isDefault: options.isDefault ?? false,
    manifestTargetKey: `apppr_${key}`,
    app: { id: APP_ID, slug: APP_SLUG },
    conditions: options.conditions ?? [],
    selections: [],
    _count: { selections: 0 },
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
  }
}

function organizationContext(
  overrides: {
    setup?: string | null
    country?: string | null
    subdivision?: string | null
    plan?: string | null
  } = {}
) {
  const setup = 'setup' in overrides ? (overrides.setup ?? null) : 'jamaica'
  const country = 'country' in overrides ? (overrides.country ?? null) : 'JM'

  return {
    id: 'org_1',
    provisioningSetupKey: setup,
    countryCode: country,
    region: overrides.subdivision ? { code: overrides.subdivision } : null,
    subscriptions: overrides.plan
      ? [
          {
            subscriptionItems: [
              { price: { product: { slug: overrides.plan } } },
            ],
          },
        ]
      : [],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  repository.findAppByIdOrSlug.mockResolvedValue({
    id: APP_ID,
    slug: APP_SLUG,
    name: '876 CRM',
    status: 'active',
    appKind: 'product',
  })
})

describe('resolveApplicationProvisioningProfileFromCandidates', () => {
  it('returns the single active default when there are no conditional matches', () => {
    const result = resolveApplicationProvisioningProfileFromCandidates(
      [DEFAULT],
      { setup: 'jamaica', country: 'JM' }
    )

    expect(result).toEqual({
      app_id: APP_ID,
      app_slug: APP_SLUG,
      profile_id: 'apppr_default',
      profile_key: 'default',
      match_type: 'default',
      match_group_key: null,
      match_priority: null,
      matched_fields: [],
      context: {
        setup: 'jamaica',
        country: 'JM',
        subdivision: null,
        jurisdiction: null,
        plan: null,
      },
    })
  })

  it('requires every condition in one group to match', () => {
    const jamaicaEnterprise = candidate('jamaica-enterprise', {
      conditions: [
        condition({ group_key: 'jm-ent', field: 'setup', value: 'jamaica' }),
        condition({ group_key: 'jm-ent', field: 'plan', value: 'enterprise' }),
      ],
    })

    const result = resolveApplicationProvisioningProfileFromCandidates(
      [DEFAULT, jamaicaEnterprise],
      { setup: 'jamaica', plan: 'starter' }
    )

    expect(result.profile_key).toBe('default')
    expect(result.match_type).toBe('default')
  })

  it('treats separate condition groups as OR alternatives', () => {
    const regional = candidate('regional', {
      conditions: [
        condition({ group_key: 'jm', field: 'setup', value: 'jamaica' }),
        condition({
          group_key: 'tt',
          field: 'setup',
          value: 'trinidad-and-tobago',
        }),
      ],
    })

    const result = resolveApplicationProvisioningProfileFromCandidates(
      [DEFAULT, regional],
      { setup: 'trinidad-and-tobago' }
    )

    expect(result.profile_key).toBe('regional')
    expect(result.match_group_key).toBe('tt')
    expect(result.matched_fields).toEqual(['setup'])
  })

  it('chooses greater specificity before a higher-priority generic match', () => {
    const country = candidate('us', {
      conditions: [
        condition({
          group_key: 'us',
          field: 'country',
          value: 'US',
          priority: 999,
        }),
      ],
    })
    const california = candidate('california', {
      conditions: [
        condition({
          group_key: 'ca',
          field: 'country',
          value: 'US',
          priority: 1,
        }),
        condition({
          group_key: 'ca',
          field: 'subdivision',
          value: 'US-CA',
          priority: 1,
        }),
      ],
    })

    const result = resolveApplicationProvisioningProfileFromCandidates(
      [DEFAULT, country, california],
      { country: 'US', subdivision: 'US-CA' }
    )

    expect(result.profile_key).toBe('california')
    expect(result.match_priority).toBe(1)
    expect(result.matched_fields).toEqual(['country', 'subdivision'])
  })

  it('uses priority only when matching groups have equal specificity', () => {
    const low = candidate('low', {
      conditions: [
        condition({
          group_key: 'jm-low',
          field: 'setup',
          value: 'jamaica',
          priority: 10,
        }),
      ],
    })
    const high = candidate('high', {
      conditions: [
        condition({
          group_key: 'jm-high',
          field: 'setup',
          value: 'jamaica',
          priority: 20,
        }),
      ],
    })

    const result = resolveApplicationProvisioningProfileFromCandidates(
      [DEFAULT, low, high],
      { setup: 'jamaica' }
    )

    expect(result.profile_key).toBe('high')
    expect(result.match_priority).toBe(20)
  })

  it('uses profile key then group key as a stable final tie-break', () => {
    const zebra = candidate('zebra', {
      conditions: [
        condition({
          group_key: 'alpha',
          field: 'setup',
          value: 'jamaica',
          priority: 10,
        }),
      ],
    })
    const alpha = candidate('alpha', {
      conditions: [
        condition({
          group_key: 'zebra',
          field: 'setup',
          value: 'jamaica',
          priority: 10,
        }),
      ],
    })

    const result = resolveApplicationProvisioningProfileFromCandidates(
      [DEFAULT, zebra, alpha],
      { setup: 'jamaica' }
    )

    expect(result.profile_key).toBe('alpha')
    expect(result.match_group_key).toBe('zebra')
  })

  it('normalizes setup, country, subdivision, jurisdiction, and plan context', () => {
    const exact = candidate('exact', {
      conditions: [
        condition({ group_key: 'all', field: 'setup', value: 'jamaica' }),
        condition({ group_key: 'all', field: 'country', value: 'JM' }),
        condition({ group_key: 'all', field: 'subdivision', value: 'JM-01' }),
        condition({ group_key: 'all', field: 'jurisdiction', value: 'kingston' }),
        condition({ group_key: 'all', field: 'plan', value: 'enterprise' }),
      ],
    })

    const result = resolveApplicationProvisioningProfileFromCandidates(
      [DEFAULT, exact],
      {
        setup: ' JAMAICA ',
        country: ' jm ',
        subdivision: ' jm-01 ',
        jurisdiction: ' kingston ',
        plan: ' ENTERPRISE ',
      }
    )

    expect(result.profile_key).toBe('exact')
    expect(result.context).toEqual({
      setup: 'jamaica',
      country: 'JM',
      subdivision: 'JM-01',
      jurisdiction: 'kingston',
      plan: 'enterprise',
    })
  })

  it('canonicalizes matched field audit order independently of condition order', () => {
    const exact = candidate('exact', {
      conditions: [
        condition({ group_key: 'all', field: 'plan', value: 'enterprise' }),
        condition({ group_key: 'all', field: 'country', value: 'JM' }),
        condition({ group_key: 'all', field: 'setup', value: 'jamaica' }),
      ],
    })

    const result = resolveApplicationProvisioningProfileFromCandidates(
      [DEFAULT, exact],
      { setup: 'jamaica', country: 'JM', plan: 'enterprise' }
    )

    expect(result.matched_fields).toEqual(['setup', 'country', 'plan'])
  })

  it('fails closed when the default profile has routing conditions', () => {
    const malformedDefault = candidate('default', {
      isDefault: true,
      conditions: [
        condition({ group_key: 'jm', field: 'setup', value: 'jamaica' }),
      ],
    })
    const variant = candidate('variant', {
      conditions: [
        condition({ group_key: 'jm', field: 'setup', value: 'jamaica' }),
      ],
    })

    const act = () =>
      resolveApplicationProvisioningProfileFromCandidates(
        [malformedDefault, variant],
        { setup: 'jamaica' }
      )

    expect(act).toThrowError(
      expect.objectContaining({
        code: 'provisioning/application-profile-default-invalid',
        httpStatus: 500,
      })
    )
  })

  it('fails when no active candidates exist', () => {
    const act = () =>
      resolveApplicationProvisioningProfileFromCandidates([], {})

    expect(act).toThrowError(
      expect.objectContaining({
        code: 'provisioning/application-profile-unavailable',
        httpStatus: 503,
      })
    )
  })

  it('fails when candidates belong to multiple applications', () => {
    const other = candidate('other-default', {
      appId: 'rap_other',
      appSlug: '876-other',
      isDefault: true,
    })

    const act = () =>
      resolveApplicationProvisioningProfileFromCandidates([DEFAULT, other], {})

    expect(act).toThrowError(
      expect.objectContaining({
        code: 'provisioning/application-profile-candidate-invalid',
        httpStatus: 500,
      })
    )
  })

  it('fails when candidates disagree on app slug even if app id matches', () => {
    const wrongSlug = candidate('variant', {
      appSlug: '876-crm-other',
      conditions: [
        condition({ group_key: 'jm', field: 'setup', value: 'jamaica' }),
      ],
    })

    const act = () =>
      resolveApplicationProvisioningProfileFromCandidates(
        [DEFAULT, wrongSlug],
        { setup: 'jamaica' }
      )

    expect(act).toThrowError(
      expect.objectContaining({
        code: 'provisioning/application-profile-candidate-invalid',
        httpStatus: 500,
      })
    )
  })

  it('fails when no default exists even if a conditional profile matches', () => {
    const variant = candidate('variant', {
      conditions: [
        condition({ group_key: 'jm', field: 'setup', value: 'jamaica' }),
      ],
    })

    const act = () =>
      resolveApplicationProvisioningProfileFromCandidates([variant], {
        setup: 'jamaica',
      })

    expect(act).toThrowError(
      expect.objectContaining({
        code: 'provisioning/application-profile-default-invalid',
        httpStatus: 500,
      })
    )
  })

  it('fails when multiple active defaults exist', () => {
    const secondDefault = candidate('secondary', { isDefault: true })

    const act = () =>
      resolveApplicationProvisioningProfileFromCandidates(
        [DEFAULT, secondDefault],
        { setup: 'jamaica' }
      )

    expect(act).toThrowError(
      expect.objectContaining({
        code: 'provisioning/application-profile-default-invalid',
        httpStatus: 500,
      })
    )
  })

  it('returns the same winner for every candidate ordering', () => {
    const variants = [
      DEFAULT,
      candidate('jamaica', {
        conditions: [
          condition({
            group_key: 'jm',
            field: 'setup',
            value: 'jamaica',
            priority: 5,
          }),
        ],
      }),
      candidate('jamaica-enterprise', {
        conditions: [
          condition({
            group_key: 'jm-ent',
            field: 'setup',
            value: 'jamaica',
            priority: 1,
          }),
          condition({
            group_key: 'jm-ent',
            field: 'plan',
            value: 'enterprise',
            priority: 1,
          }),
        ],
      }),
    ]
    const permutations = [
      variants,
      [variants[0]!, variants[2]!, variants[1]!],
      [variants[1]!, variants[0]!, variants[2]!],
      [variants[1]!, variants[2]!, variants[0]!],
      [variants[2]!, variants[0]!, variants[1]!],
      [variants[2]!, variants[1]!, variants[0]!],
    ]

    const results = permutations.map((items) =>
      resolveApplicationProvisioningProfileFromCandidates(items, {
        setup: 'jamaica',
        plan: 'enterprise',
      })
    )

    expect(results.map((result) => result.profile_key)).toEqual([
      'jamaica-enterprise',
      'jamaica-enterprise',
      'jamaica-enterprise',
      'jamaica-enterprise',
      'jamaica-enterprise',
      'jamaica-enterprise',
    ])
  })
})

describe('application profile lifecycle invariants', () => {
  it('does not allow a brand-new draft profile to be created as default', async () => {
    repository.ensureDefaultProfile.mockResolvedValue(
      mutableProfile('default', { isDefault: true })
    )

    await expect(
      createApplicationProvisioningProfile(APP_ID, {
        key: 'new-default',
        name: 'New default',
        description: null,
        is_default: true,
        copy_from: null,
      })
    ).rejects.toMatchObject({
      code: 'provisioning/application-profile-default-create-not-supported',
      httpStatus: 409,
    })
    expect(repository.createProfile).not.toHaveBeenCalled()
    expect(repository.makeDefaultProfile).not.toHaveBeenCalled()
  })

  it('does not allow an unpublished variant to become default', async () => {
    repository.ensureDefaultProfile.mockResolvedValue(
      mutableProfile('default', { isDefault: true })
    )
    repository.findProfile.mockResolvedValue(mutableProfile('candidate'))
    repository.findPublishedRevision.mockResolvedValue(null)

    await expect(
      updateApplicationProvisioningProfile(APP_ID, 'candidate', {
        is_default: true,
        status: 'active',
      })
    ).rejects.toMatchObject({
      code: 'provisioning/application-profile-published-manifest-required',
      httpStatus: 409,
    })
    expect(repository.updateProfile).not.toHaveBeenCalled()
    expect(repository.makeDefaultProfile).not.toHaveBeenCalled()
  })

  it('does not allow an archived variant to become default', async () => {
    repository.ensureDefaultProfile.mockResolvedValue(
      mutableProfile('default', { isDefault: true })
    )
    repository.findProfile.mockResolvedValue(
      mutableProfile('candidate', { status: 'archived' })
    )

    await expect(
      updateApplicationProvisioningProfile(APP_ID, 'candidate', {
        is_default: true,
        status: 'archived',
      })
    ).rejects.toMatchObject({
      code: 'provisioning/application-profile-default-required',
      httpStatus: 409,
    })
    expect(repository.findPublishedRevision).not.toHaveBeenCalled()
    expect(repository.makeDefaultProfile).not.toHaveBeenCalled()
  })

  it('does not allow a conditional variant to become default', async () => {
    repository.ensureDefaultProfile.mockResolvedValue(
      mutableProfile('default', { isDefault: true })
    )
    repository.findProfile.mockResolvedValue(
      mutableProfile('candidate', {
        conditions: [dbCondition('jm', 'setup', 'jamaica', 100)],
      })
    )

    await expect(
      updateApplicationProvisioningProfile(APP_ID, 'candidate', {
        is_default: true,
        status: 'active',
      })
    ).rejects.toMatchObject({
      code: 'provisioning/application-profile-default-has-conditions',
      httpStatus: 409,
    })
    expect(repository.findPublishedRevision).not.toHaveBeenCalled()
    expect(repository.makeDefaultProfile).not.toHaveBeenCalled()
  })
})

describe('resolveAndPersistApplicationProvisioningProfile', () => {
  it('persists the first profile decision with complete match audit', async () => {
    repository.findOrganizationSelectionContext.mockResolvedValue(
      organizationContext({ setup: 'jamaica', plan: 'enterprise' })
    )
    repository.findPersistedSelection.mockResolvedValue(null)
    repository.ensureDefaultProfile.mockResolvedValue(
      activeProfile('default', { isDefault: true })
    )
    repository.listActiveProfiles.mockResolvedValue([
      activeProfile('default', { isDefault: true }),
      activeProfile('jamaica-enterprise', {
        conditions: [
          dbCondition('jm-ent', 'setup', 'jamaica', 50),
          dbCondition('jm-ent', 'plan', 'enterprise', 50),
        ],
      }),
    ])
    repository.persistSelection.mockResolvedValue(true)

    const result = await resolveAndPersistApplicationProvisioningProfile(
      'org_1',
      APP_ID,
      NOW
    )

    expect(result).toEqual({
      app_id: APP_ID,
      app_slug: APP_SLUG,
      profile_id: 'apppr_jamaica-enterprise',
      profile_key: 'jamaica-enterprise',
      match_type: 'policy',
      match_group_key: 'jm-ent',
      match_priority: 50,
      matched_fields: ['setup', 'plan'],
      context: {
        setup: 'jamaica',
        country: 'JM',
        subdivision: null,
        jurisdiction: null,
        plan: 'enterprise',
      },
    })
    expect(repository.persistSelection).toHaveBeenCalledTimes(1)
    expect(repository.persistSelection).toHaveBeenCalledWith({
      id: expect.stringMatching(/^oap_/),
      organizationId: 'org_1',
      appId: APP_ID,
      profileId: 'apppr_jamaica-enterprise',
      selectionType: 'policy',
      matchGroupKey: 'jm-ent',
      matchPriority: 50,
      matchedFields: ['setup', 'plan'],
      selectedAt: BigInt(NOW),
    })
  })

  it('reuses a persisted selection even when current context would match another profile', async () => {
    repository.findOrganizationSelectionContext.mockResolvedValue(
      organizationContext({ setup: 'jamaica', plan: 'enterprise' })
    )
    repository.findPersistedSelection.mockResolvedValue({
      id: 'oap_1',
      organizationId: 'org_1',
      appId: APP_ID,
      profileId: 'apppr_default',
      selectionType: 'default',
      matchGroupKey: null,
      matchPriority: null,
      matchedFields: [],
      selectedAt: BigInt(NOW - 100),
      createdAt: BigInt(NOW - 100),
      updatedAt: BigInt(NOW - 100),
      app: { id: APP_ID, slug: APP_SLUG },
      profile: {
        id: 'apppr_default',
        key: 'default',
        manifestTargetKey: APP_ID,
      },
    })

    const result = await resolveAndPersistApplicationProvisioningProfile(
      'org_1',
      APP_ID,
      NOW
    )

    expect(result.profile_key).toBe('default')
    expect(result.match_type).toBe('persisted')
    expect(repository.listActiveProfiles).not.toHaveBeenCalled()
    expect(repository.ensureDefaultProfile).not.toHaveBeenCalled()
    expect(repository.persistSelection).not.toHaveBeenCalled()
  })

  it('returns the concurrent winner without overwriting it when persist loses the unique race', async () => {
    repository.findOrganizationSelectionContext.mockResolvedValue(
      organizationContext({ setup: 'jamaica' })
    )
    repository.findPersistedSelection
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'oap_winner',
        organizationId: 'org_1',
        appId: APP_ID,
        profileId: 'apppr_winner',
        selectionType: 'policy',
        matchGroupKey: 'winner',
        matchPriority: 60,
        matchedFields: ['setup'],
        selectedAt: BigInt(NOW - 1),
        createdAt: BigInt(NOW - 1),
        updatedAt: BigInt(NOW - 1),
        app: { id: APP_ID, slug: APP_SLUG },
        profile: {
          id: 'apppr_winner',
          key: 'winner',
          manifestTargetKey: 'apppr_winner',
        },
      })
    repository.ensureDefaultProfile.mockResolvedValue(
      activeProfile('default', { isDefault: true })
    )
    repository.listActiveProfiles.mockResolvedValue([
      activeProfile('default', { isDefault: true }),
    ])
    repository.persistSelection.mockResolvedValue(false)

    const result = await resolveAndPersistApplicationProvisioningProfile(
      'org_1',
      APP_ID,
      NOW
    )

    expect(result.profile_key).toBe('winner')
    expect(result.match_type).toBe('persisted')
    expect(repository.persistSelection).toHaveBeenCalledTimes(1)
  })

  it('does not read or overwrite another organizations persisted profile', async () => {
    repository.findOrganizationSelectionContext.mockResolvedValue(
      organizationContext({ setup: 'jamaica', country: 'JM' })
    )
    repository.findPersistedSelection.mockResolvedValue(null)
    repository.ensureDefaultProfile.mockResolvedValue(
      activeProfile('default', { isDefault: true })
    )
    repository.listActiveProfiles.mockResolvedValue([
      activeProfile('default', { isDefault: true }),
      activeProfile('jamaica', {
        conditions: [dbCondition('jm', 'setup', 'jamaica', 10)],
      }),
      activeProfile('united-states', {
        conditions: [dbCondition('us', 'country', 'US', 10)],
      }),
    ])
    repository.persistSelection.mockResolvedValue(true)

    const result = await resolveAndPersistApplicationProvisioningProfile(
      'org_jm',
      APP_ID,
      NOW
    )

    expect(result.profile_key).toBe('jamaica')
    expect(repository.findPersistedSelection).toHaveBeenCalledTimes(1)
    expect(repository.findPersistedSelection).toHaveBeenCalledWith(
      'org_jm',
      APP_ID
    )
    expect(repository.persistSelection).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_jm',
        appId: APP_ID,
        profileId: 'apppr_jamaica',
      })
    )
  })

  it('selects a different profile for a US organization using the same app', async () => {
    repository.findOrganizationSelectionContext.mockResolvedValue(
      organizationContext({ setup: 'united-states', country: 'US' })
    )
    repository.findPersistedSelection.mockResolvedValue(null)
    repository.ensureDefaultProfile.mockResolvedValue(
      activeProfile('default', { isDefault: true })
    )
    repository.listActiveProfiles.mockResolvedValue([
      activeProfile('default', { isDefault: true }),
      activeProfile('jamaica', {
        conditions: [dbCondition('jm', 'setup', 'jamaica', 10)],
      }),
      activeProfile('united-states', {
        conditions: [dbCondition('us', 'setup', 'united-states', 10)],
      }),
    ])
    repository.persistSelection.mockResolvedValue(true)

    const result = await resolveAndPersistApplicationProvisioningProfile(
      'org_us',
      APP_ID,
      NOW
    )

    expect(result.profile_key).toBe('united-states')
    expect(repository.persistSelection).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_us',
        appId: APP_ID,
        profileId: 'apppr_united-states',
      })
    )
  })

  it('keeps two organizations on independent profiles for the same app', async () => {
    repository.findOrganizationSelectionContext.mockImplementation(
      async (organizationId: string) =>
        organizationId === 'org_jm'
          ? organizationContext({ setup: 'jamaica', country: 'JM' })
          : organizationContext({ setup: 'united-states', country: 'US' })
    )
    repository.findPersistedSelection.mockResolvedValue(null)
    repository.ensureDefaultProfile.mockResolvedValue(
      activeProfile('default', { isDefault: true })
    )
    repository.listActiveProfiles.mockResolvedValue([
      activeProfile('default', { isDefault: true }),
      activeProfile('jamaica', {
        conditions: [dbCondition('jm', 'setup', 'jamaica', 10)],
      }),
      activeProfile('united-states', {
        conditions: [dbCondition('us', 'setup', 'united-states', 10)],
      }),
    ])
    repository.persistSelection.mockResolvedValue(true)

    const jamaica = await resolveAndPersistApplicationProvisioningProfile(
      'org_jm',
      APP_ID,
      NOW
    )
    const unitedStates = await resolveAndPersistApplicationProvisioningProfile(
      'org_us',
      APP_ID,
      NOW + 1
    )

    expect(jamaica.profile_key).toBe('jamaica')
    expect(unitedStates.profile_key).toBe('united-states')
    expect(repository.persistSelection).toHaveBeenCalledTimes(2)
    expect(repository.persistSelection).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        organizationId: 'org_jm',
        appId: APP_ID,
        profileId: 'apppr_jamaica',
      })
    )
    expect(repository.persistSelection).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        organizationId: 'org_us',
        appId: APP_ID,
        profileId: 'apppr_united-states',
      })
    )
  })

  it('fails closed when the workspace setup selection is missing', async () => {
    repository.findOrganizationSelectionContext.mockResolvedValue(
      organizationContext({ setup: null })
    )
    repository.findPersistedSelection.mockResolvedValue(null)

    const act = resolveAndPersistApplicationProvisioningProfile(
      'org_1',
      APP_ID,
      NOW
    )

    await expect(act).rejects.toMatchObject({
      code: 'provisioning/setup-selection-missing',
      httpStatus: 409,
    })
    expect(repository.listActiveProfiles).not.toHaveBeenCalled()
    expect(repository.persistSelection).not.toHaveBeenCalled()
  })
})

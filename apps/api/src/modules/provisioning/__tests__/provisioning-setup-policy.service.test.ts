import { beforeEach, describe, expect, it, vi } from 'vitest'

const repository = vi.hoisted(() => ({
  findPolicySetupByKey: vi.fn(),
  findPolicyAppBySlug: vi.fn(),
  replaceSetupPolicy: vi.fn(),
}))

vi.mock('../provisioning-setup-policy.repository', () => repository)

const service = await import('../provisioning-setup-policy.service')

const NOW = 1_785_000_000n
type ReplacePolicyParams = Parameters<
  typeof import('../provisioning-setup-policy.repository').replaceSetupPolicy
>[0]

function setupRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'psu_jamaica',
    key: 'jamaica',
    name: 'Jamaica',
    description: null,
    countryCode: null,
    currencyCode: null,
    status: 'active',
    isDefault: false,
    createdAt: NOW,
    updatedAt: NOW,
    conditions: [],
    entitlements: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  repository.findPolicySetupByKey.mockResolvedValue(setupRow())
  repository.findPolicyAppBySlug.mockImplementation(async (slug: string) => ({
    id: `app_${slug}`,
    slug,
    appKind: 'product',
  }))
  repository.replaceSetupPolicy.mockImplementation(
    async (params: ReplacePolicyParams) =>
      setupRow({
        updatedAt: params.now,
        conditions: params.conditions.map((condition) => ({
          id: condition.id,
          setupId: params.setupId,
          groupKey: condition.groupKey,
          field: condition.field,
          operator: condition.operator,
          value: condition.value,
          priority: condition.priority,
          createdAt: condition.now,
          updatedAt: condition.now,
        })),
        entitlements: params.entitlements.map((entitlement) => ({
          id: entitlement.id,
          setupId: params.setupId,
          targetType: entitlement.targetType,
          targetKey: entitlement.targetKey,
          enabled: entitlement.enabled,
          createdAt: entitlement.now,
          updatedAt: entitlement.now,
        })),
      })
  )
})

describe('provisioning setup policy service', () => {
  it('retrieves and serializes the persisted policy', async () => {
    repository.findPolicySetupByKey.mockResolvedValue(
      setupRow({
        conditions: [
          {
            id: 'psc_jm',
            setupId: 'psu_jamaica',
            groupKey: 'country-jm',
            field: 'country',
            operator: 'equals',
            value: 'JM',
            priority: 100,
            createdAt: NOW,
            updatedAt: NOW,
          },
        ],
        entitlements: [
          {
            id: 'pse_work',
            setupId: 'psu_jamaica',
            targetType: 'service',
            targetKey: 'work',
            enabled: true,
            createdAt: NOW,
            updatedAt: NOW,
          },
          {
            id: 'pse_work_tasks',
            setupId: 'psu_jamaica',
            targetType: 'service_capability',
            targetKey: 'work.tasks',
            enabled: true,
            createdAt: NOW,
            updatedAt: NOW,
          },
        ],
      })
    )

    const result = await service.retrieveSetupPolicy('jamaica')

    expect(result).toMatchObject({
      object: 'provisioning_setup_policy',
      setup_id: 'psu_jamaica',
      setup_key: 'jamaica',
      conditions: [
        expect.objectContaining({
          group_key: 'country-jm',
          field: 'country',
          value: 'JM',
          priority: 100,
        }),
      ],
      entitlements: expect.arrayContaining([
        expect.objectContaining({
          target_type: 'service',
          target_key: 'work',
          enabled: true,
        }),
        expect.objectContaining({
          target_type: 'service_capability',
          target_key: 'work.tasks',
          enabled: true,
        }),
      ]),
    })
  })

  it('adds the mandatory Enterprise entitlement when callers omit it', async () => {
    const result = await service.replaceSetupPolicy('jamaica', {
      conditions: [
        {
          group_key: 'country-jm',
          field: 'country',
          operator: 'equals',
          value: 'JM',
          priority: 100,
        },
      ],
      entitlements: [
        { target_type: 'service', target_key: 'work', enabled: true },
      ],
    })

    expect(repository.findPolicyAppBySlug).toHaveBeenCalledWith(
      '876-enterprise'
    )
    expect(repository.replaceSetupPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        setupId: 'psu_jamaica',
        entitlements: expect.arrayContaining([
          expect.objectContaining({
            targetType: 'application',
            targetKey: '876-enterprise',
            enabled: true,
          }),
          expect.objectContaining({
            targetType: 'service',
            targetKey: 'work',
            enabled: true,
          }),
        ]),
      })
    )
    expect(result.entitlements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          target_type: 'application',
          target_key: '876-enterprise',
          enabled: true,
        }),
        expect.objectContaining({
          target_type: 'service',
          target_key: 'work',
          enabled: true,
        }),
      ])
    )
  })

  it('accepts registered Work capabilities when the Work gate is explicit', async () => {
    const result = await service.replaceSetupPolicy('jamaica', {
      conditions: [],
      entitlements: [
        { target_type: 'service', target_key: 'work', enabled: true },
        {
          target_type: 'service_capability',
          target_key: 'work.tasks',
          enabled: true,
        },
        {
          target_type: 'service_capability',
          target_key: 'work.sync',
          enabled: false,
        },
      ],
    })

    expect(result.entitlements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          target_type: 'service_capability',
          target_key: 'work.tasks',
          enabled: true,
        }),
        expect.objectContaining({
          target_type: 'service_capability',
          target_key: 'work.sync',
          enabled: false,
        }),
      ])
    )
  })

  it('requires an explicit Work service gate before capability policy', async () => {
    await expect(
      service.replaceSetupPolicy('jamaica', {
        conditions: [],
        entitlements: [
          {
            target_type: 'service_capability',
            target_key: 'work.tasks',
            enabled: true,
          },
        ],
      })
    ).rejects.toMatchObject({
      code: 'provisioning/work-service-entitlement-required',
      httpStatus: 400,
    })

    expect(repository.replaceSetupPolicy).not.toHaveBeenCalled()
  })

  it('rejects unknown Work capability targets', async () => {
    await expect(
      service.replaceSetupPolicy('jamaica', {
        conditions: [],
        entitlements: [
          { target_type: 'service', target_key: 'work', enabled: true },
          {
            target_type: 'service_capability',
            target_key: 'work.unknown',
            enabled: true,
          },
        ],
      })
    ).rejects.toMatchObject({
      code: 'provisioning/unknown-service-capability',
      httpStatus: 400,
    })
  })

  it('rejects an explicit attempt to disable Enterprise', async () => {
    await expect(
      service.replaceSetupPolicy('jamaica', {
        conditions: [],
        entitlements: [
          {
            target_type: 'application',
            target_key: '876-enterprise',
            enabled: false,
          },
        ],
      })
    ).rejects.toMatchObject({
      code: 'provisioning/enterprise-entitlement-required',
      httpStatus: 400,
    })

    expect(repository.replaceSetupPolicy).not.toHaveBeenCalled()
  })

  it('rejects unknown shared-service targets', async () => {
    await expect(
      service.replaceSetupPolicy('jamaica', {
        conditions: [],
        entitlements: [
          { target_type: 'service', target_key: 'unknown', enabled: true },
        ],
      })
    ).rejects.toMatchObject({
      code: 'provisioning/unknown-service-entitlement',
      httpStatus: 400,
    })
  })

  it('rejects internal or unknown application targets', async () => {
    repository.findPolicyAppBySlug.mockImplementation(async (slug: string) =>
      slug === 'console'
        ? { id: 'app_console', slug, appKind: 'internal' }
        : slug === '876-enterprise'
          ? { id: 'app_enterprise', slug, appKind: 'product' }
          : null
    )

    await expect(
      service.replaceSetupPolicy('jamaica', {
        conditions: [],
        entitlements: [
          { target_type: 'application', target_key: 'console', enabled: true },
        ],
      })
    ).rejects.toMatchObject({
      code: 'provisioning/unknown-application-entitlement',
      httpStatus: 400,
    })
  })

  it('returns the stable setup-not-found contract', async () => {
    repository.findPolicySetupByKey.mockResolvedValue(null)

    await expect(service.retrieveSetupPolicy('missing')).rejects.toMatchObject({
      code: 'provisioning/setup-not-found',
      httpStatus: 404,
    })
  })
})

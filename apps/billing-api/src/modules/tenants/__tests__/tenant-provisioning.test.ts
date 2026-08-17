import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/db/client', () => ({ prisma: {} }))

import { provisionTenantWorkspace } from '../tenants.repository'

type TenantRow = { id: string; slug: string; provisioningVersion: number }

/**
 * A transaction double backed by an in-memory slug index, so a collision is a
 * real unique-key collision rather than a mocked rejection.
 */
function createTx(existingSlugs: string[] = []) {
  const slugs = new Set(existingSlugs)
  const created: Record<string, unknown[]> = {
    tenant: [],
    tenantCurrency: [],
    role: [],
    member: [],
  }
  let byOrganization: TenantRow | null = null

  const tx = {
    tenant: {
      findUnique: vi.fn(
        async ({
          where,
        }: {
          where: { organizationId?: string; slug?: string }
        }) => {
          if (where.slug !== undefined)
            return slugs.has(where.slug) ? { id: 'ten_existing' } : null
          return byOrganization
        }
      ),
      create: vi.fn(async ({ data }: { data: TenantRow }) => {
        if (slugs.has(data.slug))
          throw new Error(`Unique constraint failed on slug ${data.slug}`)
        slugs.add(data.slug)
        created.tenant.push(data)
        return data
      }),
    },
    tenantCurrency: {
      create: vi.fn(async ({ data }: { data: unknown }) => {
        created.tenantCurrency.push(data)
        return data
      }),
    },
    role: {
      create: vi.fn(async ({ data }: { data: unknown }) => {
        created.role.push(data)
        return data
      }),
    },
    member: {
      create: vi.fn(async ({ data }: { data: unknown }) => {
        created.member.push(data)
        return data
      }),
    },
  }

  return {
    tx,
    created,
    setExistingForOrganization(row: TenantRow) {
      byOrganization = row
    },
  }
}

const input = {
  organizationId: 'org_ecb8e673937847b8b0814cdd2ba605af',
  name: 'Test Org',
  slug: 'test-org',
  defaultCurrency: 'JMD',
  now: 1_786_962_851,
}

describe('provisionTenantWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('happy path', () => {
    it('creates the tenant, its default currency, and the owner role', async () => {
      const harness = createTx()

      const result = await provisionTenantWorkspace(harness.tx as never, input)

      expect(result).toEqual({
        id: expect.stringMatching(/^ten_/),
        created: true,
        provisioningVersion: 3,
      })
      expect(harness.created.tenant).toEqual([
        expect.objectContaining({
          organizationId: input.organizationId,
          slug: 'test-org',
          name: 'Test Org',
          countryCode: 'JM',
          status: 'ACTIVE',
          defaultCurrency: 'JMD',
          defaultLanguage: 'en',
          provisioningVersion: 3,
          provisionedAt: input.now,
        }),
      ])
      expect(harness.created.tenantCurrency).toEqual([
        expect.objectContaining({
          currencyCode: 'JMD',
          isDefault: true,
          isEnabled: true,
        }),
      ])
      expect(harness.created.role).toEqual([
        expect.objectContaining({
          slug: 'owner',
          isSystem: true,
          permissions: expect.arrayContaining([
            'billing:access',
            'members:write',
            'roles:write',
          ]),
        }),
      ])
    })

    it('seats the owner as a member when an owner account is supplied', async () => {
      const harness = createTx()

      await provisionTenantWorkspace(harness.tx as never, {
        ...input,
        ownerUserId: 'user_4f2a',
      })

      const role = harness.created.role[0] as { id: string }
      expect(harness.created.member).toEqual([
        expect.objectContaining({
          userId: 'user_4f2a',
          roleId: role.id,
          status: 'ACTIVE',
        }),
      ])
    })

    it('honours an explicit country code and language', async () => {
      const harness = createTx()

      await provisionTenantWorkspace(harness.tx as never, {
        ...input,
        countryCode: 'US',
        defaultLanguage: 'es',
      })

      expect(harness.created.tenant[0]).toMatchObject({
        countryCode: 'US',
        defaultLanguage: 'es',
      })
    })
  })

  describe('finance-provisioning path', () => {
    it('creates no member when no owner account is known', async () => {
      const harness = createTx()

      await provisionTenantWorkspace(harness.tx as never, input)

      expect(harness.tx.member.create).not.toHaveBeenCalled()
      expect(harness.created.member).toEqual([])
    })

    it('still creates the owner role so the organization owner has access', async () => {
      const harness = createTx()

      await provisionTenantWorkspace(harness.tx as never, input)

      expect(harness.created.role).toHaveLength(1)
      expect(harness.created.role[0]).toMatchObject({ slug: 'owner' })
    })
  })

  describe('slug collisions', () => {
    it('derives an organization-suffixed slug when the requested one is taken', async () => {
      const harness = createTx(['test-org'])

      const result = await provisionTenantWorkspace(harness.tx as never, input)

      expect(result.created).toBe(true)
      expect(harness.created.tenant[0]).toMatchObject({
        slug: 'test-org-a605af',
      })
    })

    it('falls back to a numeric suffix when the suffixed slug is also taken', async () => {
      const harness = createTx(['test-org', 'test-org-a605af'])

      await provisionTenantWorkspace(harness.tx as never, input)

      expect(harness.created.tenant[0]).toMatchObject({ slug: 'test-org-2' })
    })

    it('never fails provisioning because a deleted organization left its slug behind', async () => {
      const harness = createTx([
        'test-org',
        'test-org-a605af',
        ...Array.from({ length: 25 }, (_, index) => `test-org-${index + 2}`),
      ])

      const result = await provisionTenantWorkspace(harness.tx as never, input)

      expect(result.created).toBe(true)
      expect(harness.created.tenant[0]).toMatchObject({
        slug: expect.stringMatching(/^test-org-[0-9a-f]{12}$/),
      })
    })

    it('truncates a long base slug before suffixing it', async () => {
      const longSlug = 'a'.repeat(80)
      const harness = createTx([longSlug])

      await provisionTenantWorkspace(harness.tx as never, {
        ...input,
        slug: longSlug,
      })

      expect(harness.created.tenant[0]).toMatchObject({
        slug: `${'a'.repeat(60)}-a605af`,
      })
    })
  })

  describe('idempotency', () => {
    it('returns the existing workspace without writing anything', async () => {
      const harness = createTx()
      harness.setExistingForOrganization({
        id: 'ten_existing',
        slug: 'test-org',
        provisioningVersion: 2,
      })

      const result = await provisionTenantWorkspace(harness.tx as never, input)

      expect(result).toEqual({
        id: 'ten_existing',
        created: false,
        provisioningVersion: 2,
      })
      expect(harness.tx.tenant.create).not.toHaveBeenCalled()
      expect(harness.tx.tenantCurrency.create).not.toHaveBeenCalled()
      expect(harness.tx.role.create).not.toHaveBeenCalled()
      expect(harness.tx.member.create).not.toHaveBeenCalled()
    })
  })
})

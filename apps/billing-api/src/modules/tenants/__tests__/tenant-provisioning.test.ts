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
  const created: {
    tenant: unknown[]
    tenantCurrency: unknown[]
    role: unknown[]
    member: unknown[]
    paymentMode: unknown[]
  } = { tenant: [], tenantCurrency: [], role: [], member: [], paymentMode: [] }
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
    paymentMode: {
      findMany: vi.fn(async () => []),
      createMany: vi.fn(async ({ data }: { data: unknown[] }) => {
        created.paymentMode.push(...data)
        return { count: data.length }
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
    it('creates the tenant, its default currency, and the super admin role', async () => {
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
          slug: 'super-admin',
          isSystem: true,
          permissions: expect.arrayContaining([
            'billing:access',
            'members:write',
            'roles:write',
          ]),
        }),
        expect.objectContaining({ slug: 'admin', isSystem: true }),
        expect.objectContaining({ slug: 'staff', isSystem: true }),
      ])
      expect(harness.created.paymentMode).toEqual([
        expect.objectContaining({ name: 'Cash', isSystem: true, isDefault: false }),
        expect.objectContaining({ name: 'Credit Card', isSystem: true, isDefault: false }),
        expect.objectContaining({ name: 'Bank Transfer', isSystem: true, isDefault: true }),
      ])
    })

    it('withholds role editing from admin and every write from staff', async () => {
      const harness = createTx()

      await provisionTenantWorkspace(harness.tx as never, input)

      const roles = harness.created.role as {
        slug: string
        permissions: string[]
      }[]
      const admin = roles.find((role) => role.slug === 'admin')!
      const staff = roles.find((role) => role.slug === 'staff')!

      expect(admin.permissions).toContain('members:write')
      expect(admin.permissions).not.toContain('roles:write')
      expect(staff.permissions).toContain('billing:access')
      expect(staff.permissions).toContain('customers:read')
      expect(
        staff.permissions.filter((permission) => permission.endsWith(':write'))
      ).toEqual([])
    })

    it('seats the super admin as a member when a super-admin account is supplied', async () => {
      const harness = createTx()

      await provisionTenantWorkspace(harness.tx as never, {
        ...input,
        superAdminUserId: 'user_4f2a',
      })

      const role = harness.created.role.find(
        (candidate) => (candidate as { slug: string }).slug === 'super-admin'
      ) as { id: string }
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

      expect(harness.created.tenant[0]!).toMatchObject({
        countryCode: 'US',
        defaultLanguage: 'es',
      })
    })

    it('defaults countryCode to JM when not provided', async () => {
      const harness = createTx()
      await provisionTenantWorkspace(harness.tx as never, {
        ...input,
        countryCode: undefined,
      })
      expect(harness.created.tenant[0]!).toMatchObject({ countryCode: 'JM' })
    })

    it('defaults countryCode to JM when null', async () => {
      const harness = createTx()
      await provisionTenantWorkspace(harness.tx as never, {
        ...input,
        countryCode: null,
      })
      expect(harness.created.tenant[0]!).toMatchObject({ countryCode: 'JM' })
    })

    it('defaults defaultLanguage to en when not provided', async () => {
      const harness = createTx()
      await provisionTenantWorkspace(harness.tx as never, input)
      expect(harness.created.tenant[0]!).toMatchObject({
        defaultLanguage: 'en',
      })
    })

    it('uses provided defaultLanguage', async () => {
      const harness = createTx()
      await provisionTenantWorkspace(harness.tx as never, {
        ...input,
        defaultLanguage: 'fr',
      })
      expect(harness.created.tenant[0]!).toMatchObject({
        defaultLanguage: 'fr',
      })
    })

    it('creates exactly three system roles', async () => {
      const harness = createTx()
      await provisionTenantWorkspace(harness.tx as never, input)
      expect(harness.created.role).toHaveLength(3)
    })

    it('marks all roles as system and staff as default', async () => {
      const harness = createTx()
      await provisionTenantWorkspace(harness.tx as never, input)
      for (const role of harness.created.role as Array<{
        slug: string
        isSystem: boolean
        isDefault: boolean
      }>) {
        expect(role.isSystem).toBe(true)
        expect(role.isDefault).toBe(role.slug === 'staff')
      }
    })

    it('gives super admin the most permissions', async () => {
      const harness = createTx()
      await provisionTenantWorkspace(harness.tx as never, input)
      const roles = harness.created.role as Array<{
        slug: string
        permissions: string[]
      }>
      const superAdmin = roles.find((r) => r.slug === 'super-admin')!
      const admin = roles.find((r) => r.slug === 'admin')!
      const staff = roles.find((r) => r.slug === 'staff')!
      expect(superAdmin.permissions.length).toBeGreaterThan(admin.permissions.length)
      expect(admin.permissions.length).toBeGreaterThan(
        staff.permissions.length
      )
    })

    it('admin permissions are super admin minus roles:write', async () => {
      const harness = createTx()
      await provisionTenantWorkspace(harness.tx as never, input)
      const roles = harness.created.role as Array<{
        slug: string
        permissions: string[]
      }>
      const superAdmin = roles.find((r) => r.slug === 'super-admin')!
      const admin = roles.find((r) => r.slug === 'admin')!
      expect(admin.permissions).not.toContain('roles:write')
      expect(superAdmin.permissions).toContain('roles:write')
      expect(
        admin.permissions.every((p) => superAdmin.permissions.includes(p))
      ).toBe(true)
    })

    it('staff has only read permissions plus billing:access', async () => {
      const harness = createTx()
      await provisionTenantWorkspace(harness.tx as never, input)
      const staff = (
        harness.created.role as Array<{ slug: string; permissions: string[] }>
      ).find((r) => r.slug === 'staff')!
      for (const perm of staff.permissions) {
        expect(perm === 'billing:access' || perm.endsWith(':read')).toBe(true)
      }
    })

    it('staff retains billing:access even though it is not a read perm', async () => {
      const harness = createTx()
      await provisionTenantWorkspace(harness.tx as never, input)
      const staff = (
        harness.created.role as Array<{ slug: string; permissions: string[] }>
      ).find((r) => r.slug === 'staff')!
      expect(staff.permissions).toContain('billing:access')
    })

    it('creates tenantCurrency with tenantId matching tenant', async () => {
      const harness = createTx()
      await provisionTenantWorkspace(harness.tx as never, input)
      const tenant = harness.created.tenant[0] as { id: string }
      const currency = harness.created.tenantCurrency[0] as { tenantId: string }
      expect(currency.tenantId).toBe(tenant.id)
    })

    it('creates roles with same tenantId', async () => {
      const harness = createTx()
      await provisionTenantWorkspace(harness.tx as never, input)
      const tenant = harness.created.tenant[0] as { id: string }
      for (const role of harness.created.role as Array<{ tenantId: string }>) {
        expect(role.tenantId).toBe(tenant.id)
      }
    })

    it('uses provided name verbatim', async () => {
      const harness = createTx()
      await provisionTenantWorkspace(harness.tx as never, {
        ...input,
        name: 'My Custom Workspace',
      })
      expect(harness.created.tenant[0]!).toMatchObject({
        name: 'My Custom Workspace',
      })
    })

    it('returns provisioningVersion 3 for new workspace', async () => {
      const harness = createTx()
      const result = await provisionTenantWorkspace(harness.tx as never, input)
      expect(result.provisioningVersion).toBe(3)
    })

    it('creates tenant with now timestamps', async () => {
      const harness = createTx()
      await provisionTenantWorkspace(harness.tx as never, input)
      expect(harness.created.tenant[0]!).toMatchObject({
        provisionedAt: input.now,
        createdAt: input.now,
        updatedAt: input.now,
      })
    })

    it('creates member with ACTIVE status', async () => {
      const harness = createTx()
      await provisionTenantWorkspace(harness.tx as never, {
        ...input,
        superAdminUserId: 'user_super_admin',
      })
      expect(harness.created.member[0]!).toMatchObject({ status: 'ACTIVE' })
    })

    it('super-admin member roleId matches super admin role id', async () => {
      const harness = createTx()
      await provisionTenantWorkspace(harness.tx as never, {
        ...input,
        superAdminUserId: 'user_x',
      })
      const ownerRole = (
        harness.created.role as Array<{ slug: string; id: string }>
      ).find((r) => r.slug === 'super-admin')!
      expect(harness.created.member[0]!).toMatchObject({ roleId: ownerRole.id })
    })
  })

  describe('finance-provisioning path', () => {
    it('creates no member when no super admin account is known', async () => {
      const harness = createTx()

      await provisionTenantWorkspace(harness.tx as never, input)

      expect(harness.tx.member.create).not.toHaveBeenCalled()
      expect(harness.created.member).toEqual([])
    })

    it('creates no member when superAdminUserId is null', async () => {
      const harness = createTx()
      await provisionTenantWorkspace(harness.tx as never, {
        ...input,
        superAdminUserId: null,
      })
      expect(harness.created.member).toEqual([])
    })

    it('creates no member when superAdminUserId is undefined', async () => {
      const harness = createTx()
      await provisionTenantWorkspace(harness.tx as never, {
        ...input,
        superAdminUserId: undefined,
      })
      expect(harness.created.member).toEqual([])
    })

    it('still creates the system roles so the organization has access', async () => {
      const harness = createTx()

      await provisionTenantWorkspace(harness.tx as never, input)

      expect(
        (harness.created.role as { slug: string }[]).map((role) => role.slug)
      ).toEqual(['super-admin', 'admin', 'staff'])
    })

    it('does not create member when superAdminUserId is empty string', async () => {
      const harness = createTx()
      await provisionTenantWorkspace(harness.tx as never, {
        ...input,
        superAdminUserId: '',
      })
      expect(harness.created.member).toEqual([])
    })
  })

  describe('slug collisions', () => {
    it('derives an organization-suffixed slug when the requested one is taken', async () => {
      const harness = createTx(['test-org'])

      const result = await provisionTenantWorkspace(harness.tx as never, input)

      expect(result.created).toBe(true)
      expect(harness.created.tenant[0]!).toMatchObject({
        slug: 'test-org-a605af',
      })
    })

    it('falls back to a numeric suffix when the suffixed slug is also taken', async () => {
      const harness = createTx(['test-org', 'test-org-a605af'])

      await provisionTenantWorkspace(harness.tx as never, input)

      expect(harness.created.tenant[0]!).toMatchObject({ slug: 'test-org-2' })
    })

    it('never fails provisioning because a deleted organization left its slug behind', async () => {
      const harness = createTx([
        'test-org',
        'test-org-a605af',
        ...Array.from({ length: 25 }, (_, index) => `test-org-${index + 2}`),
      ])

      const result = await provisionTenantWorkspace(harness.tx as never, input)

      expect(result.created).toBe(true)
      expect(harness.created.tenant[0]!).toMatchObject({
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

      expect(harness.created.tenant[0]!).toMatchObject({
        slug: `${'a'.repeat(60)}-a605af`,
      })
    })

    it('uses numeric suffix 2 when base plus org suffix taken', async () => {
      const harness = createTx(['my-org', 'my-org-b605af'])
      await provisionTenantWorkspace(harness.tx as never, {
        ...input,
        slug: 'my-org',
        organizationId: 'org_xxb605af',
      })
      expect(harness.created.tenant[0]!).toMatchObject({ slug: 'my-org-2' })
    })

    it('uses numeric suffix 26 as last deterministic candidate', async () => {
      const slugs = [
        'test-org',
        'test-org-a605af',
        ...Array.from({ length: 24 }, (_, i) => `test-org-${i + 2}`),
      ]
      const harness = createTx(slugs)
      await provisionTenantWorkspace(harness.tx as never, input)
      expect(harness.created.tenant[0]!).toMatchObject({ slug: 'test-org-26' })
    })

    it('falls back to generated id after exhausting deterministic candidates', async () => {
      const slugs = [
        'test-org',
        'test-org-a605af',
        ...Array.from({ length: 25 }, (_, i) => `test-org-${i + 2}`),
      ]
      const harness = createTx(slugs)
      const result = await provisionTenantWorkspace(harness.tx as never, input)
      expect((harness.created.tenant[0] as { slug: string }).slug).toMatch(
        /^test-org-[0-9a-f-]{12,}$/
      )
      expect(result.created).toBe(true)
    })

    it('handles slug with exactly 60 chars without truncation', async () => {
      const slug60 = 'a'.repeat(60)
      const harness = createTx([slug60])
      await provisionTenantWorkspace(harness.tx as never, {
        ...input,
        slug: slug60,
      })
      expect((harness.created.tenant[0] as { slug: string }).slug).toBe(
        `${'a'.repeat(60)}-a605af`
      )
    })

    it('uses organizationId tail correctly (last 6 chars)', async () => {
      const harness = createTx(['collision'])
      await provisionTenantWorkspace(harness.tx as never, {
        ...input,
        slug: 'collision',
        organizationId: 'org_abc123456789',
      })
      expect(harness.created.tenant[0]!).toMatchObject({
        slug: 'collision-456789',
      })
    })

    it('tries numeric suffixes in order 2..26', async () => {
      const harness = createTx([
        'test-org',
        'test-org-a605af',
        'test-org-2',
        'test-org-3',
      ])
      await provisionTenantWorkspace(harness.tx as never, input)
      expect(harness.created.tenant[0]!).toMatchObject({ slug: 'test-org-4' })
    })

    it('does not collide when requested slug is free', async () => {
      const harness = createTx(['other-slug'])
      await provisionTenantWorkspace(harness.tx as never, input)
      expect(harness.created.tenant[0]!).toMatchObject({ slug: 'test-org' })
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

    it('preserves existing provisioningVersion', async () => {
      const harness = createTx()
      harness.setExistingForOrganization({
        id: 'ten_99',
        slug: 'test-org',
        provisioningVersion: 5,
      })
      const result = await provisionTenantWorkspace(harness.tx as never, input)
      expect(result.provisioningVersion).toBe(5)
      expect(result.id).toBe('ten_99')
      expect(result.created).toBe(false)
    })

    it('returns existing id when organization already has workspace', async () => {
      const harness = createTx()
      harness.setExistingForOrganization({
        id: 'ten_already',
        slug: 'other-slug',
        provisioningVersion: 3,
      })
      const result = await provisionTenantWorkspace(harness.tx as never, {
        ...input,
        slug: 'different-slug',
      })
      expect(result.id).toBe('ten_already')
      expect(result.created).toBe(false)
    })

    it('does not check slug collisions when returning existing', async () => {
      const harness = createTx(['test-org'])
      harness.setExistingForOrganization({
        id: 'ten_existing',
        slug: 'test-org',
        provisioningVersion: 3,
      })
      await provisionTenantWorkspace(harness.tx as never, input)
      // findUnique for slug should not be called when org exists — only organizationId lookup
      expect(harness.tx.tenant.findUnique).toHaveBeenCalledTimes(1)
      expect(harness.tx.tenant.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: input.organizationId },
        })
      )
    })

    it('is idempotent even with different slug input', async () => {
      const harness = createTx()
      harness.setExistingForOrganization({
        id: 'ten_same',
        slug: 'original-slug',
        provisioningVersion: 3,
      })
      const result = await provisionTenantWorkspace(harness.tx as never, {
        ...input,
        slug: 'new-slug',
        name: 'New Name',
      })
      expect(result.created).toBe(false)
      expect(harness.created.tenant).toEqual([])
    })
  })

  describe('currency and defaults', () => {
    it('creates tenantCurrency with correct currencyCode', async () => {
      const harness = createTx()
      await provisionTenantWorkspace(harness.tx as never, {
        ...input,
        defaultCurrency: 'USD',
      })
      expect(harness.created.tenantCurrency[0]!).toMatchObject({
        currencyCode: 'USD',
      })
    })

    it('tenant and tenantCurrency share same currency', async () => {
      const harness = createTx()
      await provisionTenantWorkspace(harness.tx as never, {
        ...input,
        defaultCurrency: 'EUR',
      })
      expect(harness.created.tenant[0]!).toMatchObject({
        defaultCurrency: 'EUR',
      })
      expect(harness.created.tenantCurrency[0]!).toMatchObject({
        currencyCode: 'EUR',
      })
    })

    it('handles JMD as default currency', async () => {
      const harness = createTx()
      await provisionTenantWorkspace(harness.tx as never, input)
      expect(harness.created.tenant[0]!).toMatchObject({
        defaultCurrency: 'JMD',
      })
    })
  })
})

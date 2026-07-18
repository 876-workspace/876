import type { PrismaTransaction } from '@/lib/db'
import { generateId } from '@/lib/id'
import { BILLING_SYSTEM_ROLES } from '@/lib/permissions'
import type {
  loadBillingApplicationProvisioningManifest,
  loadBillingProvisioningManifest,
} from '@/lib/provisioning/manifest'

type ProvisioningManifest = Awaited<
  ReturnType<typeof loadBillingProvisioningManifest>
>
type ApplicationProvisioningManifest = Awaited<
  ReturnType<typeof loadBillingApplicationProvisioningManifest>
>

export interface WorkspaceProvisioningInput {
  organizationId: string
  organizationCountryCode: string | null
  name: string
  slug: string
}

export interface EnsuredWorkspace {
  id: string
  created: boolean
  provisioningVersion: number
  ownerRoleId: string
  adminRoleId: string
}

export class ProvisioningInputError extends Error {}

/**
 * Creates missing workspace defaults without replacing tenant-owned values.
 * This is shared by embedded app provisioning and later paid Billing
 * activation, making the latter an access grant rather than a data migration.
 */
export async function ensureWorkspace(
  tx: PrismaTransaction,
  manifest: ProvisioningManifest,
  input: WorkspaceProvisioningInput,
  now: number,
  applicationManifest: ApplicationProvisioningManifest | null = null
): Promise<EnsuredWorkspace> {
  // Workspace defaults include a few intentionally non-unique, effective-dated
  // records. Serialize provisioning for one Core organization so concurrent
  // app activations cannot create duplicate defaults or roll back a newer
  // finance-connection revision.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`billing-workspace:${input.organizationId}`}, 0))`

  const defaults = manifest.defaults
  const countryCode = normalizeCountryCode(
    input.organizationCountryCode,
    defaults.countryCode
  )
  const supportedCurrencies = await tx.currency.findMany({
    where: { code: { in: defaults.currencies }, isActive: true },
    select: { code: true },
  })
  const supportedCurrencyCodes = new Set(
    supportedCurrencies.map((currency) => currency.code)
  )
  if (defaults.currencies.some((code) => !supportedCurrencyCodes.has(code)))
    throw new ProvisioningInputError('This currency is not supported.')

  const supportedLanguage = await tx.language.findFirst({
    where: { code: defaults.defaultLanguage, isActive: true },
    select: { code: true },
  })
  if (!supportedLanguage)
    throw new ProvisioningInputError('English is not supported.')

  let tenant = await tx.tenant.findUnique({
    where: { organizationId: input.organizationId },
    select: { id: true, provisioningVersion: true },
  })
  const created = tenant === null
  if (!tenant) {
    const tenantId = generateId('Tenant')
    const slug = await resolveAvailableSlug(
      tx,
      input.slug,
      tenantId,
      input.organizationId
    )
    tenant = await tx.tenant.create({
      data: {
        id: tenantId,
        organizationId: input.organizationId,
        name: input.name,
        slug,
        countryCode,
        defaultCurrency: defaults.defaultCurrency,
        defaultLanguage: defaults.defaultLanguage,
        provisioningVersion: manifest.revision,
        provisionedAt: now,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      },
      select: { id: true, provisioningVersion: true },
    })
  }
  const workspaceId = tenant.id

  await tx.tenantCurrency.createMany({
    data: defaults.currencies.map((code) => ({
      tenantId: workspaceId,
      currencyCode: code,
      isDefault: code === defaults.defaultCurrency,
      isEnabled: true,
      createdAt: now,
      updatedAt: now,
    })),
    skipDuplicates: true,
  })

  await tx.role.createMany({
    data: BILLING_SYSTEM_ROLES.map((definition) => ({
      id: generateId('Role'),
      tenantId: workspaceId,
      slug: definition.slug,
      name: definition.name,
      description: definition.description ?? '',
      permissions: definition.permissions,
      isSystem: true,
      isDefault: definition.isDefault,
      createdAt: now,
      updatedAt: now,
    })),
    skipDuplicates: true,
  })
  const systemRoles = await tx.role.findMany({
    where: {
      tenantId: workspaceId,
      slug: { in: BILLING_SYSTEM_ROLES.map(({ slug }) => slug) },
    },
    select: { id: true, slug: true },
  })
  const roles = new Map(systemRoles.map((role) => [role.slug, role.id]))

  const ownerRoleId = roles.get('owner')
  const adminRoleId = roles.get('admin')
  if (!ownerRoleId) throw new Error('Billing owner role was not created.')
  if (!adminRoleId) throw new Error('Billing admin role was not created.')

  await tx.paymentMode.createMany({
    data: defaults.paymentModes.map((name, index) => ({
      id: generateId('PaymentMode'),
      tenantId: workspaceId,
      name,
      isDefault: index === 0,
      isActive: true,
      isSystem: true,
      createdAt: now,
      updatedAt: now,
    })),
    skipDuplicates: true,
  })

  await tx.paymentTerm.createMany({
    data: defaults.paymentTerms.map((term, index) => ({
      id: generateId('PaymentTerm'),
      tenantId: workspaceId,
      name: term.name,
      rule: term.rule,
      dueDays: term.dueDays,
      isDefault: index === 0,
      isSystem: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })),
    skipDuplicates: true,
  })

  const invoiceDocumentDefaults = applicationManifest?.documentPreferences.find(
    (preference) => preference.documentType === 'INVOICE'
  )
  await tx.invoicePreference.upsert({
    where: { tenantId: workspaceId },
    update: {},
    create: {
      tenantId: workspaceId,
      ...defaults.invoicePreferences,
      defaultNotes: invoiceDocumentDefaults?.customerNote ?? null,
      defaultTerms: invoiceDocumentDefaults?.termsAndConditions ?? null,
      createdAt: now,
      updatedAt: now,
    },
  })

  if (applicationManifest)
    await tx.documentPreference.createMany({
      data: applicationManifest.documentPreferences.map((preference) => ({
        tenantId: workspaceId,
        documentType: preference.documentType,
        customerNote: preference.customerNote,
        termsAndConditions: preference.termsAndConditions,
        provisioningVersion: applicationManifest.revision,
        createdAt: now,
        updatedAt: now,
      })),
      skipDuplicates: true,
    })

  await tx.taxAuthority.createMany({
    data: defaults.taxAuthorities.map((authority, index) => ({
      id: generateId('TaxAuthority'),
      tenantId: workspaceId,
      name: authority.name,
      description: authority.description,
      countryCode: authority.countryCode,
      subdivisionCode: null,
      isDefault: index === 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })),
    skipDuplicates: true,
  })
  const taxAuthorities = await tx.taxAuthority.findMany({
    where: {
      tenantId: workspaceId,
      name: { in: defaults.taxAuthorities.map(({ name }) => name) },
    },
    select: { id: true, name: true },
  })
  const taxAuthorityIdsByName = new Map(
    taxAuthorities.map((authority) => [authority.name, authority.id])
  )
  const taxAuthorityIds = new Map(
    defaults.taxAuthorities.map((authority) => [
      authority.key,
      taxAuthorityIdsByName.get(authority.name),
    ])
  )

  const taxRateDefaults = defaults.taxRates.map((rate, index) => {
    const taxAuthorityId = taxAuthorityIds.get(rate.authorityKey)
    if (!taxAuthorityId)
      throw new ProvisioningInputError(
        `Tax authority ${rate.authorityKey} is not configured.`
      )

    return {
      id: generateId('TaxRate'),
      tenantId: workspaceId,
      taxAuthorityId,
      name: rate.name,
      description: rate.description,
      taxType: rate.taxType,
      rate: rate.rate,
      inclusive: rate.inclusive,
      startsAt: null,
      isDefault: index === 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }
  })
  const existingTaxRates = await tx.taxRate.findMany({
    where: {
      tenantId: workspaceId,
      OR: taxRateDefaults.map(({ taxAuthorityId, name }) => ({
        taxAuthorityId,
        name,
      })),
    },
    select: { taxAuthorityId: true, name: true },
  })
  const existingTaxRateKeys = new Set(
    existingTaxRates.map(({ taxAuthorityId, name }) =>
      taxRateKey(taxAuthorityId, name)
    )
  )
  const missingTaxRates = taxRateDefaults.filter(({ taxAuthorityId, name }) => {
    const key = taxRateKey(taxAuthorityId, name)
    if (existingTaxRateKeys.has(key)) return false

    existingTaxRateKeys.add(key)
    return true
  })
  if (missingTaxRates.length > 0)
    await tx.taxRate.createMany({ data: missingTaxRates })

  if (tenant.provisioningVersion < manifest.revision) {
    tenant = await tx.tenant.update({
      where: { id: tenant.id },
      data: { provisioningVersion: manifest.revision, updatedAt: now },
      select: { id: true, provisioningVersion: true },
    })
  }

  return {
    id: tenant.id,
    created,
    provisioningVersion: tenant.provisioningVersion,
    ownerRoleId,
    adminRoleId,
  }
}

/** Grant paid Billing access after the finance workspace already exists. */
export async function ensureBillingMember(
  tx: PrismaTransaction,
  tenantId: string,
  actorUserId: string,
  roleId: string,
  now: number
): Promise<void> {
  await tx.member.upsert({
    where: { tenantId_userId: { tenantId, userId: actorUserId } },
    update: { roleId, status: 'ACTIVE', updatedAt: now },
    create: {
      id: generateId('Member'),
      tenantId,
      userId: actorUserId,
      roleId,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
  })
}

async function resolveAvailableSlug(
  tx: PrismaTransaction,
  requestedSlug: string,
  tenantId: string,
  organizationId: string
): Promise<string> {
  const collision = await tx.tenant.findUnique({
    where: { slug: requestedSlug },
    select: { organizationId: true },
  })
  if (!collision || collision.organizationId === organizationId)
    return requestedSlug

  const suffix = tenantId
    .replace(/[^a-z0-9]/gi, '')
    .slice(-8)
    .toLowerCase()
  return `${requestedSlug.slice(0, 80 - suffix.length - 1)}-${suffix}`
}

function normalizeCountryCode(value: string | null, fallback: string): string {
  const countryCode = value?.trim().toUpperCase()
  return countryCode && /^[A-Z]{2}$/.test(countryCode) ? countryCode : fallback
}

function taxRateKey(taxAuthorityId: string, name: string): string {
  return JSON.stringify([taxAuthorityId, name])
}

import countries from '@876/core/countries.json'
import { z } from 'zod'

const countryCodes = new Set(countries.map((country) => country.countryCode))

const countryCodeSchema = z
  .string()
  .length(2)
  .transform((value) => value.toUpperCase())

const entitlementSchema = z.strictObject({
  target_type: z.enum(['application', 'service', 'service_capability']),
  target_key: z.string().min(1).max(120),
  enabled: z.boolean(),
})

const currencySchema = z.strictObject({
  name: z.string().min(1).max(120),
  numeric_code: z.string().max(8).optional(),
  minor_unit: z.number().int().min(0).max(8),
  symbol: z.string().max(16).optional(),
})

const paymentModeSchema = z.strictObject({
  key: z.string().min(1).max(120),
  name: z.string().min(1).max(120),
})

const paymentTermSchema = z.strictObject({
  key: z.string().min(1).max(120),
  name: z.string().min(1).max(120),
  rule: z.enum([
    'DUE_ON_RECEIPT',
    'NET_DAYS',
    'END_OF_MONTH',
    'END_OF_NEXT_MONTH',
  ]),
  due_days: z.number().int().min(0),
})

const invoicePreferenceSchema = z.strictObject({
  key: z.string().min(1).max(120),
  default_tax_behavior: z.enum(['EXCLUSIVE', 'INCLUSIVE']),
  late_fees_enabled: z.boolean(),
  late_fee_calculation_type: z.enum(['PERCENTAGE', 'FIXED']),
  late_fee_percent: z.union([z.string(), z.number()]).nullable().optional(),
  late_fee_amount: z.number().int().nullable().optional(),
  late_fee_grace_days: z.number().int().min(0),
  late_fee_generate_as_draft: z.boolean(),
})

const taxJurisdictionSchema = z.strictObject({
  key: z.string().min(1).max(120),
  name: z.string().min(1).max(120),
  country_code: countryCodeSchema,
  type: z.enum([
    'country',
    'state',
    'province',
    'county',
    'city',
    'district',
    'other',
  ]),
  code: z.string().max(120).nullable().optional(),
  parent: z.string().max(120).nullable().optional(),
})

const taxAuthoritySchema = z.strictObject({
  key: z.string().min(1).max(120),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).nullable().optional(),
  country_code: countryCodeSchema,
  jurisdiction: z.string().max(120).nullable().optional(),
})

const taxRateSchema = z.strictObject({
  key: z.string().min(1).max(120),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).nullable().optional(),
  tax_type: z.string().max(120).nullable().optional(),
  rate: z.union([z.string(), z.number()]),
  inclusive: z.boolean(),
  authority: z.string().max(120).nullable().optional(),
  jurisdiction: z.string().max(120).nullable().optional(),
  tax_code: z.string().max(120).nullable().optional(),
  effective_from: z.string().nullable().optional(),
  effective_until: z.string().nullable().optional(),
})

const taxCodeSchema = z.strictObject({
  key: z.string().min(1).max(120),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).nullable().optional(),
  code: z.string().max(120).nullable().optional(),
  scope: z.string().max(120).nullable().optional(),
})

const setupTaxSchema = z.strictObject({
  codes: z.array(taxCodeSchema).default([]),
  jurisdictions: z.array(taxJurisdictionSchema).default([]),
  authorities: z.array(taxAuthoritySchema).default([]),
  rates: z.array(taxRateSchema).default([]),
})

const setupSchema = z.strictObject({
  key: z.string().min(2).max(60),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  country_codes: z.array(countryCodeSchema).max(100),
  currency_code: z
    .string()
    .length(3)
    .transform((value) => value.toUpperCase()),
  is_fallback: z.boolean().optional().default(false),
  tax: setupTaxSchema.optional(),
})

const rawStepSchema = z.union([
  z.string().min(1).max(120),
  z.strictObject({
    key: z.string().min(1).max(120),
    description: z.string().min(1).max(1000),
    position: z.number().int().min(0),
  }),
])

const manifestSchema = z.strictObject({
  finance_dependency: z.enum(['none', 'embedded']),
  finance_scopes: z.array(z.string()).default([]),
  resources: z.union([
    z.array(z.record(z.string(), z.unknown())),
    z.record(z.string(), z.unknown()),
  ]),
  steps: z.array(rawStepSchema).default([]),
})

const applicationManifestSchema = manifestSchema.extend({
  app_slug: z.string().min(1).max(120),
})

export const provisioningImportSpecificationSchema = z
  .strictObject({
    object: z.literal('provisioning_import_specification'),
    manifest_version: z.literal(1),
    purpose: z.string().min(1),
    import_mode: z.literal('one_time_database_bootstrap'),
    runtime_source_of_truth: z.literal(false),
    delete_after_verified_import: z.boolean(),
    default_setup_key: z.string().min(2).max(60),
    default_language: z.literal('en'),
    country_scope: z.strictObject({
      caribbean: z.array(countryCodeSchema).min(1),
      united_states: z.tuple([z.literal('US')]),
      canada: z.tuple([z.literal('CA')]),
    }),
    matching: z.strictObject({
      semantics: z.literal('OR_OF_AND_GROUPS'),
      current_seed_condition: z.string().min(1),
      future_fields: z.array(z.enum(['subdivision', 'jurisdiction'])),
    }),
    default_entitlements: z.array(entitlementSchema).min(1),
    currencies: z.record(z.string().length(3), currencySchema),
    common_finance_defaults: z.strictObject({
      reconciliation: z.literal('create_missing'),
      preserve_tenant_overrides: z.literal(true),
      payment_modes: z.array(paymentModeSchema).min(1),
      payment_terms: z.array(paymentTermSchema).min(1),
      invoice_preference: invoicePreferenceSchema,
    }),
    setups: z.array(setupSchema).min(1),
    organization_manifest: manifestSchema.extend({
      target_key: z.string().min(1).max(120),
    }),
    application_manifests: z.array(applicationManifestSchema),
  })
  .superRefine((spec, ctx) => {
    const setupKeys = spec.setups.map((setup) => setup.key)
    if (new Set(setupKeys).size !== setupKeys.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['setups'],
        message: 'Provisioning setup keys must be unique.',
      })
    }

    const fallbackSetups = spec.setups.filter((setup) => setup.is_fallback)
    if (
      fallbackSetups.length !== 1 ||
      fallbackSetups[0]?.key !== spec.default_setup_key
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['default_setup_key'],
        message:
          'Exactly one setup must be the fallback and it must match default_setup_key.',
      })
    }

    if ((fallbackSetups[0]?.country_codes.length ?? 0) !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['setups'],
        message: 'The fallback setup must not assert a country.',
      })
    }

    const setupCountryCodes = new Set(
      spec.setups.flatMap((setup) => setup.country_codes)
    )
    const scopedCountryCodes = [
      ...spec.country_scope.caribbean,
      ...spec.country_scope.united_states,
      ...spec.country_scope.canada,
    ]
    if (new Set(scopedCountryCodes).size !== scopedCountryCodes.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['country_scope'],
        message: 'Regional country scope codes must not overlap.',
      })
    }
    for (const code of scopedCountryCodes) {
      if (!countryCodes.has(code)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['country_scope'],
          message: `Scoped country ${code} is not present in the canonical country catalog.`,
        })
      }
      if (!setupCountryCodes.has(code)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['country_scope'],
          message: `Scoped country ${code} does not have a provisioning setup definition.`,
        })
      }
    }

    for (const [index, setup] of spec.setups.entries()) {
      if (!spec.currencies[setup.currency_code]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['setups', index, 'currency_code'],
          message: `Currency ${setup.currency_code} is not defined by the import specification.`,
        })
      }

      for (const code of setup.country_codes) {
        if (!countryCodes.has(code)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['setups', index, 'country_codes'],
            message: `Country ${code} is not present in the canonical country catalog.`,
          })
        }
      }

      for (const jurisdiction of setup.tax?.jurisdictions ?? []) {
        if (!countryCodes.has(jurisdiction.country_code)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['setups', index, 'tax', 'jurisdictions'],
            message: `Tax jurisdiction country ${jurisdiction.country_code} is not present in the canonical country catalog.`,
          })
        }
      }
    }

    const entitlementKeys = spec.default_entitlements.map(
      (entry) => `${entry.target_type}:${entry.target_key}`
    )
    if (new Set(entitlementKeys).size !== entitlementKeys.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['default_entitlements'],
        message: 'Default entitlement targets must be unique.',
      })
    }

    const enterprise = spec.default_entitlements.find(
      (entry) =>
        entry.target_type === 'application' &&
        entry.target_key === '876-enterprise'
    )
    if (!enterprise?.enabled) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['default_entitlements'],
        message:
          '876 Enterprise must be enabled in the default entitlement policy.',
      })
    }

    const appSlugs = spec.application_manifests.map(
      (manifest) => manifest.app_slug
    )
    if (new Set(appSlugs).size !== appSlugs.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['application_manifests'],
        message: 'Application manifest slugs must be unique.',
      })
    }
  })

export type ProvisioningImportSpecification = z.infer<
  typeof provisioningImportSpecificationSchema
>
export type ProvisioningImportSetup =
  ProvisioningImportSpecification['setups'][number]
export type ProvisioningImportApplicationManifest =
  ProvisioningImportSpecification['application_manifests'][number]

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  buildApplicationImportDraft,
  buildFinanceImportDraft,
  buildOrganizationImportDraft,
  buildSetupPolicy,
} from '../provisioning-import.builders'
import { provisioningImportSpecificationSchema } from '../provisioning-import.schemas'

const SPEC_PATH = fileURLToPath(
  new URL(
    '../../../../../../docs/handoff/data/2026-08-31-provisioning-defaults.v1.json',
    import.meta.url
  )
)

async function loadSpec() {
  const text = await readFile(SPEC_PATH, 'utf8')
  return provisioningImportSpecificationSchema.parse(JSON.parse(text))
}

describe('one-time provisioning import specification', () => {
  it('parses the checked-in handoff file as manifest v1 bootstrap data', async () => {
    const spec = await loadSpec()

    expect(spec.manifest_version).toBe(1)
    expect(spec.import_mode).toBe('one_time_database_bootstrap')
    expect(spec.runtime_source_of_truth).toBe(false)
    expect(spec.default_setup_key).toBe('global-usd')
    expect(spec.default_language).toBe('en')
  })

  it('covers the declared Caribbean, US, and Canada regional scope', async () => {
    const spec = await loadSpec()
    const setupCountries = new Set(
      spec.setups.flatMap((setup) => setup.country_codes)
    )

    for (const code of spec.country_scope.caribbean)
      expect(setupCountries.has(code), code).toBe(true)
    expect(setupCountries.has('US')).toBe(true)
    expect(setupCountries.has('CA')).toBe(true)
  })

  it('keeps the fallback location-neutral', async () => {
    const spec = await loadSpec()
    const fallback = spec.setups.find(
      (setup) => setup.key === spec.default_setup_key
    )

    expect(fallback).toBeDefined()
    expect(fallback?.is_fallback).toBe(true)
    expect(fallback?.country_codes).toEqual([])
    expect(fallback?.currency_code).toBe('USD')
  })

  it('builds a valid v1-shaped finance draft and setup policy for every setup', async () => {
    const spec = await loadSpec()

    for (const setup of spec.setups) {
      const draft = buildFinanceImportDraft(spec, setup)
      const policy = buildSetupPolicy(spec, setup)

      expect(draft.manifest_version).toBe(1)
      expect(draft.reconciliation).toBe('create_missing')
      expect(draft.preserve_tenant_overrides).toBe(true)
      expect(draft.resources.some((row) => row.resource_type === 'workspace')).toBe(
        true
      )
      expect(draft.resources.some((row) => row.resource_type === 'currency')).toBe(
        true
      )
      expect(policy.conditions).toHaveLength(setup.country_codes.length)
      expect(
        policy.entitlements.some(
          (entry) =>
            entry.target_type === 'application' &&
            entry.target_key === '876-enterprise' &&
            entry.enabled
        )
      ).toBe(true)
    }
  })

  it('builds organization and application manifests without changing manifest version', async () => {
    const spec = await loadSpec()
    const organization = buildOrganizationImportDraft(spec)

    expect(organization.manifest_version).toBe(1)
    for (const application of spec.application_manifests) {
      const draft = buildApplicationImportDraft(application)
      expect(draft.manifest_version).toBe(1)
    }
  })

  it('keeps standalone Billing and Invoice entitlement separate from finance dependency', async () => {
    const spec = await loadSpec()
    const billingEntitlement = spec.default_entitlements.find(
      (entry) => entry.target_key === '876-billing'
    )
    const invoiceEntitlement = spec.default_entitlements.find(
      (entry) => entry.target_key === '876-invoice'
    )
    const invoiceManifest = spec.application_manifests.find(
      (entry) => entry.app_slug === '876-invoice'
    )

    expect(billingEntitlement?.enabled).toBe(false)
    expect(invoiceEntitlement?.enabled).toBe(false)
    expect(invoiceManifest?.finance_dependency).toBe('embedded')
  })

  it('includes Work as an independently configurable service entitlement', async () => {
    const spec = await loadSpec()
    expect(
      spec.default_entitlements.find(
        (entry) => entry.target_type === 'service' && entry.target_key === 'work'
      )
    ).toEqual({ target_type: 'service', target_key: 'work', enabled: true })
  })

  it('includes explicit Work capability policy beneath the Work service gate', async () => {
    const spec = await loadSpec()
    const capabilities = spec.default_entitlements.filter(
      (entry) => entry.target_type === 'service_capability'
    )

    expect(capabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ target_key: 'work.tasks', enabled: true }),
        expect.objectContaining({ target_key: 'work.reminders', enabled: true }),
        expect.objectContaining({ target_key: 'work.calendars', enabled: true }),
        expect.objectContaining({ target_key: 'work.events', enabled: true }),
        expect.objectContaining({ target_key: 'work.alerts', enabled: true }),
        expect.objectContaining({ target_key: 'work.my-work', enabled: true }),
        expect.objectContaining({ target_key: 'work.sync', enabled: false }),
      ])
    )
    expect(capabilities).toHaveLength(7)
  })
})

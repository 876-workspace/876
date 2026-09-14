import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { catalogDefinitions } from '@/services/provisioning-catalog'
import { buildApplicationImportDraft } from '../provisioning-import.builders'
import { COURIERS_PACKAGE_CATEGORY_DEFAULTS } from '../provisioning-import.couriers'
import { provisioningImportSpecificationSchema } from '../provisioning-import.schemas'

const SPEC_PATH = fileURLToPath(
  new URL(
    '../../../../../../docs/handoff/data/2026-08-31-provisioning-defaults.v1.json',
    import.meta.url
  )
)

async function couriersManifest() {
  const text = await readFile(SPEC_PATH, 'utf8')
  const spec = provisioningImportSpecificationSchema.parse(JSON.parse(text))
  const manifest = spec.application_manifests.find(
    (entry) => entry.app_slug === '876-couriers'
  )
  if (!manifest) throw new Error('Couriers manifest is required.')
  return manifest
}

describe('Couriers application provisioning defaults', () => {
  it('declares a broad flat package category catalog with stable keys', () => {
    expect(COURIERS_PACKAGE_CATEGORY_DEFAULTS).toHaveLength(26)
    expect(COURIERS_PACKAGE_CATEGORY_DEFAULTS.map((row) => row.key)).toEqual(
      expect.arrayContaining([
        'apparel-clothing',
        'electronics',
        'health-supplements',
        'home-kitchen',
        'automotive',
        'documents-mail',
        'business-industrial',
        'other',
      ])
    )
    expect(
      new Set(COURIERS_PACKAGE_CATEGORY_DEFAULTS.map((row) => row.key)).size
    ).toBe(COURIERS_PACKAGE_CATEGORY_DEFAULTS.length)
  })

  it('builds package_category resources into the Couriers application manifest', async () => {
    const draft = buildApplicationImportDraft(await couriersManifest())
    const categories = draft.resources.filter(
      (resource) => resource.resource_type === 'package_category'
    )

    expect(categories).toHaveLength(COURIERS_PACKAGE_CATEGORY_DEFAULTS.length)
    expect(categories[0]).toEqual({
      resource_type: 'package_category',
      key: 'apparel-clothing',
      position: 10,
      properties: [
        {
          key: 'name',
          value_type: 'string',
          string_value: 'Apparel & Clothing',
        },
        {
          key: 'description',
          value_type: 'string',
          string_value: 'Clothing, garments, and apparel.',
        },
        { key: 'sortOrder', value_type: 'integer', integer_value: 10 },
        { key: 'isActive', value_type: 'boolean', boolean_value: true },
      ],
    })
    expect(draft.reconciliation).toBe('create_missing')
    expect(draft.preserve_tenant_overrides).toBe(true)
  })

  it('registers package categories in the Couriers provisioning catalog', () => {
    const definition = catalogDefinitions('application', '876-couriers').find(
      (resource) => resource.resourceType === 'package_category'
    )

    expect(definition).toMatchObject({
      resourceType: 'package_category',
      label: 'Package categories',
      multiple: true,
      minimumItems: 1,
    })
    expect(definition?.fields.map((field) => field.key)).toEqual([
      'name',
      'description',
      'icon',
      'sortOrder',
      'isActive',
    ])
  })
})

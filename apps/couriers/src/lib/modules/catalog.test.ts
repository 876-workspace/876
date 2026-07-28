import { defineModuleCatalog } from '@876/settings'
import { describe, expect, it } from 'vitest'

import { PERMISSION_CATALOG } from '@/lib/permissions/catalog'

import {
  COURIERS_MODULE_CATALOG,
  COURIERS_MODULE_KEYS,
  isCourierModuleKey,
} from './catalog'

describe('couriers module catalog', () => {
  it('keeps permission-backed module keys aligned with the permission catalog', () => {
    const permissionModuleKeys = new Set(
      PERMISSION_CATALOG.map((module) => module.key)
    )
    const moduleKeys = COURIERS_MODULE_KEYS.filter(
      (key) => key !== 'general' && key !== 'portal'
    )

    expect(
      moduleKeys.every((moduleKey) => permissionModuleKeys.has(moduleKey))
    ).toBe(true)
  })

  it('passes shared catalog validation', () => {
    expect(() =>
      defineModuleCatalog(
        COURIERS_MODULE_CATALOG.map((module) => ({
          ...module,
          preferences: module.preferences.map((preference) => ({
            ...preference,
            ...(preference.type === 'enum'
              ? {
                  options: preference.options.map((option) => ({ ...option })),
                }
              : {}),
          })),
        }))
      )
    ).not.toThrow()
  })

  it('derives module keys in catalog order', () => {
    expect(COURIERS_MODULE_KEYS).toEqual(
      COURIERS_MODULE_CATALOG.map((module) => module.key)
    )
  })

  it.each([
    ['deliveries', true],
    ['nope', false],
    ['', false],
  ] as const)(
    'identifies %j as a courier module key: %s',
    (value, expected) => {
      expect(isCourierModuleKey(value)).toBe(expected)
    }
  )

  it('defines the packages volumetric divisor', () => {
    const preference = COURIERS_MODULE_CATALOG.find(
      (module) => module.key === 'packages'
    )?.preferences.find((candidate) => candidate.key === 'volumetric_divisor')

    expect(preference).toEqual({
      key: 'volumetric_divisor',
      label: 'Volumetric divisor',
      type: 'integer',
      default: 5000,
      min: 1000,
      max: 10000,
      hint: '5000 for courier, 6000 for air freight.',
    })
  })

  it('defines the invoices GCT rate', () => {
    const preference = COURIERS_MODULE_CATALOG.find(
      (module) => module.key === 'invoices'
    )?.preferences.find((candidate) => candidate.key === 'gct_rate')

    expect(preference).toEqual({
      key: 'gct_rate',
      label: 'GCT rate',
      type: 'decimal',
      default: '15.00',
      min: '0',
      max: '100',
      hint: 'Jamaica General Consumption Tax rate.',
    })
  })

  it('defines automatic customer home-branch assignment', () => {
    const preference = COURIERS_MODULE_CATALOG.find(
      (module) => module.key === 'customers'
    )?.preferences.find(
      (candidate) => candidate.key === 'auto_assign_home_branch'
    )

    expect(preference).toEqual({
      key: 'auto_assign_home_branch',
      label: 'Auto-assign home branch',
      type: 'boolean',
      default: true,
      hint: 'Assign new customers to the default branch.',
    })
  })

  it('stores every decimal default as a string', () => {
    for (const module of COURIERS_MODULE_CATALOG) {
      for (const preference of module.preferences) {
        if (preference.type === 'decimal')
          expect(typeof preference.default).toBe('string')
      }
    }
  })
})

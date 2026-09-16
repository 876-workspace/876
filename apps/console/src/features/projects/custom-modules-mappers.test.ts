import { describe, expect, it } from 'vitest'

import {
  toUiCustomModule,
  toUiCustomModuleRecord,
  toUiCustomModuleStatus,
} from './custom-modules-mappers'
import {
  makeCustomModule,
  makeCustomModuleStatus,
  makeCustomRecord,
} from './test-fixtures'

describe('toUiCustomModule', () => {
  it('maps the module identity with the object discriminator', () => {
    const customModule = toUiCustomModule(makeCustomModule(), {
      fieldCount: 2,
      recordCount: 5,
    })

    expect(customModule.object).toBe('projects.custom-module')
    expect(customModule.id).toBe('cmod_1')
    expect(customModule.key).toBe('risk-log')
    expect(customModule.singularName).toBe('Risk')
    expect(customModule.pluralName).toBe('Risks')
  })

  it('carries the provided field and record counts', () => {
    const customModule = toUiCustomModule(makeCustomModule(), {
      fieldCount: 3,
      recordCount: 7,
    })

    expect(customModule.fieldCount).toBe(3)
    expect(customModule.recordCount).toBe(7)
  })

  it('falls back to an empty icon when the service icon is null', () => {
    const customModule = toUiCustomModule(makeCustomModule({ icon: null }), {
      fieldCount: 0,
      recordCount: 0,
    })

    expect(customModule.icon).toBe('')
  })
})

describe('toUiCustomModuleStatus', () => {
  it('maps the status key, label, category, and position', () => {
    const status = toUiCustomModuleStatus(makeCustomModuleStatus())

    expect(status).toEqual({
      key: 'open',
      label: 'Open',
      category: 'open',
      position: 0,
    })
  })

  it('preserves non-open categories', () => {
    const status = toUiCustomModuleStatus(
      makeCustomModuleStatus({ key: 'done', label: 'Done', category: 'done' })
    )

    expect(status.category).toBe('done')
  })
})

describe('toUiCustomModuleRecord', () => {
  it('maps the record identity with the object discriminator', () => {
    const record = toUiCustomModuleRecord(makeCustomRecord())

    expect(record.object).toBe('projects.custom-module-record')
    expect(record.id).toBe('cmodr_1')
    expect(record.moduleId).toBe('cmod_1')
    expect(record.title).toBe('Vendor delay')
    expect(record.statusKey).toBe('open')
  })

  it('renames service fields to UI values without sharing the reference', () => {
    const source = makeCustomRecord()
    const record = toUiCustomModuleRecord(source)

    expect(record.values).toEqual({ severity: 'high' })
    expect(record.values).not.toBe(source.fields)
  })
})

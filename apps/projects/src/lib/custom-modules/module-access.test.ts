import type { CustomModule } from '@876/projects/contracts'
import { describe, expect, it } from 'vitest'

import {
  callerRoleKeys,
  customModuleLayoutEntity,
  defaultStatusKey,
  fieldLabelFor,
  findModuleByKey,
  hasModuleAccess,
  isValidModuleKey,
  keyFromName,
  orgScopeModules,
  projectScopeModules,
  resolveCustomModuleNavEntries,
  roleKeysHeaderValue,
  statusLabelFor,
  visibleModules,
} from './module-access'

function makeModule(overrides: Partial<CustomModule> = {}): CustomModule {
  return {
    object: 'projects.custom-module' as const,
    id: 'cmod_1',
    scope: 'org' as const,
    projectId: null,
    key: 'risks',
    singularName: 'Risk',
    pluralName: 'Risks',
    icon: 'forms',
    version: 1,
    restrictedToRoleKeys: [] as string[],
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  }
}

describe('module keys', () => {
  it('accepts kebab-case keys starting with a letter', () => {
    expect(isValidModuleKey('risks')).toBe(true)
    expect(isValidModuleKey('risk-log-2')).toBe(true)
  })

  it('rejects keys with capitals, underscores, or leading digits', () => {
    expect(isValidModuleKey('RiskLog')).toBe(false)
    expect(isValidModuleKey('risk_log')).toBe(false)
    expect(isValidModuleKey('2-risks')).toBe(false)
    expect(isValidModuleKey('')).toBe(false)
  })

  it('derives a kebab key from a display name', () => {
    expect(keyFromName('Risk Log')).toBe('risk-log')
    expect(keyFromName('  Vendor  Onboarding!! ')).toBe('vendor-onboarding')
  })

  it('builds the layout entity for a module key', () => {
    expect(customModuleLayoutEntity('risks')).toBe('custom-module:risks')
  })
})

describe('caller role keys', () => {
  it('passes resolved permissions through as role keys', () => {
    expect(callerRoleKeys(['projects.view', 'projects.edit'])).toEqual([
      'projects.view',
      'projects.edit',
    ])
  })

  it('drops blank permissions', () => {
    expect(callerRoleKeys(['projects.view', '  '])).toEqual(['projects.view'])
  })

  it('serializes role keys as a comma-separated header', () => {
    expect(roleKeysHeaderValue(['admin', ' manager '])).toBe('admin,manager')
    expect(roleKeysHeaderValue([])).toBe('')
  })

  it('opens unrestricted modules to every caller', () => {
    expect(hasModuleAccess([], [])).toBe(true)
  })

  it('requires an intersection for restricted modules', () => {
    expect(hasModuleAccess(['admin'], ['admin', 'staff'])).toBe(true)
    expect(hasModuleAccess(['admin'], ['staff'])).toBe(false)
  })

  it('filters module lists to what the caller may use', () => {
    const modules = [
      makeModule({ id: 'cmod_1', key: 'risks' }),
      makeModule({ id: 'cmod_2', key: 'secrets', restrictedToRoleKeys: ['admin'] }),
    ]
    expect(visibleModules(modules, ['staff']).map((module) => module.key)).toEqual(['risks'])
    expect(visibleModules(modules, ['admin']).map((module) => module.key)).toEqual([
      'risks',
      'secrets',
    ])
  })
})

describe('module lookup', () => {
  it('finds a module by key', () => {
    const modules = [makeModule({ key: 'risks' })]
    expect(findModuleByKey(modules, 'risks')?.id).toBe('cmod_1')
    expect(findModuleByKey(modules, 'unknown')).toBeNull()
  })

  it('splits org and project scopes', () => {
    const modules = [
      makeModule({ id: 'cmod_1', scope: 'org', projectId: null }),
      makeModule({ id: 'cmod_2', scope: 'project', projectId: 'proj_1' }),
      makeModule({ id: 'cmod_3', scope: 'project', projectId: null }),
    ]
    expect(orgScopeModules(modules).map((module) => module.id)).toEqual(['cmod_1'])
    expect(projectScopeModules(modules, 'proj_1').map((module) => module.id)).toEqual([
      'cmod_2',
      'cmod_3',
    ])
    expect(projectScopeModules(modules, 'proj_2').map((module) => module.id)).toEqual(['cmod_3'])
  })

  it('resolves plain-data sidebar entries with icon keys', () => {
    const group = resolveCustomModuleNavEntries([
      { key: 'risks', pluralName: 'Risks', icon: 'forms' },
    ])
    expect(group.key).toBe('custom-modules')
    expect(group.entries).toHaveLength(1)
    expect(group.entries[0]).toMatchObject({
      key: 'custom-module-risks',
      title: 'Risks',
      href: '/m/risks',
      icon: 'forms',
    })
    expect(JSON.parse(JSON.stringify(group.entries[0]))).toMatchObject({ href: '/m/risks' })
  })

  it('falls back to the forms icon when a module has no icon', () => {
    const group = resolveCustomModuleNavEntries([
      { key: 'risks', pluralName: 'Risks', icon: null },
    ])
    expect(group.entries[0]?.icon).toBe('forms')
  })
})

describe('status and field labels', () => {
  it('prefers the default status key', () => {
    expect(
      defaultStatusKey([
        { key: 'triage', isDefault: false },
        { key: 'open', isDefault: true },
      ])
    ).toBe('open')
  })

  it('falls back to the first status without a default', () => {
    expect(defaultStatusKey([{ key: 'triage', isDefault: false }])).toBe('triage')
    expect(defaultStatusKey([])).toBe('open')
  })

  it('resolves status labels with a key fallback', () => {
    expect(statusLabelFor([{ key: 'triage', label: 'Triage' }], 'triage')).toBe('Triage')
    expect(statusLabelFor([], 'triage')).toBe('triage')
  })

  it('resolves field labels with a key fallback', () => {
    expect(fieldLabelFor([{ key: 'severity', label: 'Severity' }], 'severity')).toBe('Severity')
    expect(fieldLabelFor([], 'severity')).toBe('severity')
  })
})

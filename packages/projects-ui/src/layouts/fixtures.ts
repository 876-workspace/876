import type {
  Layout,
  LayoutCondition,
  LayoutEffect,
  LayoutField,
  LayoutRule,
  LayoutSection,
} from './types'

function layoutField(
  fieldKey: string,
  overrides: Partial<LayoutField> = {}
): LayoutField {
  return { fieldKey, width: 1, visible: true, ...overrides }
}

function layoutSection(
  key: string,
  overrides: Partial<LayoutSection> = {}
): LayoutSection {
  return { key, title: key, columns: 1, fields: [], ...overrides }
}

function layoutCondition(
  fieldKey: string,
  op: LayoutCondition['op'],
  value?: string | string[]
): LayoutCondition {
  return value === undefined ? { fieldKey, op } : { fieldKey, op, value }
}

function layoutEffect(
  fieldKey: string,
  effect: LayoutEffect['effect']
): LayoutEffect {
  return { fieldKey, effect }
}

function layoutRule(
  key: string,
  overrides: Partial<LayoutRule> = {}
): LayoutRule {
  return { key, when: [], then: [], ...overrides }
}

function layoutFixture(overrides: Partial<Layout> = {}): Layout {
  return {
    object: 'projects.layout',
    id: 'layout-1',
    entity: 'work-item',
    workItemTypeId: null,
    name: 'Work item default',
    version: 3,
    isDefault: true,
    builtIn: false,
    sections: [],
    rules: [],
    ...overrides,
  }
}

export {
  layoutCondition,
  layoutEffect,
  layoutField,
  layoutFixture,
  layoutRule,
  layoutSection,
}

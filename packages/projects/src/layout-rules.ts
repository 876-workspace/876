export const LAYOUT_SYSTEM_FIELD_KEYS = [
  'title',
  'description',
  'state',
  'priority',
  'assignee',
  'dueDate',
  'startDate',
  'estimate',
  'labels',
  'phase',
  'taskList',
] as const

export type LayoutSystemFieldKey = (typeof LAYOUT_SYSTEM_FIELD_KEYS)[number]

export type LayoutField = {
  fieldKey: string
  width: 1 | 2
  visible: boolean
}

export type LayoutSection = {
  key: string
  title: string
  columns: 1 | 2
  fields: LayoutField[]
}

export type LayoutConditionOp =
  | 'equals'
  | 'not-equals'
  | 'in'
  | 'is-empty'
  | 'is-not-empty'

export type LayoutCondition = {
  fieldKey: string
  op: LayoutConditionOp
  value?: string | string[]
}

export type LayoutEffectName = 'show' | 'hide' | 'require' | 'disable'

export type LayoutEffect = {
  fieldKey: string
  effect: LayoutEffectName
}

export type LayoutRule = {
  key: string
  when: LayoutCondition[]
  then: LayoutEffect[]
}

export type LayoutEntity = 'project' | 'phase' | 'work-item' | `custom-module:${string}`

export type Layout = {
  object: 'projects.layout'
  id: string | null
  entity: LayoutEntity
  workItemTypeId: string | null
  name: string
  version: number
  isDefault: boolean
  builtIn: boolean
  sections: LayoutSection[]
  rules: LayoutRule[]
}

export type FieldState = {
  visible: boolean
  required: boolean
  disabled: boolean
}

export type LayoutValues = Record<string, string | string[] | null | undefined>

function isEmptyValue(value: string | string[] | null | undefined): boolean {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  )
}

function valuesEqual(
  actual: string | string[] | null | undefined,
  expected: string | string[] | undefined
): boolean {
  if (Array.isArray(actual) || Array.isArray(expected)) {
    if (!Array.isArray(actual) || !Array.isArray(expected)) return false
    return (
      actual.length === expected.length &&
      actual.every((item, index) => item === expected[index])
    )
  }
  return (actual ?? null) === (expected ?? null)
}

function matchesCondition(
  condition: LayoutCondition,
  values: LayoutValues
): boolean {
  const actual = values[condition.fieldKey]
  switch (condition.op) {
    case 'is-empty':
      return isEmptyValue(actual)
    case 'is-not-empty':
      return !isEmptyValue(actual)
    case 'equals':
      return valuesEqual(actual, condition.value)
    case 'not-equals':
      return !valuesEqual(actual, condition.value)
    case 'in': {
      const allowed = condition.value
      if (!Array.isArray(allowed)) return false
      if (Array.isArray(actual))
        return actual.some((item) => allowed.includes(item))
      if (actual === null || actual === undefined) return false
      return allowed.includes(actual)
    }
  }
}

function ruleApplies(rule: LayoutRule, values: LayoutValues): boolean {
  return matchesConditions(rule.when, values)
}

/**
 * Matches one AND-group of layout conditions against field values.
 *
 * Exported so automation rules reuse the exact condition vocabulary as layout
 * rules instead of growing a second matcher.
 */
export function matchesConditions(
  when: LayoutCondition[],
  values: LayoutValues
): boolean {
  return when.every((condition) => matchesCondition(condition, values))
}

/**
 * Evaluates a layout's declarative rules against field values.
 *
 * Every field declared in the layout starts from its authored visibility;
 * each active rule (all `when` conditions match, AND) applies its `then`
 * effects. Conflicts resolve as: `hide` beats `show`, `require` on a hidden
 * field is ignored, and `disable` is independent of visibility.
 */
export function evaluateLayoutRules(
  layout: Layout,
  values: LayoutValues
): Record<string, FieldState> {
  const states: Record<string, FieldState> = {}
  for (const section of layout.sections) {
    for (const field of section.fields) {
      states[field.fieldKey] ??= {
        visible: field.visible,
        required: false,
        disabled: false,
      }
    }
  }

  const showRequested = new Set<string>()
  const hideRequested = new Set<string>()
  const requireRequested = new Set<string>()
  const disableRequested = new Set<string>()

  for (const rule of layout.rules) {
    if (!ruleApplies(rule, values)) continue
    for (const effect of rule.then) {
      switch (effect.effect) {
        case 'show':
          showRequested.add(effect.fieldKey)
          break
        case 'hide':
          hideRequested.add(effect.fieldKey)
          break
        case 'require':
          requireRequested.add(effect.fieldKey)
          break
        case 'disable':
          disableRequested.add(effect.fieldKey)
          break
      }
    }
  }

  for (const fieldKey of showRequested) {
    states[fieldKey] ??= { visible: true, required: false, disabled: false }
  }
  for (const fieldKey of hideRequested) {
    states[fieldKey] ??= { visible: true, required: false, disabled: false }
  }

  for (const [fieldKey, state] of Object.entries(states)) {
    if (hideRequested.has(fieldKey)) state.visible = false
    else if (showRequested.has(fieldKey)) state.visible = true
    state.disabled = disableRequested.has(fieldKey)
    state.required = requireRequested.has(fieldKey) && state.visible
  }

  return states
}

/**
 * Normalizes a stored or submitted field value onto the evaluator's domain.
 */
export function toLayoutValue(
  value: unknown
): string | string[] | null | undefined {
  if (value === null || value === undefined) return null
  if (Array.isArray(value)) return value.map((item) => String(item))
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value)
  return null
}

import type { FieldState } from './types'

export { evaluateLayoutRules } from '@876/projects/layout-rules'

/** A field no rule mentions and no section authors starts visible, optional, enabled. */
export const DEFAULT_FIELD_STATE: FieldState = {
  visible: true,
  required: false,
  disabled: false,
}

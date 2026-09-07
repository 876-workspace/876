export type FormFieldType =
  'checkbox' | 'email' | 'money' | 'number' | 'select' | 'text'

export interface FormOption {
  label: string
  value: string
}

export interface FormVisibilityCondition {
  field: string
  equals: boolean | string
}

export interface FormField {
  name: string
  label: string
  type: FormFieldType
  description?: string
  initialValue?: boolean | string
  options?: FormOption[]
  placeholder?: string
  required?: boolean
  /**
   * Render the field non-editable while still submitting its value — used for
   * values the organization fixes elsewhere, such as its operating currency.
   */
  locked?: boolean
  /** Submit an empty field as null so optional relationships can be cleared. */
  emptyAsNull?: boolean
  /**
   * Name of another field that must be provided together with this one.
   * If either field is empty/omitted, both are dropped from the payload.
   */
  pairedWith?: string
  /** Plain-data conditions that must all match before this field is submitted. */
  visibleWhen?: FormVisibilityCondition[]
}

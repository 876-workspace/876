export type FormFieldType =
  | 'checkbox'
  | 'email'
  | 'money'
  | 'number'
  | 'select'
  | 'textarea'
  | 'text'

export interface FormOption {
  label: string
  value: string
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
  /** Submit an empty field as null so optional relationships can be cleared. */
  emptyAsNull?: boolean
  /**
   * Name of another field that must be provided together with this one.
   * If either field is empty/omitted, both are dropped from the payload.
   */
  pairedWith?: string
}

import * as z from 'zod'

export const addressTypeValues = [
  'billing',
  'shipping',
  'home',
  'work',
  'other',
] as const

export const addressTypeSchema = z.enum(addressTypeValues)
export type AddressType = z.infer<typeof addressTypeSchema>

export const addressCreateDraftSchema = z.strictObject({
  type: addressTypeSchema,
  label: z.string(),
  line1: z.string(),
  line2: z.string(),
  city: z.string(),
  countryCode: z.string(),
  postalCode: z.string(),
  isDefault: z.boolean(),
})
export type AddressCreateDraft = z.infer<typeof addressCreateDraftSchema>

export const addressUpdateDraftSchema = z.strictObject({
  type: addressTypeSchema,
  label: z.string(),
  line1: z.string(),
  line2: z.string(),
  city: z.string(),
  country_code: z.string(),
  postal_code: z.string(),
  is_default: z.boolean(),
})
export type AddressUpdateDraft = z.infer<typeof addressUpdateDraftSchema>

export type AddressCreateDraftChange = <Field extends keyof AddressCreateDraft>(
  field: Field,
  value: AddressCreateDraft[Field]
) => void

export type AddressUpdateDraftChange = <Field extends keyof AddressUpdateDraft>(
  field: Field,
  value: AddressUpdateDraft[Field]
) => void

type AddressFormBaseProps = {
  isPending: boolean
  error: string | null
  onCancel: () => void
  onSubmit: () => void
}

export type AddressCreateFormProps = AddressFormBaseProps & {
  mode: 'create'
  draft: AddressCreateDraft
  onDraftChange: AddressCreateDraftChange
}

export type AddressUpdateFormProps = AddressFormBaseProps & {
  mode: 'edit'
  draft: AddressUpdateDraft
  onDraftChange: AddressUpdateDraftChange
}

export type AddressFormProps = AddressCreateFormProps | AddressUpdateFormProps

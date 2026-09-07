import { z } from 'zod'

export const ItemPreferencesUpdateSchema = z.strictObject({
  productVariants: z.boolean(),
})

export type ItemPreferencesUpdateParams = z.infer<
  typeof ItemPreferencesUpdateSchema
>

export interface ItemPreferencesResource {
  object: 'item_preferences'
  productVariants: boolean
}

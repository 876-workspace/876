import { z } from 'zod'

export const widgetFeatureUpdateSchema = z.strictObject({
  enabled: z.boolean(),
})

export type WidgetFeatureUpdate = z.infer<typeof widgetFeatureUpdateSchema>

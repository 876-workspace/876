import * as z from 'zod'

export const manifestStatusSchema = z.enum([
  'DRAFT',
  'SEALED',
  'IN_TRANSIT',
  'ARRIVED',
  'CUSTOMS_HOLD',
  'CLEARED',
])
export type ManifestStatus = z.infer<typeof manifestStatusSchema>

export const shipmentModeSchema = z.enum(['AIR', 'SEA'])
export type ShipmentMode = z.infer<typeof shipmentModeSchema>

export const manifestViewSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  warehouseId: z.string().nullable(),
  manifestNumber: z.string(),
  status: manifestStatusSchema,
  mode: shipmentModeSchema,
  description: z.string().nullable(),
  notes: z.string().nullable(),
  mawbNumber: z.string().nullable(),
  hawbNumber: z.string().nullable(),
  airline: z.string().nullable(),
  flightNumber: z.string().nullable(),
  departureAirport: z.string().nullable(),
  arrivalAirport: z.string().nullable(),
  billOfLading: z.string().nullable(),
  vesselName: z.string().nullable(),
  voyageNumber: z.string().nullable(),
  departurePort: z.string().nullable(),
  arrivalPort: z.string().nullable(),
  forwarderName: z.string().nullable(),
  sealedAt: z.number().int().nullable(),
  departedAt: z.number().int().nullable(),
  estimatedArrivalAt: z.number().int().nullable(),
  arrivedAt: z.number().int().nullable(),
  clearedAt: z.number().int().nullable(),
  customsEntryNumber: z.string().nullable(),
  totalPackages: z.number().int(),
  totalWeight: z.number().nullable(),
  totalDeclaredValue: z.number().int().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type ManifestView = z.infer<typeof manifestViewSchema>

export const manifestCreateParamsSchema = z.strictObject({
  warehouseId: z.string().optional(),
  manifestNumber: z.string().min(1),
  mode: shipmentModeSchema,
  description: z.string().optional(),
  notes: z.string().optional(),
  mawbNumber: z.string().optional(),
  hawbNumber: z.string().optional(),
  airline: z.string().optional(),
  flightNumber: z.string().optional(),
  departureAirport: z.string().optional(),
  arrivalAirport: z.string().optional(),
  billOfLading: z.string().optional(),
  vesselName: z.string().optional(),
  voyageNumber: z.string().optional(),
  departurePort: z.string().optional(),
  arrivalPort: z.string().optional(),
  forwarderName: z.string().optional(),
  estimatedArrivalAt: z.number().int().optional(),
})
export type ManifestCreateParams = z.input<typeof manifestCreateParamsSchema>

export const manifestUpdateParamsSchema = z.strictObject({
  warehouseId: z.string().optional(),
  status: manifestStatusSchema.optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  mawbNumber: z.string().optional(),
  hawbNumber: z.string().optional(),
  airline: z.string().optional(),
  flightNumber: z.string().optional(),
  departureAirport: z.string().optional(),
  arrivalAirport: z.string().optional(),
  billOfLading: z.string().optional(),
  vesselName: z.string().optional(),
  voyageNumber: z.string().optional(),
  departurePort: z.string().optional(),
  arrivalPort: z.string().optional(),
  forwarderName: z.string().optional(),
  sealedAt: z.number().int().optional(),
  departedAt: z.number().int().optional(),
  estimatedArrivalAt: z.number().int().optional(),
  arrivedAt: z.number().int().optional(),
  clearedAt: z.number().int().optional(),
  customsEntryNumber: z.string().optional(),
  totalPackages: z.number().int().optional(),
  totalWeight: z.number().optional(),
  totalDeclaredValue: z.number().int().optional(),
})
export type ManifestUpdateParams = z.input<typeof manifestUpdateParamsSchema>

export const manifestRetrieveParamsSchema = z.strictObject({
  id: z.string(),
})
export type ManifestRetrieveParams = z.input<
  typeof manifestRetrieveParamsSchema
>

export const manifestListParamsSchema = z.strictObject({
  limit: z.number().int().optional(),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
  status: manifestStatusSchema.optional(),
  mode: shipmentModeSchema.optional(),
  warehouseId: z.string().optional(),
})
export type ManifestListParams = z.input<typeof manifestListParamsSchema>

export const manifestSearchParamsSchema = z.strictObject({
  query: z.string().min(1),
  limit: z.number().int().optional(),
})
export type ManifestSearchParams = z.input<typeof manifestSearchParamsSchema>

export const deletedManifestSchema = z.object({
  id: z.string(),
  deleted: z.literal(true),
})
export type DeletedManifest = z.infer<typeof deletedManifestSchema>

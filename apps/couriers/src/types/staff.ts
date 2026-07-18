import * as z from 'zod'

// ── StaffPosition ─────────────────────────────────────────────────────────────

export const staffPositionViewSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type StaffPositionView = z.infer<typeof staffPositionViewSchema>

export const staffPositionCreateParamsSchema = z.strictObject({
  name: z.string().min(1),
  isActive: z.boolean().optional(),
})
export type StaffPositionCreateParams = z.input<
  typeof staffPositionCreateParamsSchema
>

export const staffPositionUpdateParamsSchema = z.strictObject({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
})
export type StaffPositionUpdateParams = z.input<
  typeof staffPositionUpdateParamsSchema
>

export const staffPositionRetrieveParamsSchema = z.strictObject({
  id: z.string(),
})
export type StaffPositionRetrieveParams = z.input<
  typeof staffPositionRetrieveParamsSchema
>

export const staffPositionListParamsSchema = z.strictObject({
  limit: z.number().int().optional(),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
  isActive: z.boolean().optional(),
})
export type StaffPositionListParams = z.input<
  typeof staffPositionListParamsSchema
>

export const staffPositionSearchParamsSchema = z.strictObject({
  query: z.string().min(1),
  limit: z.number().int().optional(),
})
export type StaffPositionSearchParams = z.input<
  typeof staffPositionSearchParamsSchema
>

export const deletedStaffPositionSchema = z.object({
  id: z.string(),
  deleted: z.literal(true),
})
export type DeletedStaffPosition = z.infer<typeof deletedStaffPositionSchema>

// ── StaffMember ───────────────────────────────────────────────────────────────

export const staffMemberViewSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  branchId: z.string().nullable(),
  positionId: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type StaffMemberView = z.infer<typeof staffMemberViewSchema>

export const staffMemberCreateParamsSchema = z.strictObject({
  userId: z.string(),
  branchId: z.string().optional(),
  positionId: z.string().optional(),
  isActive: z.boolean().optional(),
})
export type StaffMemberCreateParams = z.input<
  typeof staffMemberCreateParamsSchema
>

export const staffMemberUpdateParamsSchema = z.strictObject({
  branchId: z.string().optional(),
  positionId: z.string().optional(),
  isActive: z.boolean().optional(),
})
export type StaffMemberUpdateParams = z.input<
  typeof staffMemberUpdateParamsSchema
>

export const staffMemberRetrieveParamsSchema = z.strictObject({
  id: z.string(),
})
export type StaffMemberRetrieveParams = z.input<
  typeof staffMemberRetrieveParamsSchema
>

export const staffMemberListParamsSchema = z.strictObject({
  limit: z.number().int().optional(),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
  branchId: z.string().optional(),
  positionId: z.string().optional(),
  isActive: z.boolean().optional(),
})
export type StaffMemberListParams = z.input<typeof staffMemberListParamsSchema>

export const deletedStaffMemberSchema = z.object({
  id: z.string(),
  deleted: z.literal(true),
})
export type DeletedStaffMember = z.infer<typeof deletedStaffMemberSchema>

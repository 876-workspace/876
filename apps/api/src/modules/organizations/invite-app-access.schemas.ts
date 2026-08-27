import { z } from 'zod'

/** Additive role-selection fields for organization invite create/update flows. */
export const inviteAppAccessSelectionBodySchema = z.strictObject({
  app_role_id: z.string().min(1).optional().nullable(),
  org_role_id: z.string().min(1).optional().nullable(),
})

export type InviteAppAccessSelectionBody = z.infer<
  typeof inviteAppAccessSelectionBodySchema
>

import { z } from 'zod'

/** Browser input for creating the first Enterprise workspace. */
export const organizationBootstrapInputSchema = z.strictObject({
  name: z.string().trim().min(1),
})

export type OrganizationBootstrapInput = z.infer<
  typeof organizationBootstrapInputSchema
>

/** Same-origin response after the platform creates or finds a workspace. */
export type OrganizationBootstrapResult = {
  object: 'onboarding_organization'
  organization_id: string
}

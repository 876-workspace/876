import * as z from 'zod'

export const contactFormInputSchema = z.strictObject({
  contactUserId: z.string(),
  nickname: z.string(),
  notes: z.string(),
})
export type ContactFormInput = z.infer<typeof contactFormInputSchema>

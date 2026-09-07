import { z } from 'zod'

export const supportRequestDraftSchema = z.strictObject({
  subject: z.string().trim().min(1).max(240),
  description: z.string().trim().max(20_000).nullable().optional(),
  categoryId: z.string().trim().max(160).nullable().optional(),
})

export type SupportRequestDraft = z.infer<typeof supportRequestDraftSchema>

/**
 * Maps a support-service failure onto the HTTP status a host route returns.
 * A missing support destination is 876's own misconfiguration (503); anything
 * else the CRM service reports is an upstream failure (502). Shared so the
 * three host apps cannot disagree about what a support outage looks like.
 */
export function supportResponseStatus(
  errorCode: string | undefined,
  successStatus: number
): number {
  if (!errorCode) return successStatus
  return errorCode === 'crm/not-configured' ? 503 : 502
}

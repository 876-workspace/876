import {
  createWorkRecurrenceRuleInputSchema,
  workRecurrenceDraftSchema,
  type CreateWorkRecurrenceRuleInput,
} from '@876/work'
import type { Request } from 'express'

import { getPrincipal } from './auth/principal.js'

/**
 * Session callers never supply acting-user identity. Integration callers keep
 * the existing explicit `createdBy` Work contract because they have no user
 * principal to inject.
 */
export function parseResourceRecurrenceCommand(
  request: Request
): CreateWorkRecurrenceRuleInput {
  const principal = getPrincipal(request)
  if (principal.kind === 'session') {
    const draft = workRecurrenceDraftSchema.parse(request.body)
    return createWorkRecurrenceRuleInputSchema.parse({
      ...draft,
      createdBy: principal.userId,
    })
  }

  return createWorkRecurrenceRuleInputSchema.parse(request.body)
}

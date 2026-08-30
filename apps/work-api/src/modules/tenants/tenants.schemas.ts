import { isWorkIntegrationScope } from '@876/work'
import { z } from 'zod'
export const ensureTenantBodySchema = z
  .strictObject({
    organizationId: z.string().trim().min(1),
    appId: z.string().trim().min(1).optional(),
    scopes: z.array(z.string().trim().min(1)).optional(),
  })
  .superRefine((value, context) => {
    if (value.scopes && !value.appId)
      context.addIssue({
        code: 'custom',
        path: ['appId'],
        message: 'appId is required when scopes are supplied.',
      })
    for (const scope of value.scopes ?? [])
      if (!isWorkIntegrationScope(scope))
        context.addIssue({
          code: 'custom',
          path: ['scopes'],
          message: `Unknown Work scope: ${scope}`,
        })
  })

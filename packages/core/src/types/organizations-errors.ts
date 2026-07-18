import * as z from 'zod'

import type { ApiResult } from './api'
import type { Error } from './errors'

export const organizationErrorCodeValues = [
  'organization/duplicate-slug',
  'organization/duplicate-workos-id',
  'organization/has-members',
  'organization/internal-error',
  'organization/not-found',
  'organization/validation-failed',
] as const

export const organizationErrorCodeSchema = z.enum(organizationErrorCodeValues)

export type OrganizationErrorCode = z.infer<typeof organizationErrorCodeSchema>

export const organizationServiceErrorSchema = z.strictObject({
  code: organizationErrorCodeSchema,
  message: z.string().trim().min(1),
  httpStatus: z.custom<Error<OrganizationErrorCode>['httpStatus']>(
    (value) => typeof value === 'number' && value >= 100 && value <= 599
  ),
  description: z.string().trim().min(1).optional(),
  param: z.string().trim().min(1).optional(),
}) satisfies z.ZodType<Error<OrganizationErrorCode>>

export type OrganizationServiceResult<TSuccess> = ApiResult<
  TSuccess,
  Error<OrganizationErrorCode>
>

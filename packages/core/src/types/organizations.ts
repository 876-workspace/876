import * as z from 'zod'

import type { ApiResult } from './api'
import type { AppError } from './errors'
import type { OrganizationErrorCode } from './organizations-errors'

const organizationIdSchema = z.string().trim().min(1)
const workosOrganizationIdSchema = z.string().trim().min(1)
const organizationNameSchema = z.string().trim().min(1).max(120)
const organizationSlugSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)
const organizationStatusSchema = z.enum(['active', 'suspended', 'archived'])
const organizationMetadataSchema = z.record(z.string(), z.unknown())
const organizationUnixTimestampSchema = z.int().nonnegative()
const organizationListLimitSchema = z.int().min(1).max(100)

export type Organization = {
  object: 'organization'
  id: string
  workosOrganizationId: string | null
  name: string
  slug: string
  status: string
  metadata: Record<string, unknown> | null
  createdAt: number
  updatedAt: number
}

export type DeletedOrganization = {
  object: 'organization'
  id: string
  deleted: true
}

export type OrganizationCreateParams = {
  workosOrganizationId?: string
  name: string
  slug: string
  status?: 'active' | 'suspended' | 'archived'
  metadata?: Record<string, unknown>
}

export type OrganizationUpdateParams = {
  organizationId: string
  workosOrganizationId?: string | null
  name?: string
  slug?: string
  status?: 'active' | 'suspended' | 'archived'
  metadata?: Record<string, unknown> | null
}

export type OrganizationDeleteParams = {
  organizationId: string
}

export type OrganizationListParams = {
  limit?: number
  startingAfter?: string
  endingBefore?: string
}

export const organizationSchema = z.strictObject({
  object: z.literal('organization'),
  id: organizationIdSchema,
  workosOrganizationId: workosOrganizationIdSchema.nullable(),
  name: organizationNameSchema,
  slug: organizationSlugSchema,
  status: organizationStatusSchema,
  metadata: organizationMetadataSchema.nullable(),
  createdAt: organizationUnixTimestampSchema,
  updatedAt: organizationUnixTimestampSchema,
}) satisfies z.ZodType<Organization>

export const deletedOrganizationSchema = z.strictObject({
  object: z.literal('organization'),
  id: organizationIdSchema,
  deleted: z.literal(true),
}) satisfies z.ZodType<DeletedOrganization>

export const organizationCreateParamsSchema = z.strictObject({
  workosOrganizationId: workosOrganizationIdSchema.optional(),
  name: organizationNameSchema,
  slug: organizationSlugSchema,
  status: organizationStatusSchema.optional(),
  metadata: organizationMetadataSchema.optional(),
}) satisfies z.ZodType<OrganizationCreateParams>

export const organizationUpdateParamsSchema = z.strictObject({
  organizationId: organizationIdSchema,
  workosOrganizationId: workosOrganizationIdSchema.nullable().optional(),
  name: organizationNameSchema.optional(),
  slug: organizationSlugSchema.optional(),
  status: organizationStatusSchema.optional(),
  metadata: organizationMetadataSchema.nullable().optional(),
}) satisfies z.ZodType<OrganizationUpdateParams>

export const organizationDeleteParamsSchema = z.strictObject({
  organizationId: organizationIdSchema,
}) satisfies z.ZodType<OrganizationDeleteParams>

export const organizationListParamsSchema = z.strictObject({
  limit: organizationListLimitSchema.optional(),
  startingAfter: organizationIdSchema.optional(),
  endingBefore: organizationIdSchema.optional(),
}) satisfies z.ZodType<OrganizationListParams>

export type OrganizationSdkResult<T> = ApiResult<
  T,
  AppError<OrganizationErrorCode>
>

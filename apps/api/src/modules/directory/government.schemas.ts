/**
 * Government directory contracts — ministries and their departments.
 *
 * Ported from `domains/directory/schemas/government.py`.
 */

import { z } from 'zod'

import {
  directoryAddressCreateSchema,
  directoryAddressSchema,
  directoryAddressUpdateSchema,
} from './directory.schemas'

export const ministrySchema = z
  .object({
    object: z.literal('ministry'),
    id: z.string(),
    name: z.string(),
    portfolio: z.string().nullable(),
    minister: z.string().nullable(),
    website: z.string().nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'Ministry', description: 'A government ministry.' })

export type Ministry = z.infer<typeof ministrySchema>

export const ministryCreateSchema = z.strictObject({
  name: z.string().min(1),
  portfolio: z.string().nullish(),
  minister: z.string().nullish(),
  website: z.string().nullish(),
})

export type MinistryCreate = z.infer<typeof ministryCreateSchema>

export const ministryUpdateSchema = z.strictObject({
  name: z.string().nullish(),
  portfolio: z.string().nullish(),
  minister: z.string().nullish(),
  website: z.string().nullish(),
})

export type MinistryUpdate = z.infer<typeof ministryUpdateSchema>

export const ministryDepartmentSchema = z
  .object({
    object: z.literal('ministry_department'),
    id: z.string(),
    ministry_id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    address_id: z.string(),
    contact_email: z.string().nullable(),
    contact_number: z.string().nullable(),
    address: directoryAddressSchema,
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({
    id: 'MinistryDepartment',
    description: 'A department within a government ministry.',
  })

export type MinistryDepartment = z.infer<typeof ministryDepartmentSchema>

export const ministryDepartmentCreateSchema = z.strictObject({
  name: z.string().min(1),
  description: z.string().nullish(),
  contact_email: z.string().nullish(),
  contact_number: z.string().nullish(),
  address: directoryAddressCreateSchema,
})

export type MinistryDepartmentCreate = z.infer<
  typeof ministryDepartmentCreateSchema
>

export const ministryDepartmentUpdateSchema = z.strictObject({
  name: z.string().nullish(),
  description: z.string().nullish(),
  contact_email: z.string().nullish(),
  contact_number: z.string().nullish(),
  address: directoryAddressUpdateSchema.nullish(),
})

export type MinistryDepartmentUpdate = z.infer<
  typeof ministryDepartmentUpdateSchema
>

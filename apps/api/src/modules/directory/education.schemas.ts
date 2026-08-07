/**
 * Education directory contracts — universities, their campuses, and secondary
 * schools.
 *
 * Ported from `domains/directory/schemas/education.py`.
 */

import { z } from 'zod'

import {
  directoryAddressCreateSchema,
  directoryAddressSchema,
  directoryAddressUpdateSchema,
} from './directory.schemas'

export const universitySchema = z
  .object({
    object: z.literal('university'),
    id: z.string(),
    name: z.string(),
    acronym: z.string().nullable(),
    logo_url: z.string().nullable(),
    website: z.string().nullable(),
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'University', description: 'A university.' })

export type University = z.infer<typeof universitySchema>

export const universityCreateSchema = z.strictObject({
  name: z.string().min(1),
  acronym: z.string().nullish(),
  logo_url: z.string().nullish(),
  website: z.string().nullish(),
})

export type UniversityCreate = z.infer<typeof universityCreateSchema>

export const universityUpdateSchema = z.strictObject({
  name: z.string().nullish(),
  acronym: z.string().nullish(),
  logo_url: z.string().nullish(),
  website: z.string().nullish(),
})

export type UniversityUpdate = z.infer<typeof universityUpdateSchema>

export const universityCampusSchema = z
  .object({
    object: z.literal('university_campus'),
    id: z.string(),
    university_id: z.string(),
    name: z.string(),
    is_main_campus: z.boolean(),
    address_id: z.string(),
    contact_number: z.string().nullable(),
    email: z.string().nullable(),
    address: directoryAddressSchema,
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({
    id: 'UniversityCampus',
    description: 'A campus belonging to a university.',
  })

export type UniversityCampus = z.infer<typeof universityCampusSchema>

export const universityCampusCreateSchema = z.strictObject({
  name: z.string().min(1),
  is_main_campus: z.boolean().default(false),
  contact_number: z.string().nullish(),
  email: z.string().nullish(),
  address: directoryAddressCreateSchema,
})

export type UniversityCampusCreate = z.infer<
  typeof universityCampusCreateSchema
>

export const universityCampusUpdateSchema = z.strictObject({
  name: z.string().nullish(),
  is_main_campus: z.boolean().nullish(),
  contact_number: z.string().nullish(),
  email: z.string().nullish(),
  address: directoryAddressUpdateSchema.nullish(),
})

export type UniversityCampusUpdate = z.infer<
  typeof universityCampusUpdateSchema
>

export const secondarySchoolSchema = z
  .object({
    object: z.literal('secondary_school'),
    id: z.string(),
    name: z.string(),
    principal: z.string().nullable(),
    school_type: z.string().nullable(),
    logo_url: z.string().nullable(),
    address_id: z.string(),
    contact_number: z.string().nullable(),
    email: z.string().nullable(),
    address: directoryAddressSchema,
    created_at: z.number().int(),
    updated_at: z.number().int(),
  })
  .meta({ id: 'SecondarySchool', description: 'A secondary school.' })

export type SecondarySchool = z.infer<typeof secondarySchoolSchema>

export const secondarySchoolCreateSchema = z.strictObject({
  name: z.string().min(1),
  principal: z.string().nullish(),
  school_type: z.string().nullish(),
  logo_url: z.string().nullish(),
  contact_number: z.string().nullish(),
  email: z.string().nullish(),
  address: directoryAddressCreateSchema,
})

export type SecondarySchoolCreate = z.infer<typeof secondarySchoolCreateSchema>

export const secondarySchoolUpdateSchema = z.strictObject({
  name: z.string().nullish(),
  principal: z.string().nullish(),
  school_type: z.string().nullish(),
  logo_url: z.string().nullish(),
  contact_number: z.string().nullish(),
  email: z.string().nullish(),
  address: directoryAddressUpdateSchema.nullish(),
})

export type SecondarySchoolUpdate = z.infer<typeof secondarySchoolUpdateSchema>

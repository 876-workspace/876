import { z } from 'zod'

import { crmRequestSchema, requestPrioritySchema } from './types'

export const requestFormStatusSchema = z.enum([
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
])

export const requestFormFieldMappingSchema = z.enum([
  'REQUEST_SUBJECT',
  'REQUEST_DESCRIPTION',
])

const baseFieldSchema = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string(),
  required: z.boolean(),
  hint: z.string().nullable().optional(),
  mapping: requestFormFieldMappingSchema.nullable().optional(),
})

const textFieldSchema = baseFieldSchema.extend({
  type: z.enum(['TEXT', 'LONG_TEXT', 'EMAIL', 'PHONE', 'DATE']),
  placeholder: z.string().nullable().optional(),
})

const numberFieldSchema = baseFieldSchema.extend({
  type: z.literal('NUMBER'),
  placeholder: z.string().nullable().optional(),
})

const optionSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
})

const selectFieldSchema = baseFieldSchema.extend({
  type: z.enum(['SELECT', 'MULTI_SELECT']),
  options: z.array(optionSchema),
})

const checkboxFieldSchema = baseFieldSchema.extend({
  type: z.literal('CHECKBOX'),
})

const instructionsFieldSchema = z.object({
  id: z.string(),
  key: z.string(),
  type: z.literal('INSTRUCTIONS'),
  label: z.string(),
  text: z.string(),
  required: z.literal(false),
})

export const requestFormFieldSchema = z.discriminatedUnion('type', [
  textFieldSchema,
  numberFieldSchema,
  selectFieldSchema,
  checkboxFieldSchema,
  instructionsFieldSchema,
])

export const requestFormDefinitionSchema = z.object({
  fields: z.array(requestFormFieldSchema),
})

export const requestFormSchema = z.object({
  object: z.literal('request_form'),
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  status: requestFormStatusSchema,
  definition: requestFormDefinitionSchema,
  publishedDefinition: requestFormDefinitionSchema.nullable(),
  version: z.number().int().nonnegative(),
  defaultCategoryId: z.string().nullable(),
  defaultSubcategoryId: z.string().nullable(),
  defaultTeamId: z.string().nullable(),
  defaultPriority: requestPrioritySchema.nullable(),
  confirmationTitle: z.string().nullable(),
  confirmationMessage: z.string().nullable(),
  createdBy: z.string(),
  publishedAt: z.number().int().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const requestFormListSchema = z.object({
  object: z.literal('list'),
  data: z.array(requestFormSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})

export const requestFormSubmissionSchema = z.object({
  object: z.literal('request_form_submission'),
  id: z.string(),
  formId: z.string(),
  formVersion: z.number().int().positive(),
  request: crmRequestSchema,
  createdAt: z.number().int(),
})

export const requestFormSubmissionRecordSchema = z.object({
  object: z.literal('request_form_submission_record'),
  id: z.string(),
  formId: z.string(),
  requestId: z.string(),
  formVersion: z.number().int().positive(),
  definitionSnapshot: z.unknown(),
  answers: z.unknown(),
  customerOrganizationId: z.string().nullable(),
  customerUserId: z.string().nullable(),
  requesterUserId: z.string().nullable(),
  requesterContactId: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.number().int(),
})

export const requestFormSubmissionListSchema = z.object({
  object: z.literal('list'),
  data: z.array(requestFormSubmissionRecordSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})

export type RequestFormStatus = z.infer<typeof requestFormStatusSchema>
export type RequestFormFieldMapping = z.infer<
  typeof requestFormFieldMappingSchema
>
export type RequestFormField = z.infer<typeof requestFormFieldSchema>
export type RequestFormDefinition = z.infer<typeof requestFormDefinitionSchema>
export type RequestForm = z.infer<typeof requestFormSchema>
export type RequestFormList = z.infer<typeof requestFormListSchema>
export type RequestFormSubmission = z.infer<
  typeof requestFormSubmissionSchema
>
export type RequestFormSubmissionRecord = z.infer<
  typeof requestFormSubmissionRecordSchema
>
export type RequestFormSubmissionList = z.infer<
  typeof requestFormSubmissionListSchema
>

export interface CreateRequestFormInput {
  name: string
  slug: string
  description?: string | null
  definition: RequestFormDefinition
  defaultCategoryId?: string | null
  defaultSubcategoryId?: string | null
  defaultTeamId?: string | null
  defaultPriority?: z.infer<typeof requestPrioritySchema> | null
  confirmationTitle?: string | null
  confirmationMessage?: string | null
  createdBy: string
}

export interface UpdateRequestFormInput
  extends Omit<CreateRequestFormInput, 'createdBy'> {
  status?: RequestFormStatus
  updatedBy: string
}

export interface SubmitRequestFormInput {
  answers: Record<string, unknown>
  customerOrganizationId?: string
  customerUserId?: string
  requesterUserId?: string | null
  requesterContactId?: string | null
  createdBy: string
}

export interface ListRequestFormsQuery {
  status?: RequestFormStatus
}

export interface ListFormCustomerRequestsQuery {
  customerOrganizationId?: string
  customerUserId?: string
}

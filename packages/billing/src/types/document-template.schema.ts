import {
  documentTemplateLayoutKeySchema,
  documentTemplateOverridesSchema,
  documentTemplateSettingsSchema,
  documentTemplateTypeSchema,
} from '@876/core/document-templates'
import { brandingSchema } from '@876/core/branding'
import { z } from 'zod'
import { deletedResourceSchema, listSchema } from './common.schema'
import type {
  DeletedDocumentTemplate,
  DocumentTemplate,
  DocumentTemplateList,
  ResolvedDocumentTemplate,
} from './document-template'

export const documentTemplateCreateBodySchema = z.strictObject({
  documentType: documentTemplateTypeSchema,
  name: z.string().trim().min(1).max(80),
  layout: documentTemplateLayoutKeySchema,
  settings: documentTemplateOverridesSchema.optional(),
  isDefault: z.boolean().optional(),
})
export const documentTemplateUpdateBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(80).optional(),
  layout: documentTemplateLayoutKeySchema.optional(),
  settings: documentTemplateOverridesSchema.optional(),
})
export const documentTemplateSchema = z.strictObject({
  object: z.literal('document-template'),
  id: z.string().min(1),
  documentType: documentTemplateTypeSchema,
  name: z.string(),
  layout: documentTemplateLayoutKeySchema,
  isDefault: z.boolean(),
  settings: documentTemplateOverridesSchema,
  resolvedSettings: documentTemplateSettingsSchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<DocumentTemplate>
export const documentTemplateListSchema = listSchema(
  documentTemplateSchema
) satisfies z.ZodType<DocumentTemplateList>
export const deletedDocumentTemplateSchema = deletedResourceSchema(
  'document-template'
) satisfies z.ZodType<DeletedDocumentTemplate>
export const resolvedDocumentTemplateSchema = z.strictObject({
  object: z.literal('resolved-document-template'),
  documentType: documentTemplateTypeSchema,
  templateId: z.string().nullable(),
  name: z.string().nullable(),
  layout: documentTemplateLayoutKeySchema,
  settings: documentTemplateSettingsSchema,
  branding: brandingSchema,
}) satisfies z.ZodType<ResolvedDocumentTemplate>

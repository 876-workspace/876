import { z } from 'zod'

import { IMPORT_SOURCES } from './import.types.js'

export const importSourceSchema = z.enum(IMPORT_SOURCES)

export const createImportJobBodySchema = z.strictObject({
  source: importSourceSchema,
  projectId: z.string().trim().min(1).nullable().optional(),
  filename: z.string().trim().max(255).nullable().optional(),
  content: z.string().min(1),
})

export type CreateImportJobBody = z.infer<typeof createImportJobBodySchema>

export const importJobParamsSchema = z.strictObject({
  id: z.string().trim().min(1),
})

export const listImportJobsQuerySchema = z.strictObject({
  status: z
    .enum(['preview', 'committing', 'committed', 'partial'])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export type ListImportJobsQuery = z.infer<typeof listImportJobsQuerySchema>

import { createWorkCalendarExportInputSchema } from '@876/work'
import { z } from 'zod'
export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})
export const createExportBodySchema = createWorkCalendarExportInputSchema

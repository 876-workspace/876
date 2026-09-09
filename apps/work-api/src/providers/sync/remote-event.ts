import { z } from 'zod'

export const remoteEventSchema = z
  .strictObject({
    remoteId: z.string(),
    etag: z.string().optional().nullable(),
    iCalUid: z.string().optional().nullable(),
    title: z.string(),
    description: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    status: z.enum(['CONFIRMED', 'TENTATIVE', 'CANCELLED']),
    busyStatus: z.enum(['BUSY', 'FREE']),
    allDay: z.boolean(),
    startAt: z.number().int().optional().nullable(),
    endAt: z.number().int().optional().nullable(),
    timeZone: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    updatedAt: z.number().int().optional().nullable(),
    deleted: z.boolean().optional(),
  })
  .superRefine((value, context) => {
    if (value.deleted) return

    if (value.allDay) {
      if (!value.startDate || !value.endDate)
        context.addIssue({
          code: 'custom',
          message: 'All-day provider events require startDate and endDate.',
        })
      return
    }

    if (value.startAt == null || value.endAt == null || !value.timeZone)
      context.addIssue({
        code: 'custom',
        message: 'Timed provider events require startAt, endAt, and timeZone.',
      })
  })

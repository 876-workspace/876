import { z } from 'zod'

const unixSchema = z.number().int().nonnegative()

export const workExternalSyncProviderSchema = z.enum([
  'GOOGLE',
  'MICROSOFT',
  'CALDAV',
])
export type WorkExternalSyncProvider = z.infer<
  typeof workExternalSyncProviderSchema
>

export const workSyncConnectionSetupInputSchema = z.discriminatedUnion(
  'provider',
  [
    z.strictObject({ provider: z.enum(['GOOGLE', 'MICROSOFT']) }),
    z.strictObject({
      provider: z.literal('CALDAV'),
      caldavUrl: z.url(),
      username: z.string().trim().min(1).max(320),
      password: z.string().min(1).max(4096),
    }),
  ]
)
export type WorkSyncConnectionSetupInput = z.infer<
  typeof workSyncConnectionSetupInputSchema
>

export const workSyncAuthorizationSchema = z.object({
  object: z.literal('sync_authorization'),
  connectionId: z.string(),
  provider: z.enum(['GOOGLE', 'MICROSOFT']),
  authorizeUrl: z.url(),
  expiresAt: unixSchema,
})
export type WorkSyncAuthorization = z.infer<typeof workSyncAuthorizationSchema>

export const workRemoteCalendarSchema = z.object({
  object: z.literal('remote_calendar'),
  remoteId: z.string().min(1),
  provider: workExternalSyncProviderSchema,
  name: z.string(),
  description: z.string().nullable(),
  timeZone: z.string().nullable(),
  color: z.string().nullable(),
  readOnly: z.boolean(),
})
export type WorkRemoteCalendar = z.infer<typeof workRemoteCalendarSchema>

export const workRemoteCalendarListSchema = z.object({
  object: z.literal('list'),
  data: z.array(workRemoteCalendarSchema),
  has_more: z.literal(false),
  total_count: z.number().int().nonnegative(),
  url: z.string(),
})

export const linkWorkRemoteCalendarInputSchema = z.strictObject({
  remoteCalendarId: z.string().min(1).max(4096),
  localCalendarId: z.string().min(1).optional(),
})
export type LinkWorkRemoteCalendarInput = z.infer<
  typeof linkWorkRemoteCalendarInputSchema
>

export const workSyncCalendarLinkSchema = z.object({
  object: z.literal('sync_calendar_link'),
  id: z.string(),
  connectionId: z.string(),
  provider: workExternalSyncProviderSchema,
  calendarId: z.string(),
  remoteCalendarId: z.string(),
  remoteCalendarName: z.string().nullable(),
  syncWindowStart: unixSchema.nullable(),
  syncWindowEnd: unixSchema.nullable(),
  lastSyncedAt: unixSchema.nullable(),
  lastErrorCode: z.string().nullable(),
  createdAt: unixSchema,
  updatedAt: unixSchema,
})
export type WorkSyncCalendarLink = z.infer<typeof workSyncCalendarLinkSchema>

export const workSyncCalendarLinkListSchema = z.object({
  object: z.literal('list'),
  data: z.array(workSyncCalendarLinkSchema),
  has_more: z.literal(false),
  total_count: z.number().int().nonnegative(),
  url: z.string(),
})

export const workSyncRunSchema = z.object({
  object: z.literal('sync_run'),
  connectionId: z.string(),
  calendarLinkId: z.string().nullable(),
  calendars: z.number().int().nonnegative(),
  pulled: z.number().int().nonnegative(),
  created: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  deleted: z.number().int().nonnegative(),
  pushed: z.number().int().nonnegative(),
  completedAt: unixSchema,
})
export type WorkSyncRun = z.infer<typeof workSyncRunSchema>

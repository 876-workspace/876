import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'

type LinkInput = {
  tenantId: string
  connectionId: string
  userId: string
  localCalendarId?: string
  remoteCalendarId: string
  name: string
  description: string | null
  timeZone: string
  syncDirection: 'BIDIRECTIONAL' | 'PULL_ONLY'
}

type LinkResult =
  | {
      kind: 'linked'
      mapping: Awaited<ReturnType<typeof retrieveRemoteMapping>>
    }
  | { kind: 'calendar-not-found' }
  | { kind: 'calendar-already-linked' }

const retrieveRemoteMapping = (connectionId: string, remoteId: string) =>
  prisma.workSyncMapping.findFirst({
    where: {
      connectionId,
      resourceType: 'CALENDAR',
      parentMappingId: null,
      remoteId,
    },
  })

const retrieveLocalMapping = (connectionId: string, localId: string) =>
  prisma.workSyncMapping.findFirst({
    where: {
      connectionId,
      resourceType: 'CALENDAR',
      parentMappingId: null,
      localId,
    },
  })

function isUniqueConstraint(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  )
}

async function recoverConcurrentLink(input: LinkInput): Promise<LinkResult | null> {
  const remote = await retrieveRemoteMapping(
    input.connectionId,
    input.remoteCalendarId
  )
  if (remote) return { kind: 'linked', mapping: remote }

  if (input.localCalendarId) {
    const local = await retrieveLocalMapping(
      input.connectionId,
      input.localCalendarId
    )
    if (local) return { kind: 'calendar-already-linked' }
  }
  return null
}

export async function link(input: LinkInput): Promise<LinkResult> {
  const existing = await retrieveRemoteMapping(
    input.connectionId,
    input.remoteCalendarId
  )
  if (existing) return { kind: 'linked', mapping: existing }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let calendarId = input.localCalendarId
      if (calendarId) {
        const calendar = await tx.workCalendar.findFirst({
          where: {
            id: calendarId,
            tenantId: input.tenantId,
            deletedAt: null,
          },
        })
        if (!calendar) return { kind: 'calendar-not-found' as const }

        const linked = await tx.workSyncMapping.findFirst({
          where: {
            connectionId: input.connectionId,
            resourceType: 'CALENDAR',
            parentMappingId: null,
            localId: calendarId,
          },
        })
        if (linked) return { kind: 'calendar-already-linked' as const }
      } else {
        const id = `calendar_${randomUUID().replaceAll('-', '')}`
        const isPrimary = !(await tx.workCalendar.findFirst({
          where: {
            tenantId: input.tenantId,
            ownerUserId: input.userId,
            isPrimary: true,
            deletedAt: null,
          },
        }))
        const calendar = await tx.workCalendar.create({
          data: {
            id,
            uid: `${id}@work.876`,
            tenantId: input.tenantId,
            ownerUserId: input.userId,
            name: input.name,
            description: input.description,
            timeZone: input.timeZone,
            visibility: 'PRIVATE',
            isPrimary,
            createdBy: input.userId,
          },
        })
        await tx.workCalendarSubscription.create({
          data: {
            id: `calsub_${randomUUID().replaceAll('-', '')}`,
            tenantId: input.tenantId,
            calendarId: calendar.id,
            userId: input.userId,
            role: 'OWNER',
            isVisible: true,
            defaultReminderMinutes: [],
          },
        })
        calendarId = calendar.id
      }

      const mapping = await tx.workSyncMapping.create({
        data: {
          id: `syncmap_${randomUUID().replaceAll('-', '')}`,
          connectionId: input.connectionId,
          parentMappingId: null,
          resourceType: 'CALENDAR',
          syncDirection: input.syncDirection,
          localId: calendarId,
          remoteId: input.remoteCalendarId,
          remoteEtag: null,
          iCalUid: null,
          contentHash: null,
          syncCursor: null,
          syncWindowStart: null,
          syncWindowEnd: null,
          lastSyncedAt: null,
          lastErrorCode: null,
        },
      })
      return { kind: 'linked' as const, mapping }
    })

    return result
  } catch (error) {
    if (!isUniqueConstraint(error)) throw error
    const recovered = await recoverConcurrentLink(input)
    if (recovered) return recovered
    throw error
  }
}

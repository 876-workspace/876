import { Prisma } from '@/db'
import { prisma } from '@/db/client'
import { generateId } from '@/platform/ids'

/**
 * Database operations for auth telemetry and device records.
 *
 * Only a repository file may import `@/db/client` per system boundary rules.
 * All Prisma-specific shapes, such as `Prisma.DbNull` for nullable JSON columns,
 * are encapsulated inside this adapter.
 */
export type AuthTelemetryRepository = {
  recordDeviceSeen(params: {
    userId: string
    fingerprint: string
    now: number
    confidence: string
    deviceType: string
    deviceBrand: string | null
    deviceModel: string | null
    osName: string | null
    osVersion: string | null
    browserName: string | null
    browserVersion: string | null
    isBot: boolean
    lastIp: string | null
    lastCountryCode: string | null
    signal: Record<string, unknown> | null
  }): Promise<{ id: string }>

  countRecentFailures(params: {
    identifier?: string | null
    ipAddress?: string | null
    since: number
  }): Promise<number>

  listDevicesByFingerprint(fingerprint: string): Promise<{ userId: string }[]>

  getLastAttemptForUser(userId: string): Promise<{
    ipCountryCode: string | null
    ipLatitude: string | null
    ipLongitude: string | null
    createdAt: bigint | number
  } | null>

  createAttempt(params: {
    event: string
    outcome: string
    failureCode?: string | null
    identifier?: string | null
    userId?: string | null
    appId?: string | null
    sessionId?: string | null
    realm?: string | null
    deviceId?: string | null
    deviceFingerprint?: string | null
    ipAddress?: string | null
    ipCountryCode?: string | null
    ipRegionCode?: string | null
    ipRegion?: string | null
    ipCity?: string | null
    ipPostalCode?: string | null
    ipTimezone?: string | null
    ipLatitude?: string | null
    ipLongitude?: string | null
    ipAsn?: string | null
    ipAsOrganization?: string | null
    userAgent?: string | null
    deviceType?: string | null
    deviceBrand?: string | null
    deviceModel?: string | null
    osName?: string | null
    osVersion?: string | null
    browserName?: string | null
    browserVersion?: string | null
    isBot: boolean
    contextTrusted: boolean
    riskScore: number | null
    riskReasons: string[] | null
    requestId?: string | null
    createdAt: number
  }): Promise<{ id: string }>
}

export function createAuthTelemetryRepository(): AuthTelemetryRepository {
  return {
    async recordDeviceSeen(params) {
      const existing = await prisma.userDevice.findUnique({
        where: {
          userId_fingerprint: {
            userId: params.userId,
            fingerprint: params.fingerprint,
          },
        },
        select: { id: true },
      })

      const nowBig = BigInt(params.now)
      const signalValue =
        params.signal !== null
          ? (params.signal as Prisma.InputJsonValue)
          : Prisma.DbNull

      if (!existing) {
        const id = generateId('device')
        return prisma.userDevice.create({
          data: {
            id,
            userId: params.userId,
            fingerprint: params.fingerprint,
            confidence: params.confidence,
            deviceType: params.deviceType,
            deviceBrand: params.deviceBrand,
            deviceModel: params.deviceModel,
            osName: params.osName,
            osVersion: params.osVersion,
            browserName: params.browserName,
            browserVersion: params.browserVersion,
            isBot: params.isBot,
            lastIp: params.lastIp,
            lastCountryCode: params.lastCountryCode,
            signal: signalValue,
            firstSeenAt: nowBig,
            lastSeenAt: nowBig,
            createdAt: nowBig,
            updatedAt: nowBig,
            signInCount: 1,
          },
          select: { id: true },
        })
      }

      return prisma.userDevice.update({
        where: { id: existing.id },
        data: {
          confidence: params.confidence,
          deviceType: params.deviceType,
          deviceBrand: params.deviceBrand,
          deviceModel: params.deviceModel,
          osName: params.osName,
          osVersion: params.osVersion,
          browserName: params.browserName,
          browserVersion: params.browserVersion,
          isBot: params.isBot,
          lastIp: params.lastIp,
          lastCountryCode: params.lastCountryCode,
          signal: signalValue,
          lastSeenAt: nowBig,
          updatedAt: nowBig,
          signInCount: { increment: 1 },
        },
        select: { id: true },
      })
    },

    async countRecentFailures(params) {
      const and: Prisma.AuthAttemptWhereInput[] = [
        { outcome: 'failed' },
        { createdAt: { gte: BigInt(params.since) } },
      ]

      if (params.identifier) {
        and.push({ identifier: params.identifier.toLowerCase() })
      }
      if (params.ipAddress) {
        and.push({ ipAddress: params.ipAddress })
      }

      return prisma.authAttempt.count({ where: { AND: and } })
    },

    async listDevicesByFingerprint(fingerprint) {
      return prisma.userDevice.findMany({
        where: { fingerprint },
        select: { userId: true },
      })
    },

    async getLastAttemptForUser(userId) {
      return prisma.authAttempt.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          ipCountryCode: true,
          ipLatitude: true,
          ipLongitude: true,
          createdAt: true,
        },
      })
    },

    async createAttempt(params) {
      const id = generateId('authAttempt')
      const riskReasonsValue =
        params.riskReasons && params.riskReasons.length > 0
          ? (params.riskReasons as Prisma.InputJsonValue)
          : Prisma.DbNull

      return prisma.authAttempt.create({
        data: {
          id,
          event: params.event,
          outcome: params.outcome,
          failureCode: params.failureCode ?? null,
          identifier: params.identifier
            ? params.identifier.toLowerCase()
            : null,
          userId: params.userId ?? null,
          appId: params.appId ?? null,
          sessionId: params.sessionId ?? null,
          realm: params.realm ?? null,
          deviceId: params.deviceId ?? null,
          deviceFingerprint: params.deviceFingerprint ?? null,
          ipAddress: params.ipAddress ?? null,
          ipCountryCode: params.ipCountryCode ?? null,
          ipRegionCode: params.ipRegionCode ?? null,
          ipRegion: params.ipRegion ?? null,
          ipCity: params.ipCity ?? null,
          ipPostalCode: params.ipPostalCode ?? null,
          ipTimezone: params.ipTimezone ?? null,
          ipLatitude: params.ipLatitude ?? null,
          ipLongitude: params.ipLongitude ?? null,
          ipAsn: params.ipAsn ?? null,
          ipAsOrganization: params.ipAsOrganization ?? null,
          userAgent: params.userAgent ?? null,
          deviceType: params.deviceType ?? null,
          deviceBrand: params.deviceBrand ?? null,
          deviceModel: params.deviceModel ?? null,
          osName: params.osName ?? null,
          osVersion: params.osVersion ?? null,
          browserName: params.browserName ?? null,
          browserVersion: params.browserVersion ?? null,
          isBot: params.isBot,
          contextTrusted: params.contextTrusted,
          riskScore: params.riskScore ?? null,
          riskReasons: riskReasonsValue,
          requestId: params.requestId ?? null,
          createdAt: BigInt(params.createdAt),
        },
        select: { id: true },
      })
    },
  }
}

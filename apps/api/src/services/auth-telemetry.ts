import crypto from 'node:crypto'

import type { Request } from 'express'

import { getSettings } from '@/config'
import { getApiKey } from '@/http/auth/principal'
import { getLogger } from '@/platform/logger'
import { assessRisk, distanceBetween } from '@/platform/risk'
import { fromDbUnixSeconds, nowUnixSeconds } from '@/platform/timestamps'
import { parseUserAgent, refineWithClientHints } from '@/platform/user-agent'
import { captureEvent } from '@/providers/posthog'

import { createAuthTelemetryRepository } from './auth-telemetry.repository'
import type { AuthTelemetryRepository } from './auth-telemetry.repository'

/**
 * Failure-isolated recording of authentication context and device snapshots.
 *
 * Failure bursts are counted over a short window so that repeated attempts
 * reflect an active brute-force or credential-stuffing run rather than normal
 * forgotten password attempts spread across a day.
 */
export const RISK_WINDOW_SECONDS = 15 * 60

const UNKNOWN_COUNTRIES = new Set(['XX', 'T1'])

const log = getLogger('auth-telemetry')

export interface AttemptContext {
  readonly ip: string | null
  readonly userAgent: string | null
  readonly countryCode: string | null
  readonly region: string | null
  readonly city: string | null
  readonly asn: string | null
  readonly asOrganization: string | null
}

export interface AuthAttemptRecord {
  readonly id: string | null
  readonly deviceId: string | null
  readonly context: AttemptContext | null
}

export interface DeviceSignal {
  readonly visitorId: string
  readonly confidence: string
  readonly hints?: Record<string, unknown> | null
  readonly components?: Record<string, string> | null
}

interface RequestGeo {
  countryCode: string | null
  regionCode: string | null
  region: string | null
  city: string | null
  postalCode: string | null
  timezone: string | null
  latitude: string | null
  longitude: string | null
  asn: string | null
  asOrganization: string | null
}

interface ResolvedContext {
  ip: string | null
  userAgent: string | null
  geo: RequestGeo
  deviceSignal: string | null
  origin: string | null
  requestId: string | null
  trusted: boolean
}

/**
 * A stable, salted digest of an IP address for PostHog analytics.
 *
 * Analytics obtains correlation capabilities without storing the raw IP.
 * The salt uses the configured identification pepper so the digest cannot be
 * reversed via precomputed rainbow tables over the IPv4 address space.
 */
function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null
  const salt = getSettings().crypto.identificationHashPepper || '876'
  return crypto
    .createHash('sha256')
    .update(`${salt}:${ip}`)
    .digest('hex')
    .slice(0, 16)
}

/**
 * Decodes the base64url encoded `x-876-device` header blob.
 *
 * Returns `null` if the header is absent, oversized, or malformed. Shared with
 * identification audit trails recording disclosed device context.
 */
export function decodeDeviceSignal(
  value: string | null | undefined
): DeviceSignal | null {
  if (!value || value.length > 8192) return null

  try {
    const padLength = (4 - (value.length % 4)) % 4
    const padded = value + '='.repeat(padLength)
    const normalized = padded.replace(/-/g, '+').replace(/_/g, '/')
    const jsonString = Buffer.from(normalized, 'base64').toString('utf-8')
    const raw = JSON.parse(jsonString)

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

    const visitorId = (raw as unknown as Record<string, unknown>).visitorId
    if (
      typeof visitorId !== 'string' ||
      visitorId.length === 0 ||
      visitorId.length > 128
    ) {
      return null
    }

    const confidence =
      typeof (raw as unknown as Record<string, unknown>).confidence === 'string'
        ? ((raw as unknown as Record<string, unknown>).confidence as string)
        : 'low'

    const hintsRaw = (raw as unknown as Record<string, unknown>).hints
    const hints =
      hintsRaw && typeof hintsRaw === 'object' && !Array.isArray(hintsRaw)
        ? (hintsRaw as unknown as Record<string, unknown>)
        : null

    const componentsRaw = (raw as unknown as Record<string, unknown>).components
    const components =
      componentsRaw &&
      typeof componentsRaw === 'object' &&
      !Array.isArray(componentsRaw)
        ? (componentsRaw as Record<string, string>)
        : null

    return { visitorId, confidence, hints, components }
  } catch {
    return null
  }
}

function getHeader(req: Request, name: string): string | null {
  const raw = req.header
    ? req.header(name)
    : (req.headers?.[name.toLowerCase()] as string | undefined)

  if (raw === undefined || raw === null) return null
  const sanitized = String(raw)
    .replace(/[\r\n]/g, '')
    .trim()
    .slice(0, 8192)
  return sanitized || null
}

function parseCountry(value: string | null): string | null {
  if (!value) return null
  const upper = value.toUpperCase()
  if (UNKNOWN_COUNTRIES.has(upper)) return null
  return upper
}

function fallbackIp(req: Request): string | null {
  const forwarded = getHeader(req, 'x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  if (typeof req.ip === 'string' && req.ip) return req.ip
  const socketIp = req.socket?.remoteAddress
  if (typeof socketIp === 'string' && socketIp) return socketIp
  const clientHost = (req as unknown as Record<string, unknown>).client as
    | { host?: string }
    | undefined
  if (typeof clientHost?.host === 'string' && clientHost.host) {
    return clientHost.host
  }
  return null
}

function resolveRequestContext(req: Request): ResolvedContext {
  const apiKeyRecord = getApiKey(req)
  const stateApiKey =
    (req as unknown as Record<string, unknown>).state &&
    typeof (req as unknown as Record<string, unknown>).state === 'object'
      ? ((
          (req as unknown as Record<string, unknown>)
            .state as unknown as Record<string, unknown>
        ).api_key ??
        (
          (req as unknown as Record<string, unknown>)
            .state as unknown as Record<string, unknown>
        ).apiKey)
      : undefined

  const reqApiKey = (req as unknown as Record<string, unknown>).apiKey
  const trusted = apiKeyRecord !== null || Boolean(stateApiKey || reqApiKey)

  if (trusted) {
    return {
      ip: getHeader(req, 'x-876-client-ip'),
      userAgent: getHeader(req, 'x-876-client-ua'),
      geo: {
        countryCode: parseCountry(getHeader(req, 'x-876-geo-country')),
        regionCode: getHeader(req, 'x-876-geo-region-code'),
        region: getHeader(req, 'x-876-geo-region'),
        city: getHeader(req, 'x-876-geo-city'),
        postalCode: getHeader(req, 'x-876-geo-postal'),
        timezone: getHeader(req, 'x-876-geo-timezone'),
        latitude: getHeader(req, 'x-876-geo-latitude'),
        longitude: getHeader(req, 'x-876-geo-longitude'),
        asn: getHeader(req, 'x-876-geo-asn'),
        asOrganization: getHeader(req, 'x-876-geo-as-org'),
      },
      deviceSignal: getHeader(req, 'x-876-device'),
      origin: getHeader(req, 'x-876-origin'),
      requestId: getHeader(req, 'x-request-id'),
      trusted: true,
    }
  }

  return {
    ip: getHeader(req, 'cf-connecting-ip') ?? fallbackIp(req),
    userAgent: getHeader(req, 'user-agent'),
    geo: {
      countryCode: null,
      regionCode: null,
      region: null,
      city: null,
      postalCode: null,
      timezone: null,
      latitude: null,
      longitude: null,
      asn: null,
      asOrganization: null,
    },
    deviceSignal: null,
    origin: getHeader(req, 'origin'),
    requestId: getHeader(req, 'x-request-id'),
    trusted: false,
  }
}

export class AuthTelemetryService {
  private readonly repository: AuthTelemetryRepository

  constructor(repository?: AuthTelemetryRepository) {
    this.repository = repository ?? createAuthTelemetryRepository()
  }

  async record(params: {
    request: Request
    event: string
    outcome: string
    identifier?: string | null
    userId?: string | null
    appId?: string | null
    sessionId?: string | null
    failureCode?: string | null
  }): Promise<AuthAttemptRecord> {
    try {
      const ctx = resolveRequestContext(params.request)
      const signal = decodeDeviceSignal(ctx.deviceSignal)
      const parsed = refineWithClientHints(
        parseUserAgent(ctx.userAgent),
        signal?.hints
      )
      const now = nowUnixSeconds()
      let deviceId: string | null = null

      if (params.userId && signal) {
        const signalData: Record<string, unknown> = {
          visitorId: signal.visitorId,
          confidence: signal.confidence,
          hints: signal.hints ?? null,
        }
        const device = await this.repository.recordDeviceSeen({
          userId: params.userId,
          fingerprint: signal.visitorId,
          now,
          confidence: signal.confidence,
          deviceType: parsed.deviceType,
          deviceBrand: parsed.deviceBrand,
          deviceModel: parsed.deviceModel,
          osName: parsed.osName,
          osVersion: parsed.osVersion,
          browserName: parsed.browserName,
          browserVersion: parsed.browserVersion,
          isBot: parsed.isBot,
          lastIp: ctx.ip,
          lastCountryCode: ctx.geo.countryCode,
          signal: signalData,
        })
        deviceId = device.id
      }

      const assessment = await this.assess({
        userId: params.userId ?? null,
        identifier: params.identifier ?? null,
        ctx,
        parsedIsBot: parsed.isBot,
        fingerprint: signal?.visitorId ?? null,
        now,
      })

      const attempt = await this.repository.createAttempt({
        event: params.event,
        outcome: params.outcome,
        failureCode: params.failureCode ?? null,
        identifier: params.identifier ? params.identifier.toLowerCase() : null,
        userId: params.userId ?? null,
        appId: params.appId ?? null,
        sessionId: params.sessionId ?? null,
        realm: getHeader(params.request, 'x-876-realm'),
        deviceId,
        deviceFingerprint: signal?.visitorId ?? null,
        ipAddress: ctx.ip,
        ipCountryCode: ctx.geo.countryCode,
        ipRegionCode: ctx.geo.regionCode,
        ipRegion: ctx.geo.region,
        ipCity: ctx.geo.city,
        ipPostalCode: ctx.geo.postalCode,
        ipTimezone: ctx.geo.timezone,
        ipLatitude: ctx.geo.latitude,
        ipLongitude: ctx.geo.longitude,
        ipAsn: ctx.geo.asn,
        ipAsOrganization: ctx.geo.asOrganization,
        userAgent: ctx.userAgent,
        deviceType: parsed.deviceType,
        deviceBrand: parsed.deviceBrand,
        deviceModel: parsed.deviceModel,
        osName: parsed.osName,
        osVersion: parsed.osVersion,
        browserName: parsed.browserName,
        browserVersion: parsed.browserVersion,
        isBot: parsed.isBot,
        contextTrusted: ctx.trusted,
        riskScore: assessment.score,
        riskReasons: assessment.reasons.length > 0 ? assessment.reasons : null,
        requestId: ctx.requestId,
        createdAt: now,
      })

      await this.emit({
        event: params.event,
        outcome: params.outcome,
        failureCode: params.failureCode ?? null,
        userId: params.userId ?? null,
        ctx,
        parsed,
        fingerprint: signal?.visitorId ?? null,
        assessment,
      })

      return {
        id: attempt.id,
        deviceId,
        context: {
          ip: ctx.ip,
          userAgent: ctx.userAgent,
          countryCode: ctx.geo.countryCode,
          region: ctx.geo.region,
          city: ctx.geo.city,
          asn: ctx.geo.asn,
          asOrganization: ctx.geo.asOrganization,
        },
      }
    } catch (err) {
      log.warn({ err }, 'auth.telemetry.failed')
      return { id: null, deviceId: null, context: null }
    }
  }

  private async assess(params: {
    userId: string | null
    identifier: string | null
    ctx: ResolvedContext
    parsedIsBot: boolean
    fingerprint: string | null
    now: number
  }) {
    const windowStart = params.now - RISK_WINDOW_SECONDS
    let recentIdentifierFailures = 0
    let recentIpFailures = 0

    try {
      if (params.identifier) {
        recentIdentifierFailures = await this.repository.countRecentFailures({
          identifier: params.identifier,
          since: windowStart,
        })
      }
      if (params.ctx.ip) {
        recentIpFailures = await this.repository.countRecentFailures({
          ipAddress: params.ctx.ip,
          since: windowStart,
        })
      }
    } catch (err) {
      log.warn({ err }, 'auth.risk.failure_counts_unavailable')
    }

    let distinctUsers = 1
    let isNewDevice = false

    if (params.fingerprint) {
      try {
        const devices = await this.repository.listDevicesByFingerprint(
          params.fingerprint
        )
        distinctUsers = new Set(devices.map((d) => d.userId)).size || 1
        isNewDevice =
          params.userId !== null &&
          !devices.some((d) => d.userId === params.userId)
      } catch (err) {
        log.warn({ err }, 'auth.risk.device_lookup_unavailable')
      }
    }

    let isNewCountry = false
    let kmFromLast: number | null = null
    let minutesSinceLast: number | null = null

    if (params.userId && params.ctx.geo.countryCode) {
      try {
        const last = await this.repository.getLastAttemptForUser(params.userId)
        if (last !== null) {
          isNewCountry =
            last.ipCountryCode !== null &&
            last.ipCountryCode !== params.ctx.geo.countryCode

          kmFromLast = distanceBetween(
            last.ipLatitude,
            last.ipLongitude,
            params.ctx.geo.latitude,
            params.ctx.geo.longitude
          )

          const lastCreatedAt =
            typeof last.createdAt === 'bigint'
              ? fromDbUnixSeconds(last.createdAt)
              : Number(last.createdAt)

          minutesSinceLast = Math.max(
            0,
            Math.floor((params.now - lastCreatedAt) / 60)
          )
        }
      } catch (err) {
        log.warn({ err }, 'auth.risk.history_unavailable')
      }
    }

    return assessRisk({
      isNewDevice,
      isNewCountryForUser: isNewCountry,
      isBot: params.parsedIsBot,
      contextTrusted: params.ctx.trusted,
      recentFailuresForIdentifier: recentIdentifierFailures,
      recentFailuresForIp: recentIpFailures,
      distinctUsersOnDevice: distinctUsers,
      minutesSinceLastAttemptElsewhere: minutesSinceLast,
      kmFromLastAttempt: kmFromLast,
    })
  }

  private async emit(params: {
    event: string
    outcome: string
    failureCode: string | null
    userId: string | null
    ctx: ResolvedContext
    parsed: ReturnType<typeof parseUserAgent>
    fingerprint: string | null
    assessment: ReturnType<typeof assessRisk>
  }): Promise<void> {
    try {
      const distinctId =
        params.userId ||
        (params.fingerprint ? `device:${params.fingerprint}` : null) ||
        (params.ctx.ip ? `anon:${hashIp(params.ctx.ip)}` : 'anon:unknown')

      await captureEvent(getSettings(), {
        distinctId,
        event: 'auth_attempt',
        properties: {
          event: params.event,
          outcome: params.outcome,
          failure_code: params.failureCode,
          realm: null,
          country_code: params.ctx.geo.countryCode,
          region: params.ctx.geo.region,
          city: params.ctx.geo.city,
          timezone: params.ctx.geo.timezone,
          asn_organization: params.ctx.geo.asOrganization,
          ip_hash: hashIp(params.ctx.ip),
          device_type: params.parsed.deviceType,
          device_brand: params.parsed.deviceBrand,
          device_model: params.parsed.deviceModel,
          os_name: params.parsed.osName,
          os_version: params.parsed.osVersion,
          browser_name: params.parsed.browserName,
          browser_version: params.parsed.browserVersion,
          is_bot: params.parsed.isBot,
          risk_score: params.assessment.score,
          risk_reasons: params.assessment.reasons,
          context_trusted: params.ctx.trusted,
          $geoip_disable: true,
        },
      })
    } catch (err) {
      log.warn({ err }, 'auth.analytics.failed')
    }
  }
}

export type { AuthTelemetryRepository } from './auth-telemetry.repository'

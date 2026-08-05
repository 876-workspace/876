/** Server-side request metadata propagated by first-party auth bridges. */
export type RequestGeo = {
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

export type RequestContext = {
  ip: string | null
  userAgent: string | null
  geo: RequestGeo
  origin: string | null
  requestId: string | null
  deviceSignal: string | null
}

export const REQUEST_CONTEXT_HEADERS = {
  ip: 'x-876-client-ip',
  countryCode: 'x-876-geo-country',
  regionCode: 'x-876-geo-region-code',
  region: 'x-876-geo-region',
  city: 'x-876-geo-city',
  postalCode: 'x-876-geo-postal',
  timezone: 'x-876-geo-timezone',
  latitude: 'x-876-geo-latitude',
  longitude: 'x-876-geo-longitude',
  asn: 'x-876-geo-asn',
  asOrganization: 'x-876-geo-as-org',
  userAgent: 'x-876-client-ua',
  deviceSignal: 'x-876-device',
} as const

const MAX_HEADER_LENGTH = 512
const MAX_DEVICE_SIGNAL_LENGTH = 8192
const UNKNOWN_COUNTRIES = new Set(['XX', 'T1'])

function header(
  request: Request,
  name: string,
  maxLength = MAX_HEADER_LENGTH
): string | null {
  const value = request.headers.get(name)
  if (!value) return null
  const sanitized = value
    .replace(/[\r\n]/g, '')
    .trim()
    .slice(0, maxLength)
  return sanitized || null
}

function geoHeader(request: Request, name: string): string | null {
  const value = header(request, name)
  return value && !UNKNOWN_COUNTRIES.has(value.toUpperCase()) ? value : null
}

/** Extracts a bounded, header-injection-safe context at a trusted app edge. */
export function extractRequestContext(request: Request): RequestContext {
  const forwardedFor = header(request, 'x-forwarded-for')
  const ip =
    header(request, 'cf-connecting-ip') ??
    header(request, 'true-client-ip') ??
    forwardedFor?.split(',')[0]?.trim().slice(0, MAX_HEADER_LENGTH) ??
    header(request, 'x-real-ip')

  return {
    ip: ip || null,
    userAgent: header(request, 'user-agent'),
    geo: {
      countryCode: geoHeader(request, 'cf-ipcountry')?.toUpperCase() ?? null,
      regionCode: geoHeader(request, 'cf-region-code'),
      region: geoHeader(request, 'cf-region'),
      city: geoHeader(request, 'cf-ipcity'),
      postalCode: geoHeader(request, 'cf-postal-code'),
      timezone: geoHeader(request, 'cf-timezone'),
      latitude: geoHeader(request, 'cf-iplatitude'),
      longitude: geoHeader(request, 'cf-iplongitude'),
      asn: geoHeader(request, 'cf-asn') ?? geoHeader(request, 'cf-ip-asn'),
      asOrganization: geoHeader(request, 'cf-as-organization'),
    },
    origin: header(request, 'origin'),
    requestId: header(request, 'x-request-id'),
    deviceSignal: header(request, 'x-876-device', MAX_DEVICE_SIGNAL_LENGTH),
  }
}

/** Serializes only non-null values to the canonical API trust-boundary headers. */
export function requestContextHeaders(
  ctx: RequestContext
): Record<string, string> {
  const values: Array<[string, string | null]> = [
    [REQUEST_CONTEXT_HEADERS.ip, ctx.ip],
    [REQUEST_CONTEXT_HEADERS.countryCode, ctx.geo.countryCode],
    [REQUEST_CONTEXT_HEADERS.regionCode, ctx.geo.regionCode],
    [REQUEST_CONTEXT_HEADERS.region, ctx.geo.region],
    [REQUEST_CONTEXT_HEADERS.city, ctx.geo.city],
    [REQUEST_CONTEXT_HEADERS.postalCode, ctx.geo.postalCode],
    [REQUEST_CONTEXT_HEADERS.timezone, ctx.geo.timezone],
    [REQUEST_CONTEXT_HEADERS.latitude, ctx.geo.latitude],
    [REQUEST_CONTEXT_HEADERS.longitude, ctx.geo.longitude],
    [REQUEST_CONTEXT_HEADERS.asn, ctx.geo.asn],
    [REQUEST_CONTEXT_HEADERS.asOrganization, ctx.geo.asOrganization],
    [REQUEST_CONTEXT_HEADERS.userAgent, ctx.userAgent],
    [REQUEST_CONTEXT_HEADERS.deviceSignal, ctx.deviceSignal],
  ]
  return Object.fromEntries(
    values.filter((entry): entry is [string, string] => entry[1] !== null)
  )
}

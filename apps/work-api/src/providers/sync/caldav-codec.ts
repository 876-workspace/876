import { WorkSyncProviderError, type WorkRemoteEvent } from './provider.js'
import { remoteEventSchema } from './remote-event.js'

function localTag(name: string) {
  return `(?:[A-Za-z_][\\w.-]*:)?${name}`
}

export function xmlBlocks(xml: string, name: string) {
  const tag = localTag(name)
  return [...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}\\s*>`, 'gi'))].map(
    (match) => match[1] ?? ''
  )
}

export function hasXmlTag(xml: string, name: string) {
  const tag = localTag(name)
  return new RegExp(`<${tag}(?:\\s[^>]*)?\\/?\\s*>`, 'i').test(xml)
}

function decodeXml(value: string) {
  return value
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/i, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, decimal: string) =>
      String.fromCodePoint(Number.parseInt(decimal, 10))
    )
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&')
}

export function xmlText(xml: string, name: string) {
  const block = xmlBlocks(xml, name)[0]
  if (block === undefined) return null
  return decodeXml(block.replace(/<[^>]+>/g, '')).trim()
}

export function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

type IcsProperty = {
  value: string
  params: Record<string, string>
}

function unfold(value: string) {
  return value.replace(/\r?\n[ \t]/g, '')
}

function icsProperties(value: string) {
  const properties = new Map<string, IcsProperty[]>()
  for (const line of unfold(value).split(/\r?\n/)) {
    const colon = line.indexOf(':')
    if (colon <= 0) continue
    const lhs = line.slice(0, colon).split(';')
    const name = (lhs.shift() ?? '').toUpperCase()
    const params: Record<string, string> = {}
    for (const raw of lhs) {
      const separator = raw.indexOf('=')
      if (separator <= 0) continue
      params[raw.slice(0, separator).toUpperCase()] = raw
        .slice(separator + 1)
        .replace(/^"|"$/g, '')
    }
    const list = properties.get(name) ?? []
    list.push({ value: line.slice(colon + 1), params })
    properties.set(name, list)
  }
  return properties
}

function text(value: string | undefined) {
  if (value === undefined) return null
  return value
    .replace(/\\[nN]/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

function dateOnly(value: string) {
  if (!/^\d{8}$/.test(value)) return null
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
}

function zonedEpoch(value: string, timeZone: string | undefined) {
  const match = value.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/
  )
  if (!match) return null
  const parts = match.slice(1, 7).map(Number)
  const utc = Date.UTC(
    parts[0]!,
    parts[1]! - 1,
    parts[2]!,
    parts[3]!,
    parts[4]!,
    parts[5]!
  )
  if (match[7] || !timeZone) return Math.floor(utc / 1000)

  try {
    let guess = utc
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const formatted = Object.fromEntries(
        formatter
          .formatToParts(new Date(guess))
          .filter((part) => part.type !== 'literal')
          .map((part) => [part.type, Number(part.value)])
      ) as Record<string, number>
      const represented = Date.UTC(
        formatted.year!,
        formatted.month! - 1,
        formatted.day!,
        formatted.hour!,
        formatted.minute!,
        formatted.second!
      )
      guess -= represented - utc
    }
    return Math.floor(guess / 1000)
  } catch (error) {
    return Math.floor(utc / 1000)
  }
}

function first(properties: Map<string, IcsProperty[]>, key: string) {
  return properties.get(key)?.[0]
}

export function parseCalendarEvent(input: {
  calendarData: string
  remoteId: string
  etag?: string | null
  deleted?: boolean
}): WorkRemoteEvent {
  const properties = icsProperties(input.calendarData)
  const uid = first(properties, 'UID')?.value
  if (!uid && !input.deleted)
    throw new WorkSyncProviderError(
      'provider-invalid-response',
      'CalDAV returned an event without a UID.'
    )

  const start = first(properties, 'DTSTART')
  const end = first(properties, 'DTEND')
  const allDay =
    start?.params.VALUE?.toUpperCase() === 'DATE' ||
    (start ? /^\d{8}$/.test(start.value) : false)
  const status = first(properties, 'STATUS')?.value.toUpperCase()
  const transparency = first(properties, 'TRANSP')?.value.toUpperCase()
  const modified = first(properties, 'LAST-MODIFIED') ?? first(properties, 'DTSTAMP')
  const event: WorkRemoteEvent = {
    remoteId: input.remoteId,
    etag: input.etag ?? null,
    iCalUid: uid ?? null,
    title: text(first(properties, 'SUMMARY')?.value) ?? '(Untitled)',
    description: text(first(properties, 'DESCRIPTION')?.value),
    location: text(first(properties, 'LOCATION')?.value),
    status:
      status === 'TENTATIVE'
        ? 'TENTATIVE'
        : status === 'CANCELLED'
          ? 'CANCELLED'
          : 'CONFIRMED',
    busyStatus: transparency === 'TRANSPARENT' ? 'FREE' : 'BUSY',
    allDay,
    updatedAt: modified
      ? zonedEpoch(modified.value, modified.params.TZID)
      : null,
    deleted: input.deleted ?? false,
  }

  if (event.deleted) return event
  if (!start || !end)
    throw new WorkSyncProviderError(
      'provider-invalid-response',
      'CalDAV returned an event without DTSTART and DTEND.'
    )

  if (allDay) {
    event.startDate = dateOnly(start.value)
    event.endDate = dateOnly(end.value)
  } else {
    event.startAt = zonedEpoch(start.value, start.params.TZID)
    event.endAt = zonedEpoch(end.value, end.params.TZID)
    event.timeZone = start.params.TZID ?? end.params.TZID ?? 'UTC'
  }

  return remoteEventSchema.parse(event)
}

function escapeIcs(value: string) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
}

function compactDate(value: string) {
  return value.replaceAll('-', '')
}

function utcDateTime(value: number) {
  return new Date(value * 1000)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
}

export function serializeCalendarEvent(event: WorkRemoteEvent) {
  const validated = remoteEventSchema.parse(event)
  const uid = validated.iCalUid || validated.remoteId
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//876 Work//Calendar Sync//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${escapeIcs(uid)}`,
    `DTSTAMP:${utcDateTime(Math.floor(Date.now() / 1000))}`,
    `SUMMARY:${escapeIcs(validated.title)}`,
  ]

  if (validated.description)
    lines.push(`DESCRIPTION:${escapeIcs(validated.description)}`)
  if (validated.location) lines.push(`LOCATION:${escapeIcs(validated.location)}`)
  lines.push(`STATUS:${validated.status}`)
  lines.push(
    `TRANSP:${validated.busyStatus === 'FREE' ? 'TRANSPARENT' : 'OPAQUE'}`
  )

  if (validated.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${compactDate(validated.startDate!)}`)
    lines.push(`DTEND;VALUE=DATE:${compactDate(validated.endDate!)}`)
  } else {
    lines.push(`DTSTART:${utcDateTime(validated.startAt!)}`)
    lines.push(`DTEND:${utcDateTime(validated.endAt!)}`)
  }

  lines.push('END:VEVENT', 'END:VCALENDAR', '')
  return lines.join('\r\n')
}

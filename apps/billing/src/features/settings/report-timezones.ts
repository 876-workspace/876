/** Curated reporting timezones sourced from `Intl.supportedValuesOf`. */

const CURATED_REPORT_TIMEZONES = [
  'Pacific/Honolulu',
  'America/Anchorage',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Toronto',
  'America/Jamaica',
  'America/Cayman',
  'America/Nassau',
  'America/Barbados',
  'America/Port_of_Spain',
  'America/Santo_Domingo',
  'America/Panama',
  'America/Bogota',
  'America/Lima',
  'America/Mexico_City',
  'America/Santiago',
  'America/Buenos_Aires',
  'America/Sao_Paulo',
  'Atlantic/Azores',
  'Europe/Lisbon',
  'Europe/London',
  'Europe/Dublin',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Zurich',
  'Europe/Stockholm',
  'Europe/Athens',
  'Europe/Istanbul',
  'Europe/Moscow',
  'Africa/Accra',
  'Africa/Lagos',
  'Africa/Cairo',
  'Africa/Nairobi',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Perth',
  'Australia/Sydney',
  'Pacific/Auckland',
  'UTC',
] as const

/**
 * Returns the curated reporting timezones present in this runtime, always
 * including the stored value so an existing preference never vanishes.
 */
export function curatedReportTimezones(
  supported: readonly string[],
  current: string
): string[] {
  const available = new Set(supported)
  const curated = CURATED_REPORT_TIMEZONES.filter((zone) =>
    available.has(zone)
  ).map(String)
  if (current && available.has(current) && !curated.includes(current)) {
    return [...curated, current].sort()
  }
  return curated
}

export function supportedReportTimezones(): string[] {
  if (typeof Intl.supportedValuesOf === 'function') {
    try {
      return [...Intl.supportedValuesOf('timeZone')]
    } catch {
      return ['America/Jamaica', 'UTC']
    }
  }
  return ['America/Jamaica', 'UTC']
}

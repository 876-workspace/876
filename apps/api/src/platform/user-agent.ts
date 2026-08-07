/**
 * User-agent parsing for auth telemetry.
 *
 * A small, stable interface over user-agent parsing plus the client-hint
 * refinement that answers the questions a user-agent string alone cannot:
 * *which* iPhone, *which* Android handset, and the real browser version now
 * that Chrome freezes the one it advertises.
 *
 * Client hints always win over the parsed user agent when both are present —
 * `Sec-CH-UA-Platform-Version` / `Sec-CH-UA-Model` are reported by the browser
 * itself, while the user-agent string is a legacy best guess.
 *
 * ## Deviation from the Python original
 *
 * `core/user_agent.py` delegates to the `ua-parser` package (the uap-core
 * regex corpus). There is no maintained JavaScript binding to that same
 * corpus — `ua-parser-js` is an unrelated project with its own naming, and its
 * v2 line is not MIT — so this module carries its own regex table instead.
 *
 * The table is written to reproduce **uap-core's output vocabulary**, not a
 * prettier one of its own: `Mac OS X` rather than `macOS`, `Mobile Safari`
 * rather than `Safari`, `Chrome Mobile` rather than `Chrome`, and versions
 * truncated to three components (`131.0.0`, not `131.0.0.0`). Those strings are
 * written to `auth_attempts` and `devices` and rendered in Console, so a
 * cosmetic rename here would split a column's history at the cutover.
 *
 * `__tests__/user-agent.test.ts` is a direct port of `tests/test_user_agent.py`
 * and is what holds the two implementations to the same values. Extend both
 * when adding a pattern.
 */

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'bot' | 'other'

export const DEVICE_TYPES: readonly DeviceType[] = [
  'desktop',
  'mobile',
  'tablet',
  'bot',
  'other',
]

/** A user agent reduced to the fields telemetry stores and Console renders. */
export interface ParsedUserAgent {
  readonly deviceType: DeviceType
  readonly deviceBrand: string | null
  readonly deviceModel: string | null
  readonly osName: string | null
  readonly osVersion: string | null
  readonly browserName: string | null
  readonly browserVersion: string | null
  readonly isBot: boolean
}

const BOT_TOKENS = [
  'bot',
  'spider',
  'crawler',
  'curl',
  'wget',
  'python-requests',
  'httpx',
  'postman',
] as const

const DESKTOP_TOKENS = [
  'windows',
  'macintosh',
  'mac os',
  'linux',
  'x11',
  'cros',
] as const

const DESKTOP_OS_FAMILIES = new Set([
  'Windows',
  'Mac OS X',
  'macOS',
  'Linux',
  'Ubuntu',
  'Fedora',
  'Chrome OS',
  'ChromeOS',
])

/**
 * Client hints pad the brand list with a deliberately meaningless entry to
 * break naive parsers ("Not_A Brand", "Not.A/Brand", ";Not A Brand"…).
 */
const HINT_FILLER = 'not'

const EMPTY: ParsedUserAgent = {
  deviceType: 'other',
  deviceBrand: null,
  deviceModel: null,
  osName: null,
  osVersion: null,
  browserName: null,
  browserVersion: null,
  isBot: false,
}

/**
 * Truncate a dotted version to the three components uap-core exposes
 * (`major.minor.patch`), stopping at the first empty one.
 *
 * Chrome advertises a fourth, always-zero component (`131.0.0.0`); keeping it
 * would make every stored version differ from the ones the Python service
 * wrote for the same browser.
 */
function version(raw: string | null | undefined): string | null {
  if (!raw) return null

  const collected: string[] = []
  for (const part of raw.split('.').slice(0, 3)) {
    if (!part) break
    collected.push(part)
  }

  return collected.join('.') || null
}

// ---------- browser ----------

/**
 * Ordered browser patterns. **Order is load-bearing**: every Chromium browser
 * also advertises `Chrome/`, and Chrome itself also advertises `Safari/`, so
 * the more specific engine must be tested first or everything reports as
 * Chrome.
 */
const BROWSER_PATTERNS: ReadonlyArray<{
  pattern: RegExp
  /** Fixed family name, or a resolver when the name depends on the platform. */
  family: string | ((ua: string) => string)
}> = [
  { pattern: /\bEdgiOS\/([\d.]+)/i, family: 'Edge Mobile' },
  { pattern: /\bEdgA\/([\d.]+)/i, family: 'Edge Mobile' },
  { pattern: /\bEdge?\/([\d.]+)/i, family: 'Edge' },
  { pattern: /\bOPR\/([\d.]+)/i, family: 'Opera' },
  { pattern: /\bOPiOS\/([\d.]+)/i, family: 'Opera Mini' },
  { pattern: /\bSamsungBrowser\/([\d.]+)/i, family: 'Samsung Internet' },
  { pattern: /\bMicroMessenger\/([\d.]+)/i, family: 'WeChat' },
  { pattern: /\bInstagram[\s/]([\d.]+)/i, family: 'Instagram' },
  { pattern: /\bCriOS\/([\d.]+)/i, family: 'Chrome Mobile iOS' },
  { pattern: /\bFxiOS\/([\d.]+)/i, family: 'Firefox iOS' },
  {
    pattern: /\bChrom(?:e|ium)\/([\d.]+)/i,
    // uap-core names the Android build "Chrome Mobile"; the token that
    // distinguishes it is "Mobile", which Chrome emits only on a handset.
    family: (ua) => (/\bMobile\b/.test(ua) ? 'Chrome Mobile' : 'Chrome'),
  },
  {
    pattern: /\bFirefox\/([\d.]+)/i,
    family: (ua) =>
      /\bMobile\b|\bAndroid\b/i.test(ua) ? 'Firefox Mobile' : 'Firefox',
  },
  {
    // Safari reports its real version in `Version/`, not in the trailing
    // `Safari/` build number.
    pattern: /\bVersion\/([\d.]+).*\bSafari\//i,
    family: (ua) =>
      /\bMobile\/|\bMobile\b/.test(ua) ? 'Mobile Safari' : 'Safari',
  },
]

/**
 * Automated agents, matched **before** the browser table.
 *
 * A crawler routinely appends a full Chrome user agent to its own token
 * (`…compatible; Googlebot/2.1;…) Chrome/125.0.0.0 Safari/537.36`), so testing
 * the browser patterns first would file every such hit as Chrome.
 *
 * `spider` marks the crawler-shaped agents, which uap-core additionally gives
 * the `Spider`/`Desktop` device identity; a command-line tool gets no device.
 */
const AGENT_PATTERNS: ReadonlyArray<{
  pattern: RegExp
  family: string | null
  spider: boolean
}> = [
  // uap-core publishes only major.minor for this one.
  {
    pattern: /\bpython-requests\/(\d+\.\d+)/i,
    family: 'Python Requests',
    spider: false,
  },
  { pattern: /\bcurl\/([\d.]+)/i, family: 'curl', spider: false },
  { pattern: /\bWget\/([\d.]+)/i, family: 'Wget', spider: false },
  {
    pattern: /\bPostmanRuntime\/([\d.]+)/i,
    family: 'PostmanRuntime',
    spider: false,
  },
  // Googlebot, bingbot, YandexBot, AhrefsBot, Baiduspider, …
  {
    pattern: /\b([A-Za-z][\w.-]*?(?:bot|spider|crawler))\/([\d.]+)/i,
    family: null,
    spider: true,
  },
]

interface ParsedBrowser {
  family: string | null
  version: string | null
  spider: boolean
}

function parseAgent(ua: string): ParsedBrowser | null {
  for (const entry of AGENT_PATTERNS) {
    const match = entry.pattern.exec(ua)
    if (!match) continue

    // A `null` family means the pattern captures the name itself in group 1
    // and the version in group 2.
    return entry.family === null
      ? {
          family: match[1] ?? null,
          version: version(match[2]),
          spider: entry.spider,
        }
      : {
          family: entry.family,
          version: version(match[1]),
          spider: entry.spider,
        }
  }

  return null
}

function parseBrowser(ua: string): ParsedBrowser {
  const agent = parseAgent(ua)
  if (agent) return agent

  // The Facebook in-app browser advertises an unstable, undocumented version;
  // uap-core reports the family with no version rather than guess.
  if (/\bFBAN\/|\bFBAV\/|\bFB_IAB\//i.test(ua)) {
    return { family: 'Facebook', version: null, spider: false }
  }

  for (const entry of BROWSER_PATTERNS) {
    const match = entry.pattern.exec(ua)
    if (!match) continue

    return {
      family:
        typeof entry.family === 'string' ? entry.family : entry.family(ua),
      version: version(match[1]),
      spider: false,
    }
  }

  return { family: null, version: null, spider: false }
}

// ---------- operating system ----------

/**
 * `Windows NT` kernel versions to the marketing versions uap-core reports.
 * An unmapped kernel version yields no version rather than a raw `NT 6.4`.
 */
const WINDOWS_NT_VERSIONS = new Map([
  ['10.0', '10'],
  ['6.3', '8.1'],
  ['6.2', '8'],
  ['6.1', '7'],
  ['6.0', 'Vista'],
  ['5.2', 'XP'],
  ['5.1', 'XP'],
])

interface ParsedOs {
  family: string | null
  version: string | null
}

function parseOs(ua: string): ParsedOs {
  // iOS first: an iPhone UA also contains "like Mac OS X".
  if (/\b(?:iPhone|iPad|iPod)\b/i.test(ua)) {
    const match = /\bOS ([\d_]+)/i.exec(ua)
    return { family: 'iOS', version: version(match?.[1]?.replace(/_/g, '.')) }
  }

  if (/\bAndroid\b/i.test(ua)) {
    const match = /\bAndroid[\s/]([\d.]+)/i.exec(ua)
    return { family: 'Android', version: version(match?.[1]) }
  }

  if (/\bCrOS\b/.test(ua)) {
    const match = /\bCrOS \S+ ([\d.]+)/.exec(ua)
    return { family: 'Chrome OS', version: version(match?.[1]) }
  }

  if (/\bWindows NT\b/i.test(ua)) {
    const match = /\bWindows NT ([\d.]+)/i.exec(ua)
    return {
      family: 'Windows',
      version: WINDOWS_NT_VERSIONS.get(match?.[1] ?? '') ?? null,
    }
  }

  if (/\bWindows\b/i.test(ua)) return { family: 'Windows', version: null }

  if (/\bMac OS X\b/i.test(ua)) {
    const match = /\bMac OS X ([\d_.]+)/i.exec(ua)
    return {
      family: 'Mac OS X',
      version: version(match?.[1]?.replace(/_/g, '.')),
    }
  }

  if (/\bMacintosh\b/i.test(ua)) return { family: 'Mac OS X', version: null }
  if (/\bUbuntu\b/i.test(ua)) return { family: 'Ubuntu', version: null }
  if (/\bLinux\b/i.test(ua)) return { family: 'Linux', version: null }

  return { family: null, version: null }
}

// ---------- device ----------

/**
 * Android model prefixes to the brand uap-core derives from them. Only brands
 * that actually appear in 876 traffic are listed; an unrecognised model keeps a
 * `null` brand rather than a guess, exactly as uap-core's `Other` does.
 */
const ANDROID_BRANDS: ReadonlyArray<[RegExp, string]> = [
  [/^(?:SM|GT|SCH|SPH|SGH|SHV|SHW)-|^Galaxy/i, 'Samsung'],
  [/^Pixel\b/i, 'Google'],
  [/^(?:Redmi|POCO|Xiaomi|MI )/i, 'Xiaomi'],
  [/^(?:ONEPLUS|IN\d{4}|KB\d{4})/i, 'OnePlus'],
  [/^(?:moto|XT\d)/i, 'Motorola'],
  [/^(?:LM|LG)-/i, 'LG'],
  [/^(?:HUAWEI|HONOR)/i, 'Huawei'],
  [/^CPH\d/i, 'OPPO'],
  [/^(?:vivo|V\d{4})/i, 'vivo'],
  [/^Infinix/i, 'Infinix'],
  [/^TECNO/i, 'TECNO'],
  [/^Nokia/i, 'Nokia'],
]

interface ParsedDevice {
  brand: string | null
  model: string | null
  family: string | null
}

function parseDevice(ua: string, isSpider: boolean): ParsedDevice {
  // uap-core gives every crawler the same synthetic device identity.
  if (isSpider) return { brand: 'Spider', model: 'Desktop', family: 'Spider' }

  if (/\biPhone\b/i.test(ua))
    return { brand: 'Apple', model: 'iPhone', family: 'iPhone' }
  if (/\biPad\b/i.test(ua))
    return { brand: 'Apple', model: 'iPad', family: 'iPad' }
  if (/\biPod\b/i.test(ua))
    return { brand: 'Apple', model: 'iPod', family: 'iPod' }
  if (/\bMacintosh\b/i.test(ua))
    return { brand: 'Apple', model: 'Mac', family: 'Mac' }

  // "(Linux; Android 15; SM-S928B)" and "(Linux; Android 12; Pixel 6 Build/…)".
  // The model is the segment after the Android version, minus any Build tag.
  const android =
    /\bAndroid[\s/][\d.]+;\s*([^;)]+?)(?:\s+Build\/[^;)]*)?[;)]/i.exec(ua)
  const raw = android?.[1]?.trim()
  if (!raw) return { brand: null, model: null, family: null }

  // Samsung repeats the vendor in front of the model ("SAMSUNG SM-S918B");
  // the stored model is the model alone.
  const model = raw.replace(
    /^SAMSUNG\s+(?=(?:SM|GT|SCH|SPH|SGH|SHV|SHW)-)/i,
    ''
  )

  // A UA with no "Mobile" token is a tablet, and uap-core's generic tablet rule
  // outranks its per-vendor rules — an Android tablet reports
  // `Generic_Android_Tablet` even when the model is plainly a Samsung one.
  const brand = /\bMobile\b/.test(ua)
    ? (ANDROID_BRANDS.find(([pattern]) => pattern.test(model))?.[1] ??
      'Generic_Android')
    : 'Generic_Android_Tablet'

  return { brand, model, family: model }
}

// ---------- device type ----------

function resolveDeviceType({
  lowered,
  osName,
  isBot,
}: {
  lowered: string
  osName: string | null
  isBot: boolean
}): DeviceType {
  if (isBot) return 'bot'

  if (lowered.includes('ipad') || lowered.includes('tablet')) return 'tablet'

  // Android reports "Mobile" only on handsets; an Android UA without it is a tablet.
  if (lowered.includes('android') && !lowered.includes('mobile'))
    return 'tablet'

  if (
    lowered.includes('mobile') ||
    lowered.includes('iphone') ||
    lowered.includes('ipod') ||
    lowered.includes('android')
  ) {
    return 'mobile'
  }

  if (
    (osName !== null && DESKTOP_OS_FAMILIES.has(osName)) ||
    DESKTOP_TOKENS.some((token) => lowered.includes(token))
  ) {
    return 'desktop'
  }

  return 'other'
}

/**
 * Parse a raw user-agent string into the telemetry device fields.
 *
 * Never throws: an unparseable or missing user agent degrades to `other`
 * rather than failing the authentication request that carried it.
 */
export function parseUserAgent(
  userAgent: string | null | undefined
): ParsedUserAgent {
  if (!userAgent) return EMPTY

  const lowered = userAgent.toLowerCase()
  const isBot = BOT_TOKENS.some((token) => lowered.includes(token))

  try {
    const browser = parseBrowser(userAgent)
    const os = parseOs(userAgent)
    const device = parseDevice(userAgent, browser.spider)

    return {
      deviceType: resolveDeviceType({ lowered, osName: os.family, isBot }),
      deviceBrand: device.brand,
      // A model is only published by handsets that carry one (Android); fall
      // back to the device family ("iPhone") so the column is never blank.
      deviceModel: device.model ?? device.family,
      osName: os.family,
      osVersion: os.version,
      browserName: browser.family,
      browserVersion: browser.version,
      isBot,
    }
  } catch {
    return { ...EMPTY, deviceType: isBot ? 'bot' : 'other', isBot }
  }
}

// ---------- client hints ----------

/** High-entropy client hints from `navigator.userAgentData.getHighEntropyValues()`. */
export interface ClientHints {
  /** `Sec-CH-UA-Platform-Version` */
  readonly platformVersion?: unknown
  /** `Sec-CH-UA-Model` */
  readonly model?: unknown
  /** `Sec-CH-UA-Full-Version-List` */
  readonly fullVersionList?: unknown
  /** `Sec-CH-UA-Platform` */
  readonly platform?: unknown
  /** `Sec-CH-UA-Mobile` */
  readonly mobile?: unknown
  readonly [key: string]: unknown
}

/**
 * Select the real browser version from a `fullVersionList` brand list.
 *
 * The list is deliberately salted with a filler brand and ordered
 * unpredictably, so match on the parsed browser name first and fall back to
 * the last entry that is not filler — never simply `versions[0]`.
 */
function pickHintVersion(
  versions: unknown,
  browserName: string | null
): string | null {
  if (!Array.isArray(versions)) return null

  const real: Array<{ brand: string; version: string }> = []
  for (const entry of versions) {
    if (entry === null || typeof entry !== 'object') continue

    const { brand, version: entryVersion } = entry as Record<string, unknown>
    if (
      typeof brand !== 'string' ||
      typeof entryVersion !== 'string' ||
      !entryVersion
    )
      continue
    if (brand.toLowerCase().includes(HINT_FILLER)) continue

    real.push({ brand, version: entryVersion })
  }

  if (real.length === 0) return null

  if (browserName) {
    const needle = browserName
      .toLowerCase()
      .replace(/ mobile$/, '')
      .trim()
    if (needle) {
      const matched = real.find(({ brand }) =>
        brand.toLowerCase().includes(needle)
      )
      if (matched) return matched.version
    }
  }

  return real[real.length - 1]!.version
}

/** Trimmed string, or null when the value is absent, blank, or not a string. */
function hintText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/**
 * Overlay high-entropy client hints onto a parsed user agent.
 *
 * Hints are authoritative where present: they carry the true OS version and,
 * on Android, the true handset model.
 */
export function refineWithClientHints(
  parsed: ParsedUserAgent,
  hints: ClientHints | null | undefined
): ParsedUserAgent {
  if (!hints) return parsed

  const picked = pickHintVersion(hints.fullVersionList, parsed.browserName)

  // A `mobile` hint reclassifies only an inconclusive guess. It must never
  // overturn `bot` or `tablet` — a crawler that sets the hint would otherwise
  // launder itself into a real device.
  let deviceType = parsed.deviceType
  if (
    typeof hints.mobile === 'boolean' &&
    (deviceType === 'other' ||
      deviceType === 'desktop' ||
      deviceType === 'mobile')
  ) {
    deviceType = hints.mobile ? 'mobile' : 'desktop'
  }

  return {
    ...parsed,
    deviceType,
    deviceModel: hintText(hints.model) ?? parsed.deviceModel,
    osName: parsed.osName ?? hintText(hints.platform),
    osVersion: hintText(hints.platformVersion) ?? parsed.osVersion,
    browserVersion: picked ?? parsed.browserVersion,
  }
}

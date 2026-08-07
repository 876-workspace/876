/**
 * Ported from `tests/test_user_agent.py`. Every expected value here is what the
 * Python service (via `ua-parser`) writes today, so a divergence in this suite
 * is a divergence in stored telemetry — see the deviation note in
 * `../user-agent.ts`.
 */

import { describe, expect, it } from 'vitest'

import {
  parseUserAgent,
  refineWithClientHints,
  type ParsedUserAgent,
} from '../user-agent'

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 ' +
  '(KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1'
const IPAD_SAFARI =
  'Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 ' +
  '(KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1'
const SAMSUNG_CHROME =
  'Mozilla/5.0 (Linux; Android 15; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/131.0.0.0 Mobile Safari/537.36'
const PIXEL_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/130.0.0.0 Mobile Safari/537.36'
const ANDROID_TABLET =
  'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/129.0.0.0 Safari/537.36'
const WINDOWS_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/131.0.0.0 Safari/537.36'
const WINDOWS_EDGE =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0'
const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 ' +
  '(KHTML, like Gecko) Version/18.1 Safari/605.1.15'
const LINUX_FIREFOX =
  'Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0'
const GOOGLEBOT =
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
const GOOGLEBOT_CHROME =
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; ' +
  '+http://www.google.com/bot.html) Chrome/125.0.0.0 Safari/537.36'
const CURL = 'curl/8.5.0'
const ANDROID_K =
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/130.0.0.0 Mobile Safari/537.36'
const CROS =
  'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/125.0.0.0 Safari/537.36'
const SAMSUNG_INTERNET =
  'Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36'

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

describe('parseUserAgent', () => {
  it('returns an empty parse for a missing user agent', () => {
    expect(parseUserAgent(null)).toEqual(EMPTY)
    expect(parseUserAgent(undefined)).toEqual(EMPTY)
    expect(parseUserAgent('')).toEqual(EMPTY)
  })

  it('parses iPhone Safari as a mobile Apple device', () => {
    expect(parseUserAgent(IPHONE_SAFARI)).toEqual({
      deviceType: 'mobile',
      deviceBrand: 'Apple',
      deviceModel: 'iPhone',
      osName: 'iOS',
      osVersion: '18.2',
      browserName: 'Mobile Safari',
      browserVersion: '18.2',
      isBot: false,
    })
  })

  it('parses an iPad as a tablet', () => {
    const parsed = parseUserAgent(IPAD_SAFARI)

    expect(parsed.deviceType).toBe('tablet')
    expect(parsed.deviceBrand).toBe('Apple')
    expect(parsed.osName).toBe('iOS')
    expect(parsed.osVersion).toBe('17.6')
  })

  it('parses the Samsung handset model, brand, and mobile Chrome build', () => {
    expect(parseUserAgent(SAMSUNG_CHROME)).toEqual({
      deviceType: 'mobile',
      deviceBrand: 'Samsung',
      deviceModel: 'SM-S928B',
      osName: 'Android',
      osVersion: '15',
      browserName: 'Chrome Mobile',
      browserVersion: '131.0.0',
      isBot: false,
    })
  })

  it('parses the Pixel handset model and brand', () => {
    const parsed = parseUserAgent(PIXEL_CHROME)

    expect(parsed.deviceBrand).toBe('Google')
    expect(parsed.deviceModel).toBe('Pixel 8 Pro')
    expect(parsed.osVersion).toBe('14')
  })

  it('treats an Android user agent without the Mobile token as a tablet', () => {
    const parsed = parseUserAgent(ANDROID_TABLET)

    expect(parsed.deviceType).toBe('tablet')
    expect(parsed.osName).toBe('Android')
    expect(parsed.deviceModel).toBe('SM-X710')
    // The generic tablet rule outranks the per-vendor rules, so a plainly
    // Samsung model still reports the generic brand.
    expect(parsed.deviceBrand).toBe('Generic_Android_Tablet')
    expect(parsed.browserName).toBe('Chrome')
  })

  it('falls back to a generic brand for an unrecognised Android handset', () => {
    const parsed = parseUserAgent(ANDROID_K)

    expect(parsed.deviceBrand).toBe('Generic_Android')
    expect(parsed.deviceModel).toBe('K')
    expect(parsed.browserName).toBe('Chrome Mobile')
  })

  it('strips the repeated vendor prefix from a Samsung model', () => {
    const parsed = parseUserAgent(SAMSUNG_INTERNET)

    expect(parsed.deviceBrand).toBe('Samsung')
    expect(parsed.deviceModel).toBe('SM-S918B')
    // Samsung Internet also advertises Chrome; the specific engine must win.
    expect(parsed.browserName).toBe('Samsung Internet')
    expect(parsed.browserVersion).toBe('23.0')
  })

  it('parses Chrome OS as a desktop', () => {
    const parsed = parseUserAgent(CROS)

    expect(parsed.deviceType).toBe('desktop')
    expect(parsed.osName).toBe('Chrome OS')
    expect(parsed.osVersion).toBe('14541.0.0')
  })

  it('parses Windows Chrome as a desktop', () => {
    expect(parseUserAgent(WINDOWS_CHROME)).toEqual({
      deviceType: 'desktop',
      deviceBrand: null,
      deviceModel: null,
      osName: 'Windows',
      osVersion: '10',
      browserName: 'Chrome',
      browserVersion: '131.0.0',
      isBot: false,
    })
  })

  it('distinguishes Edge from the Chrome build it also advertises', () => {
    expect(parseUserAgent(WINDOWS_EDGE).browserName).toBe('Edge')
    expect(parseUserAgent(WINDOWS_EDGE).browserVersion).toBe('131.0.0')
  })

  it('parses Mac Safari as a desktop', () => {
    const parsed = parseUserAgent(MAC_SAFARI)

    expect(parsed.deviceType).toBe('desktop')
    expect(parsed.osName).toBe('Mac OS X')
    expect(parsed.osVersion).toBe('10.15.7')
    expect(parsed.browserName).toBe('Safari')
  })

  it('parses Linux Firefox as a desktop', () => {
    const parsed = parseUserAgent(LINUX_FIREFOX)

    expect(parsed.deviceType).toBe('desktop')
    expect(parsed.browserName).toBe('Firefox')
    expect(parsed.browserVersion).toBe('133.0')
  })

  it.each([
    ['Googlebot', GOOGLEBOT],
    ['curl', CURL],
    ['python-requests', 'python-requests/2.31.0'],
    ['Wget', 'Wget/1.21.4'],
    ['PostmanRuntime', 'PostmanRuntime/7.36.0'],
    ['httpx', 'python-httpx/0.27.0'],
    [
      'bingbot',
      'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    ],
  ])('flags %s as a bot', (_label, userAgent) => {
    const parsed = parseUserAgent(userAgent)

    expect(parsed.isBot).toBe(true)
    expect(parsed.deviceType).toBe('bot')
  })

  it.each([
    ['Googlebot', GOOGLEBOT, 'Googlebot', '2.1', 'Spider'],
    ['curl', CURL, 'curl', '8.5.0', null],
    [
      'python-requests',
      'python-requests/2.31.0',
      'Python Requests',
      '2.31',
      null,
    ],
    ['Wget', 'Wget/1.21.4', 'Wget', '1.21.4', null],
  ])(
    'names the %s agent and its version',
    (_label, userAgent, name, agentVersion, brand) => {
      const parsed = parseUserAgent(userAgent)

      expect(parsed.browserName).toBe(name)
      expect(parsed.browserVersion).toBe(agentVersion)
      expect(parsed.deviceBrand).toBe(brand)
    }
  )

  it('identifies a crawler that appends a full Chrome user agent', () => {
    // The bot token must outrank the browser table, or every such hit files
    // itself as an ordinary Chrome desktop session.
    expect(parseUserAgent(GOOGLEBOT_CHROME)).toEqual({
      deviceType: 'bot',
      deviceBrand: 'Spider',
      deviceModel: 'Desktop',
      osName: null,
      osVersion: null,
      browserName: 'Googlebot',
      browserVersion: '2.1',
      isBot: true,
    })
  })

  it('never throws on garbage input', () => {
    expect(['other', 'desktop', 'mobile', 'tablet', 'bot']).toContain(
      parseUserAgent('  not a user agent \udfff').deviceType
    )
  })
})

describe('refineWithClientHints', () => {
  it('returns the parse unchanged without hints', () => {
    const parsed = parseUserAgent(IPHONE_SAFARI)

    expect(refineWithClientHints(parsed, null)).toEqual(parsed)
    expect(refineWithClientHints(parsed, undefined)).toEqual(parsed)
    expect(refineWithClientHints(parsed, {})).toEqual(parsed)
  })

  it('lets a platformVersion hint override the user-agent OS version', () => {
    const parsed = parseUserAgent(SAMSUNG_CHROME)

    expect(
      refineWithClientHints(parsed, { platformVersion: '15.0.0' }).osVersion
    ).toBe('15.0.0')
    expect(parsed.osVersion).toBe('15')
  })

  it('lets a model hint override the user-agent device model', () => {
    const parsed = parseUserAgent(IPHONE_SAFARI)

    expect(
      refineWithClientHints(parsed, { model: 'iPhone16,2' }).deviceModel
    ).toBe('iPhone16,2')
  })

  it('ignores blank hints', () => {
    const parsed = parseUserAgent(SAMSUNG_CHROME)

    const refined = refineWithClientHints(parsed, {
      model: '   ',
      platformVersion: '',
    })

    expect(refined.deviceModel).toBe(parsed.deviceModel)
    expect(refined.osVersion).toBe(parsed.osVersion)
  })

  it('skips the filler brand when picking the full version', () => {
    const parsed = parseUserAgent(WINDOWS_CHROME)

    const refined = refineWithClientHints(parsed, {
      fullVersionList: [
        { brand: 'Not_A Brand', version: '99.0.0.0' },
        { brand: 'Chromium', version: '131.0.6778.86' },
        { brand: 'Google Chrome', version: '131.0.6778.86' },
      ],
    })

    expect(refined.browserVersion).toBe('131.0.6778.86')
  })

  it('matches the full-version entry to the parsed browser name', () => {
    const parsed = parseUserAgent(WINDOWS_EDGE)

    const refined = refineWithClientHints(parsed, {
      fullVersionList: [
        { brand: 'Not_A Brand', version: '99.0.0.0' },
        { brand: 'Microsoft Edge', version: '131.0.2903.86' },
        { brand: 'Chromium', version: '131.0.6778.86' },
      ],
    })

    expect(refined.browserVersion).toBe('131.0.2903.86')
  })

  it('ignores a full-version list of only filler brands', () => {
    const parsed = parseUserAgent(WINDOWS_CHROME)

    const refined = refineWithClientHints(parsed, {
      fullVersionList: [{ brand: 'Not.A/Brand', version: '99.0.0.0' }],
    })

    expect(refined.browserVersion).toBe(parsed.browserVersion)
  })

  it('ignores a malformed full-version list', () => {
    const parsed = parseUserAgent(WINDOWS_CHROME)

    expect(
      refineWithClientHints(parsed, { fullVersionList: 'Chromium;131' })
        .browserVersion
    ).toBe(parsed.browserVersion)
    expect(
      refineWithClientHints(parsed, {
        fullVersionList: [null, 7, { brand: 'Chromium' }],
      }).browserVersion
    ).toBe(parsed.browserVersion)
  })

  it('reclassifies an unknown device type from the mobile hint', () => {
    expect(refineWithClientHints(EMPTY, { mobile: true }).deviceType).toBe(
      'mobile'
    )
    expect(refineWithClientHints(EMPTY, { mobile: false }).deviceType).toBe(
      'desktop'
    )
  })

  it('never lets the mobile hint override a bot classification', () => {
    const parsed = parseUserAgent(GOOGLEBOT)

    expect(refineWithClientHints(parsed, { mobile: false }).deviceType).toBe(
      'bot'
    )
  })

  it('never lets the mobile hint override a tablet classification', () => {
    const parsed = parseUserAgent(IPAD_SAFARI)

    expect(refineWithClientHints(parsed, { mobile: true }).deviceType).toBe(
      'tablet'
    )
  })

  it('fills a missing OS name from the platform hint only', () => {
    expect(refineWithClientHints(EMPTY, { platform: 'Windows' }).osName).toBe(
      'Windows'
    )
    expect(
      refineWithClientHints(parseUserAgent(MAC_SAFARI), { platform: 'Windows' })
        .osName
    ).toBe('Mac OS X')
  })
})

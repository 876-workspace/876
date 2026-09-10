import { describe, expect, it, vi } from 'vitest'

import { CaldavCalendarAdapter } from './caldav.js'
import { caldavRequest } from './caldav-network.js'

const CREDENTIAL = { username: 'calendar-user', password: 'app-password' }
const BASE_URL = 'https://dav.example.com/'

function xmlResponse(body: string, status = 207) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'application/xml' },
  })
}

function transportFrom(responses: Response[]) {
  return vi.fn(async (..._args: Parameters<typeof caldavRequest>) => {
    const response = responses.shift()
    if (!response) throw new Error('Unexpected CalDAV transport call.')
    return response
  })
}

function discovery(home = '/calendars/calendar-user/') {
  return xmlResponse(`<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:response><d:propstat><d:prop>
    <c:calendar-home-set><d:href>${home}</d:href></c:calendar-home-set>
  </d:prop></d:propstat></d:response>
</d:multistatus>`)
}

function calendarCollection(privileges: string | null) {
  const privilegeSet =
    privileges === null
      ? ''
      : `<d:current-user-privilege-set>${privileges}</d:current-user-privilege-set>`
  return xmlResponse(`<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:response>
    <d:href>/calendars/calendar-user/shared/</d:href>
    <d:propstat><d:prop>
      <d:resourcetype><d:collection/><c:calendar/></d:resourcetype>
      <d:displayname>Shared calendar</d:displayname>
      ${privilegeSet}
    </d:prop></d:propstat>
  </d:response>
</d:multistatus>`)
}

describe('CaldavCalendarAdapter', () => {
  it('marks a calendar read-only when DAV privileges omit full event writes', async () => {
    const transport = transportFrom([
      discovery(),
      calendarCollection('<d:privilege><d:read/></d:privilege>'),
    ])
    const adapter = new CaldavCalendarAdapter(CREDENTIAL, BASE_URL, transport)

    const calendars = await adapter.calendars()

    expect(calendars).toEqual([
      expect.objectContaining({
        name: 'Shared calendar',
        readOnly: true,
      }),
    ])
    expect(String(transport.mock.calls[1]?.[1]?.body)).toContain(
      'current-user-privilege-set'
    )
  })

  it('keeps aggregate DAV write privilege calendars bidirectional', async () => {
    const transport = transportFrom([
      discovery(),
      calendarCollection('<d:privilege><d:write/></d:privilege>'),
    ])
    const adapter = new CaldavCalendarAdapter(CREDENTIAL, BASE_URL, transport)

    const calendars = await adapter.calendars()

    expect(calendars[0]?.readOnly).toBe(false)
  })

  it('accepts granular content, bind, and unbind privileges as writable', async () => {
    const transport = transportFrom([
      discovery(),
      calendarCollection(`
        <d:privilege><d:write-content/></d:privilege>
        <d:privilege><d:bind/></d:privilege>
        <d:privilege><d:unbind/></d:privilege>`),
    ])
    const adapter = new CaldavCalendarAdapter(CREDENTIAL, BASE_URL, transport)

    const calendars = await adapter.calendars()

    expect(calendars[0]?.readOnly).toBe(false)
  })

  it('preserves backward compatibility when a server omits privilege discovery', async () => {
    const transport = transportFrom([discovery(), calendarCollection(null)])
    const adapter = new CaldavCalendarAdapter(CREDENTIAL, BASE_URL, transport)

    const calendars = await adapter.calendars()

    expect(calendars[0]?.readOnly).toBe(false)
  })

  it('rejects cross-origin calendar-home discovery before sending credentials there', async () => {
    const transport = transportFrom([discovery('https://evil.example.net/dav/')])
    const adapter = new CaldavCalendarAdapter(CREDENTIAL, BASE_URL, transport)

    await expect(adapter.calendars()).rejects.toMatchObject({
      code: 'provider-invalid-response',
    })
    expect(transport).toHaveBeenCalledTimes(1)
  })

  it('normalizes an invalid sync token response as a cursor error', async () => {
    const transport = transportFrom([new Response('', { status: 409 })])
    const adapter = new CaldavCalendarAdapter(CREDENTIAL, BASE_URL, transport)

    await expect(
      adapter.pull({
        remoteCalendarId: 'https://dav.example.com/calendars/user/main/',
        cursor: 'stale-token',
      })
    ).rejects.toMatchObject({ code: 'provider-cursor-invalid' })
  })

  it('uses Basic authorization only inside the injected transport boundary', async () => {
    const transport = transportFrom([discovery(), calendarCollection(null)])
    const adapter = new CaldavCalendarAdapter(CREDENTIAL, BASE_URL, transport)

    await adapter.calendars()

    expect(transport.mock.calls[0]?.[2]).toBe(
      `Basic ${Buffer.from('calendar-user:app-password').toString('base64')}`
    )
  })
})

/**
 * Session cookie sealing.
 *
 * The wire format is a contract between three implementations: this module
 * (the only writer), `core/session.py` (the service being replaced), and
 * `@876/core`'s `verifySession876` (the reader in every Next.js app). The
 * fixture below was sealed by the **Python** service, so a divergence in the
 * format shows up here rather than as every user being logged out at cutover.
 *
 * Regenerate with (from `apps/api`, with the Python venv):
 *
 *     .venv/bin/python -c "import sys; sys.path.insert(0,'.'); \
 *       from core.session import seal_session; \
 *       print(seal_session({'id':'user_2kL9', ...}, 'at_abc123', '<secret>', \
 *         ttl_seconds=60*60*24*3650, session_id='ses_7', ...))"
 */

import { createHmac } from 'node:crypto'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  accountEntry,
  accountIdentity,
  mergeAccounts,
  sealSession,
  selectAccount,
  unsealSession,
  type AccountEntry,
} from '../session'

const SECRET = 'test_session_secret_0123456789abcdef'
const OTHER_SECRET = 'different_secret_0123456789abcdefx'

/** Sealed by `core.session.seal_session`; expires in 2036. */
const PYTHON_COOKIE =
  'eyJ1c2VySWQiOiJ1c2VyXzJrTDkiLCJlbWFpbCI6ImFsZWphbmRyYUBleGFtcGxlLmNvbSIsImZpcnN0TmFtZSI6IkFsZWphbmRyYSIsImxhc3ROYW1lIjoiUmV5ZXMiLCJlbWFpbFZlcmlmaWVkIjp0cnVlLCJhdmF0YXIiOm51bGwsInVzZXJuYW1lIjoiYWxlamFuZHJhIiwicmVhbG0iOiJlbnRlcnByaXNlIiwib3JnSWQiOiJvcmdfNSIsImNyb3NzUmVhbG0iOnRydWUsImFjY2Vzc1Rva2VuIjoiYXRfYWJjMTIzIiwiZXhwIjoyMTAxNDM1ODMxLCJzaWQiOiJzZXNfNyIsImFjY291bnRzIjpbeyJ1c2VySWQiOiJ1c2VyXzJrTDkiLCJzaWQiOiJzZXNfNyJ9XX0uNjgyMjU5M2UxNmIwODlmYTUzNWU3M2I5ZTM4ODdiMmNmMDg4Mzk0YmFjZjIxMzk1OGE5Zjc5MjFiNmE4YTcxZg'

const USER = {
  id: 'user_2kL9',
  email: 'alejandra@example.com',
  firstName: 'Alejandra',
  lastName: 'Reyes',
  emailVerified: true,
  username: 'alejandra',
}

afterEach(() => {
  vi.useRealTimers()
})

describe('unsealSession against a Python-sealed cookie', () => {
  it('accepts it and returns every field the Python wrote', () => {
    expect(unsealSession(PYTHON_COOKIE, SECRET)).toEqual({
      userId: 'user_2kL9',
      email: 'alejandra@example.com',
      firstName: 'Alejandra',
      lastName: 'Reyes',
      emailVerified: true,
      avatar: null,
      username: 'alejandra',
      realm: 'enterprise',
      orgId: 'org_5',
      crossRealm: true,
      accessToken: 'at_abc123',
      exp: 2101435831,
      sid: 'ses_7',
      accounts: [{ userId: 'user_2kL9', sid: 'ses_7' }],
    })
  })

  it('rejects it under a different secret', () => {
    expect(unsealSession(PYTHON_COOKIE, OTHER_SECRET)).toBeNull()
  })

  it('rejects it once expired', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2040-01-01T00:00:00Z'))

    expect(unsealSession(PYTHON_COOKIE, SECRET)).toBeNull()
  })

  it('carries no padding character, which some cookie parsers mishandle', () => {
    expect(PYTHON_COOKIE).not.toContain('=')
  })
})

describe('sealSession', () => {
  it('round-trips through unsealSession', () => {
    const cookie = sealSession({
      userData: USER,
      accessToken: 'at_abc123',
      secret: SECRET,
    })

    expect(unsealSession(cookie, SECRET)).toMatchObject({
      userId: 'user_2kL9',
      email: 'alejandra@example.com',
      accessToken: 'at_abc123',
      realm: 'consumer',
    })
  })

  it('emits unpadded base64url', () => {
    const cookie = sealSession({
      userData: USER,
      accessToken: null,
      secret: SECRET,
    })

    expect(cookie).not.toContain('=')
    expect(cookie).not.toContain('+')
    expect(cookie).not.toContain('/')
  })

  it('produces a cookie the Python service can read', () => {
    // Asserted here as the format invariants the Python parser depends on:
    // base64url of `<json>.<64-hex>`, with the payload first.
    const cookie = sealSession({
      userData: USER,
      accessToken: 'at_abc123',
      secret: SECRET,
    })
    const decoded = Buffer.from(cookie, 'base64url').toString('utf8')
    const lastDot = decoded.lastIndexOf('.')

    expect(decoded.slice(lastDot + 1)).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.parse(decoded.slice(0, lastDot))).toMatchObject({
      userId: 'user_2kL9',
    })
  })

  it('defaults the expiry to 400 days', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-07T00:00:00Z'))
    const now = Math.floor(Date.parse('2026-08-07T00:00:00Z') / 1000)

    const cookie = sealSession({
      userData: USER,
      accessToken: null,
      secret: SECRET,
    })

    expect(unsealSession(cookie, SECRET)?.exp).toBe(now + 60 * 60 * 24 * 400)
  })

  it('honours an explicit ttl', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-07T00:00:00Z'))
    const now = Math.floor(Date.parse('2026-08-07T00:00:00Z') / 1000)

    const cookie = sealSession({
      userData: USER,
      accessToken: null,
      secret: SECRET,
      ttlSeconds: 3600,
    })

    expect(unsealSession(cookie, SECRET)?.exp).toBe(now + 3600)
  })

  it('omits sid and accounts when they are not supplied', () => {
    const cookie = sealSession({
      userData: USER,
      accessToken: null,
      secret: SECRET,
    })
    const payload = unsealSession(cookie, SECRET)

    expect(payload).not.toHaveProperty('sid')
    expect(payload).not.toHaveProperty('accounts')
  })

  it('carries sid and accounts when they are', () => {
    const entry = accountEntry(USER, 'ses_7')
    const cookie = sealSession({
      userData: USER,
      accessToken: null,
      secret: SECRET,
      sessionId: 'ses_7',
      accounts: [entry],
    })

    expect(unsealSession(cookie, SECRET)).toMatchObject({
      sid: 'ses_7',
      accounts: [entry],
    })
  })
})

describe('unsealSession rejections', () => {
  it.each([
    ['an empty string', ''],
    [
      'a value with no dot once decoded',
      Buffer.from('nodot').toString('base64url'),
    ],
    ['a non-JSON payload', Buffer.from('notjson.abc').toString('base64url')],
    ['a JSON array rather than an object', sealArray()],
  ])('rejects %s', (_label, cookie) => {
    expect(unsealSession(cookie, SECRET)).toBeNull()
  })

  it('rejects a tampered payload', () => {
    const cookie = sealSession({
      userData: USER,
      accessToken: null,
      secret: SECRET,
    })
    const decoded = Buffer.from(cookie, 'base64url').toString('utf8')
    const lastDot = decoded.lastIndexOf('.')
    const tampered = `${decoded.slice(0, lastDot).replace('user_2kL9', 'user_ADMIN')}${decoded.slice(lastDot)}`

    expect(
      unsealSession(Buffer.from(tampered).toString('base64url'), SECRET)
    ).toBeNull()
  })

  it('rejects a truncated signature rather than throwing', () => {
    // timingSafeEqual throws on mismatched lengths, so a forged signature of the
    // wrong length must be rejected the same way as one of the right length.
    const decoded = `{"userId":"x","exp":9999999999}.abc`

    expect(
      unsealSession(Buffer.from(decoded).toString('base64url'), SECRET)
    ).toBeNull()
  })

  it('treats a payload with no exp as expired', () => {
    // Deliberately stricter than @876/core, which lets a cookie with no expiry
    // pass: a cookie the API cannot date is a cookie it cannot trust.
    expect(unsealSession(sealRaw('{"userId":"user_2kL9"}'), SECRET)).toBeNull()
  })
})

describe('accountIdentity', () => {
  it('accepts snake_case as well as camelCase', () => {
    expect(
      accountIdentity({
        userId: 'user_1',
        email: 'a@b.co',
        first_name: 'Ada',
        last_name: 'Lovelace',
        email_verified: true,
      })
    ).toMatchObject({
      userId: 'user_1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      emailVerified: true,
    })
  })

  it('prefers id over userId, as the Python does', () => {
    expect(
      accountIdentity({ id: 'from_id', userId: 'from_userId' }).userId
    ).toBe('from_id')
  })

  it('defaults a missing id and email to empty strings', () => {
    const identity = accountIdentity({})

    expect(identity.userId).toBe('')
    expect(identity.email).toBe('')
  })

  it('nulls the optional name fields rather than omitting them', () => {
    // JSON.stringify drops `undefined`, so these must be null or the sealed
    // payload would differ in shape from the Python's.
    const identity = accountIdentity({})

    expect(identity.firstName).toBeNull()
    expect(identity.lastName).toBeNull()
    expect(identity.avatar).toBeNull()
    expect(identity.username).toBeNull()
  })

  it('defaults the realm to consumer', () => {
    expect(accountIdentity({}).realm).toBe('consumer')
  })

  it('omits orgId and crossRealm when they are absent or false', () => {
    const identity = accountIdentity({}, { crossRealm: false, orgId: null })

    expect(identity).not.toHaveProperty('orgId')
    expect(identity).not.toHaveProperty('crossRealm')
  })

  it('carries orgId and crossRealm when set', () => {
    expect(
      accountIdentity(
        {},
        { realm: 'enterprise', orgId: 'org_5', crossRealm: true }
      )
    ).toMatchObject({ realm: 'enterprise', orgId: 'org_5', crossRealm: true })
  })
})

describe('mergeAccounts', () => {
  const first: AccountEntry = accountEntry({ id: 'user_1' }, 'ses_1')
  const second: AccountEntry = accountEntry({ id: 'user_2' }, 'ses_2')

  it('appends a new account last', () => {
    expect(mergeAccounts([first], second)).toEqual([first, second])
  })

  it('starts a set from nothing', () => {
    expect(mergeAccounts(null, first)).toEqual([first])
  })

  it('replaces a stale entry for the same user rather than duplicating it', () => {
    const reauthenticated = accountEntry({ id: 'user_1' }, 'ses_NEW')
    const merged = mergeAccounts([first, second], reauthenticated)

    expect(merged).toEqual([second, reauthenticated])
    expect(merged).toHaveLength(2)
  })

  it('puts the freshly authenticated account last', () => {
    const reauthenticated = accountEntry({ id: 'user_1' }, 'ses_NEW')

    expect(mergeAccounts([first, second], reauthenticated).at(-1)).toEqual(
      reauthenticated
    )
  })
})

describe('selectAccount', () => {
  const first = accountEntry({ id: 'user_1' }, 'ses_1')
  const second = accountEntry({ id: 'user_2' }, 'ses_2')

  it('finds the entry for a sid in the set', () => {
    expect(selectAccount([first, second], 'ses_2')).toEqual(second)
  })

  it('returns null for a sid outside the set', () => {
    // This is the whole point: a client-supplied sid must not select an account
    // the cookie does not already contain.
    expect(selectAccount([first, second], 'ses_ATTACKER')).toBeNull()
  })

  it('returns null for an empty or absent set', () => {
    expect(selectAccount([], 'ses_1')).toBeNull()
    expect(selectAccount(null, 'ses_1')).toBeNull()
  })
})

/** Seal an arbitrary payload string with a valid signature, bypassing sealSession. */
function sealRaw(payload: string): string {
  const signature = createHmac('sha256', SECRET).update(payload).digest('hex')
  return Buffer.from(`${payload}.${signature}`).toString('base64url')
}

function sealArray(): string {
  return sealRaw('[]')
}

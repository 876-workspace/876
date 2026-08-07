import { describe, expect, it } from 'vitest'

import { DISPOSABLE_DOMAINS, isDisposableEmailDomain } from '../email'

const DOMAINS = new Set(['mailinator.com', 'tempmail.example.co.uk'])

describe('isDisposableEmailDomain', () => {
  it('matches an exact domain', () => {
    expect(isDisposableEmailDomain('jane@mailinator.com', DOMAINS)).toBe(true)
  })

  it('matches case-insensitively and ignores surrounding whitespace', () => {
    expect(isDisposableEmailDomain('  Jane@MAILINATOR.com ', DOMAINS)).toBe(
      true
    )
  })

  it('matches a subdomain through its parent', () => {
    expect(isDisposableEmailDomain('jane@mail.mailinator.com', DOMAINS)).toBe(
      true
    )
  })

  it('does not match a domain that is merely a suffix of a listed one', () => {
    expect(isDisposableEmailDomain('jane@notmailinator.com', DOMAINS)).toBe(
      false
    )
  })

  it('accepts an address on an unlisted domain', () => {
    expect(isDisposableEmailDomain('alejandra@example.com', DOMAINS)).toBe(
      false
    )
  })

  it.each([['no-at-sign'], ['trailing@'], [''], ['   ']])(
    'returns false for the malformed address %p',
    (email) => {
      expect(isDisposableEmailDomain(email, DOMAINS)).toBe(false)
    }
  )

  it('uses the last @ so a local part containing one cannot spoof the domain', () => {
    expect(
      isDisposableEmailDomain('"jane@mailinator.com"@example.com', DOMAINS)
    ).toBe(false)
  })

  it('never matches a bare public suffix', () => {
    expect(isDisposableEmailDomain('jane@a.b.com', new Set(['com']))).toBe(
      false
    )
  })

  it('walks parents only one label short of the suffix', () => {
    // `example.co.uk` is reachable from `mail.tempmail.example.co.uk`, but the
    // walk stops before testing the bare `uk`.
    expect(
      isDisposableEmailDomain('jane@mail.tempmail.example.co.uk', DOMAINS)
    ).toBe(true)
  })

  it('ships with an empty list, matching the FastAPI service', () => {
    // `utils/email.py` resolves its data file to a path that does not exist in
    // this repository, so the running service blocks nothing. Populating the
    // list is a product decision, not part of the port — this test is the alarm
    // if one is added without that decision being made.
    expect(DISPOSABLE_DOMAINS.size).toBe(0)
    expect(isDisposableEmailDomain('jane@mailinator.com')).toBe(false)
  })
})

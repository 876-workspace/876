import { describe, expect, it } from 'vitest'

import { resolveWorkspaceReturn } from './workspace-return'

const ORG_RECORD = { href: '/orgs/acme', label: 'Acme Ltd' }

describe('resolveWorkspaceReturn', () => {
  it('falls back to the organization record when no entry point is given', () => {
    expect(resolveWorkspaceReturn(undefined, 'acme', 'Acme Ltd')).toEqual(
      ORG_RECORD
    )
    expect(resolveWorkspaceReturn(null, 'acme', 'Acme Ltd')).toEqual(ORG_RECORD)
    expect(resolveWorkspaceReturn('', 'acme', 'Acme Ltd')).toEqual(ORG_RECORD)
  })

  it('returns to the organization record it was entered from', () => {
    expect(resolveWorkspaceReturn('/orgs/acme', 'acme', 'Acme Ltd')).toEqual(
      ORG_RECORD
    )
  })

  it('names the organization for any tab of its record', () => {
    expect(
      resolveWorkspaceReturn('/orgs/acme/members', 'acme', 'Acme Ltd')
    ).toEqual({ href: '/orgs/acme/members', label: 'Acme Ltd' })
  })

  it('names the launcher when entered from the workspace index', () => {
    expect(
      resolveWorkspaceReturn('/workspace/acme', 'acme', 'Acme Ltd')
    ).toEqual({ href: '/workspace/acme', label: 'All workspaces' })
  })

  it('keeps a query string on an otherwise valid entry point', () => {
    expect(
      resolveWorkspaceReturn('/orgs/acme?status=active', 'acme', 'Acme Ltd')
    ).toEqual({ href: '/orgs/acme?status=active', label: 'Acme Ltd' })
  })

  it('labels an unrecognized in-app path generically rather than guessing', () => {
    expect(resolveWorkspaceReturn('/requests', 'acme', 'Acme Ltd')).toEqual({
      href: '/requests',
      label: 'Back',
    })
  })

  // `from` is attacker-controlled. Every rejection must fall back to the org
  // record, never render the supplied value as a link.
  describe('rejects a destination that leaves the origin', () => {
    const HOSTILE = [
      'https://evil.example',
      'http://evil.example',
      '//evil.example',
      '/\\evil.example',
      '\\\\evil.example',
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      '/orgs/acme\\@evil.example',
      ' /orgs/acme',
      '\t/orgs/acme',
      '\n/orgs/acme',
      '/ /orgs/acme',
      'java\nscript:alert(1)',
      'orgs/acme',
      '../../etc/passwd',
      '__proto__',
      '\u202e/orgs/acme',
    ] as const

    it.each(HOSTILE)('rejects %j', (from) => {
      expect(resolveWorkspaceReturn(from, 'acme', 'Acme Ltd')).toEqual(
        ORG_RECORD
      )
    })
  })

  it('never returns a label taken from the supplied path', () => {
    const result = resolveWorkspaceReturn(
      '/orgs/acme/<script>alert(1)</script>',
      'acme',
      'Acme Ltd'
    )

    expect(result.label).toBe('Acme Ltd')
  })

  it('encodes an organization slug into the fallback', () => {
    expect(resolveWorkspaceReturn(null, 'a c/me', 'A C/me')).toEqual({
      href: '/orgs/a%20c%2Fme',
      label: 'A C/me',
    })
  })

  it('returns a fresh object rather than a shared constant', () => {
    const first = resolveWorkspaceReturn('/orgs/acme', 'acme', 'Acme Ltd')
    const second = resolveWorkspaceReturn('/orgs/acme', 'acme', 'Acme Ltd')

    expect(first).toEqual(second)
    expect(first).not.toBe(second)
  })
})

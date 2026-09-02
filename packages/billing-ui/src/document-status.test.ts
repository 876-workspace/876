import { describe, expect, it } from 'vitest'

import { documentStatusVariant } from './document-status'

describe('documentStatusVariant', () => {
  it.each(['PAID', 'ACCEPTED', 'CLOSED'])('reads %s as success', (status) => {
    expect(documentStatusVariant(status)).toBe('success')
  })

  it.each(['OPEN', 'SENT', 'ISSUED'])('reads %s as info', (status) => {
    expect(documentStatusVariant(status)).toBe('info')
  })

  it.each(['PAST_DUE', 'OVERDUE', 'EXPIRED'])('warns on %s', (status) => {
    expect(documentStatusVariant(status)).toBe('warning')
  })

  it.each(['VOID', 'UNCOLLECTIBLE', 'DECLINED', 'REJECTED'])(
    'reads %s as destructive',
    (status) => {
      expect(documentStatusVariant(status)).toBe('destructive')
    }
  )

  it('is case-insensitive, since hosts hold status in both cases', () => {
    expect(documentStatusVariant('paid')).toBe('success')
    expect(documentStatusVariant('Past_Due')).toBe('warning')
  })

  it('falls back to secondary for an unknown status rather than throwing', () => {
    expect(documentStatusVariant('SOMETHING_NEW')).toBe('secondary')
  })

  it('falls back to secondary for an empty status', () => {
    expect(documentStatusVariant('')).toBe('secondary')
  })
})

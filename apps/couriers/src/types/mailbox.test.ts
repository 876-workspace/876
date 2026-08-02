import { describe, expect, it } from 'vitest'

import { mailboxCreateParamsSchema } from './mailbox'

const validMailbox = {
  customerId: 'cprof_kimani',
  number: '1042',
}

describe('mailboxCreateParamsSchema', () => {
  it('accepts a digits-only mailbox number', () => {
    const parsed = mailboxCreateParamsSchema.safeParse(validMailbox)

    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.number).toBe('1042')
  })

  it.each([
    ['letters', 'RSJ1042'],
    ['punctuation', '1042-1'],
  ])('rejects a mailbox number containing %s', (_label, number) => {
    const parsed = mailboxCreateParamsSchema.safeParse({
      ...validMailbox,
      number,
    })

    expect(parsed.success).toBe(false)
    if (!parsed.success)
      expect(parsed.error.issues[0]?.message).toBe(
        'Mailbox number may only contain digits.'
      )
  })
})

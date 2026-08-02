import { describe, expect, it } from 'vitest'

import {
  warehouseCreateParamsSchema,
  warehouseUpdateParamsSchema,
} from './warehouse'

const validAddress = {
  name: 'Miami Receiving Hub',
  line1: '8760 NW 25th Street',
  city: 'Doral',
  countryCode: 'US',
}

describe('warehouse mailbox prefix validation', () => {
  it('accepts letters and stores a lowercase prefix uppercase', () => {
    const parsed = warehouseCreateParamsSchema.safeParse({
      name: 'Miami Receiving Hub',
      address: validAddress,
      mailboxPrefix: 'suite',
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.mailboxPrefix).toBe('SUITE')
  })

  it('treats a blank prefix as absent', () => {
    const parsed = warehouseCreateParamsSchema.safeParse({
      name: 'Miami Receiving Hub',
      address: validAddress,
      mailboxPrefix: '',
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.mailboxPrefix).toBeUndefined()
  })

  it.each([
    ['digits', 'Suite1042'],
    ['punctuation', 'Suite!'],
  ])('rejects a prefix containing %s', (_label, mailboxPrefix) => {
    const parsed = warehouseUpdateParamsSchema.safeParse({ mailboxPrefix })

    expect(parsed.success).toBe(false)
    if (!parsed.success)
      expect(parsed.error.issues[0]?.message).toBe(
        'Warehouse mailbox prefix may only contain letters.'
      )
  })
})

describe('warehouseUpdateParamsSchema clearing', () => {
  it.each([
    ['agentName', 'agentName'],
    ['code', 'code'],
    ['mailboxPrefix', 'mailboxPrefix'],
    ['instructions', 'instructions'],
  ])(
    'maps a blank %s to null so the service clears it rather than keeping the old value',
    (_label, field) => {
      const parsed = warehouseUpdateParamsSchema.safeParse({ [field]: '' })

      expect(parsed.success).toBe(true)
      if (parsed.success)
        expect(parsed.data[field as keyof typeof parsed.data]).toBeNull()
    }
  )

  it.each([
    ['agentName', 'agentName'],
    ['code', 'code'],
    ['mailboxPrefix', 'mailboxPrefix'],
    ['instructions', 'instructions'],
  ])(
    'leaves an omitted %s undefined so the service skips it',
    (_label, field) => {
      const parsed = warehouseUpdateParamsSchema.safeParse({ name: 'Miami' })

      expect(parsed.success).toBe(true)
      if (parsed.success)
        expect(parsed.data[field as keyof typeof parsed.data]).toBeUndefined()
    }
  )

  it('accepts an already-parsed null so re-parsing in the service is idempotent', () => {
    const parsed = warehouseUpdateParamsSchema.safeParse({
      agentName: null,
      code: null,
      mailboxPrefix: null,
      instructions: null,
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.agentName).toBeNull()
      expect(parsed.data.code).toBeNull()
      expect(parsed.data.mailboxPrefix).toBeNull()
      expect(parsed.data.instructions).toBeNull()
    }
  })
})

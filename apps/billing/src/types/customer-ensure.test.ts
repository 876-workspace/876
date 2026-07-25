import { describe, expect, it } from 'vitest'

import { CustomerEnsureSchema } from './sync'

describe('CustomerEnsureSchema', () => {
  it('accepts a full CORE_ORGANIZATION party snapshot with primary contact', () => {
    const result = CustomerEnsureSchema.safeParse({
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_123',
      customerKind: 'BUSINESS',
      name: 'Efesto',
      companyName: 'Efesto Technologies',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ap@efesto.test',
      phone: '+18765550000',
      primaryContact: {
        userId: 'usr_owner',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        phone: '+18765550111',
      },
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.customerType).toBe('CORE_ORGANIZATION')
    expect(result.data.organizationId).toBe('org_123')
    expect(result.data.primaryContact?.userId).toBe('usr_owner')
    expect(result.data.companyName).toBe('Efesto Technologies')
  })

  it('accepts a CORE_USER individual without a primary contact', () => {
    const result = CustomerEnsureSchema.safeParse({
      customerType: 'CORE_USER',
      userId: 'usr_123',
      customerKind: 'INDIVIDUAL',
      name: 'Ada Lovelace',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.userId).toBe('usr_123')
    expect(result.data.organizationId).toBeUndefined()
  })

  it('defaults customerType to CORE_ORGANIZATION when omitted', () => {
    const result = CustomerEnsureSchema.safeParse({
      organizationId: 'org_123',
      name: 'Efesto',
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.customerType).toBe('CORE_ORGANIZATION')
  })

  it('accepts null primaryContact and null optional party fields', () => {
    const result = CustomerEnsureSchema.safeParse({
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_123',
      name: 'Efesto',
      email: null,
      companyName: null,
      firstName: null,
      lastName: null,
      phone: null,
      primaryContact: null,
    })

    expect(result.success).toBe(true)
  })

  it('accepts a primary contact with only userId', () => {
    const result = CustomerEnsureSchema.safeParse({
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_123',
      name: 'Efesto',
      primaryContact: { userId: 'usr_owner' },
    })

    expect(result.success).toBe(true)
  })

  it.each([
    {
      label: 'both organizationId and userId',
      payload: {
        customerType: 'CORE_ORGANIZATION',
        organizationId: 'org_123',
        userId: 'usr_123',
        name: 'Invalid',
      },
    },
    {
      label: 'CORE_USER without userId',
      payload: { customerType: 'CORE_USER', name: 'Invalid' },
    },
    {
      label: 'CORE_ORGANIZATION with only userId',
      payload: {
        customerType: 'CORE_ORGANIZATION',
        userId: 'usr_123',
        name: 'Invalid',
      },
    },
    {
      label: 'CORE_USER with organizationId',
      payload: {
        customerType: 'CORE_USER',
        userId: 'usr_123',
        organizationId: 'org_123',
        name: 'Invalid',
      },
    },
    {
      label: 'empty name',
      payload: {
        customerType: 'CORE_ORGANIZATION',
        organizationId: 'org_123',
        name: '',
      },
    },
    {
      label: 'invalid email',
      payload: {
        customerType: 'CORE_ORGANIZATION',
        organizationId: 'org_123',
        name: 'Efesto',
        email: 'not-an-email',
      },
    },
    {
      label: 'invalid customerKind',
      payload: {
        customerType: 'CORE_ORGANIZATION',
        organizationId: 'org_123',
        name: 'Efesto',
        customerKind: 'PERSON',
      },
    },
    {
      label: 'primaryContact missing userId',
      payload: {
        customerType: 'CORE_ORGANIZATION',
        organizationId: 'org_123',
        name: 'Efesto',
        primaryContact: { firstName: 'Ada' },
      },
    },
    {
      label: 'primaryContact invalid email',
      payload: {
        customerType: 'CORE_ORGANIZATION',
        organizationId: 'org_123',
        name: 'Efesto',
        primaryContact: {
          userId: 'usr_1',
          email: 'bad',
        },
      },
    },
    {
      label: 'unknown top-level field',
      payload: {
        customerType: 'CORE_ORGANIZATION',
        organizationId: 'org_123',
        name: 'Efesto',
        tenantId: 'ten_1',
      },
    },
  ])('rejects $label', ({ payload }) => {
    const result = CustomerEnsureSchema.safeParse(payload)

    expect(result.success).toBe(false)
  })

  it('trims name and companyName', () => {
    const result = CustomerEnsureSchema.safeParse({
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_123',
      name: '  Efesto  ',
      companyName: '  Efesto Technologies  ',
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.name).toBe('Efesto')
    expect(result.data.companyName).toBe('Efesto Technologies')
  })
})

describe('CustomerEnsureSchema field boundaries', () => {
  it.each([
    { field: 'name', value: 'a'.repeat(160), ok: true },
    { field: 'name', value: 'a'.repeat(161), ok: false },
    { field: 'companyName', value: 'c'.repeat(160), ok: true },
    { field: 'companyName', value: 'c'.repeat(161), ok: false },
    { field: 'firstName', value: 'f'.repeat(80), ok: true },
    { field: 'firstName', value: 'f'.repeat(81), ok: false },
    { field: 'lastName', value: 'l'.repeat(80), ok: true },
    { field: 'lastName', value: 'l'.repeat(81), ok: false },
    { field: 'phone', value: 'p'.repeat(40), ok: true },
    { field: 'phone', value: 'p'.repeat(41), ok: false },
  ])('validates $field length (ok=$ok)', ({ field, value, ok }) => {
    const result = CustomerEnsureSchema.safeParse({
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_123',
      name: field === 'name' ? value : 'Efesto',
      [field]: value,
    })

    expect(result.success).toBe(ok)
  })

  it('rejects whitespace-only name after trim', () => {
    const result = CustomerEnsureSchema.safeParse({
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_123',
      name: '   ',
    })

    expect(result.success).toBe(false)
  })

  it('accepts null email and rejects empty-string email', () => {
    expect(
      CustomerEnsureSchema.safeParse({
        customerType: 'CORE_ORGANIZATION',
        organizationId: 'org_123',
        name: 'Efesto',
        email: null,
      }).success
    ).toBe(true)

    expect(
      CustomerEnsureSchema.safeParse({
        customerType: 'CORE_ORGANIZATION',
        organizationId: 'org_123',
        name: 'Efesto',
        email: '',
      }).success
    ).toBe(false)
  })

  it('rejects empty organizationId / userId after trim', () => {
    expect(
      CustomerEnsureSchema.safeParse({
        customerType: 'CORE_ORGANIZATION',
        organizationId: '   ',
        name: 'Efesto',
      }).success
    ).toBe(false)

    expect(
      CustomerEnsureSchema.safeParse({
        customerType: 'CORE_USER',
        userId: '',
        name: 'Ada',
      }).success
    ).toBe(false)
  })

  it('rejects ids longer than 191 characters', () => {
    const result = CustomerEnsureSchema.safeParse({
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'o'.repeat(192),
      name: 'Efesto',
    })

    expect(result.success).toBe(false)
  })

  it('trims primaryContact string fields', () => {
    const result = CustomerEnsureSchema.safeParse({
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_123',
      name: 'Efesto',
      primaryContact: {
        userId: '  usr_1  ',
        firstName: '  Ada  ',
        lastName: '  Lovelace  ',
        phone: '  +1876  ',
      },
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.primaryContact).toEqual({
      userId: 'usr_1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: '+1876',
    })
  })

  it('rejects primaryContact with unknown fields', () => {
    const result = CustomerEnsureSchema.safeParse({
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_123',
      name: 'Efesto',
      primaryContact: {
        userId: 'usr_1',
        department: 'ops',
      },
    })

    expect(result.success).toBe(false)
  })

  it('rejects primaryContact phone longer than 40', () => {
    const result = CustomerEnsureSchema.safeParse({
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_123',
      name: 'Efesto',
      primaryContact: {
        userId: 'usr_1',
        phone: '1'.repeat(41),
      },
    })

    expect(result.success).toBe(false)
  })

  it('accepts companyName empty string after trim as empty', () => {
    // trim then max(160) — empty string is allowed for optional nullable string
    const result = CustomerEnsureSchema.safeParse({
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_123',
      name: 'Efesto',
      companyName: '   ',
    })

    // z.string().trim().max(160) allows empty after trim unless min(1)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.companyName).toBe('')
  })
})

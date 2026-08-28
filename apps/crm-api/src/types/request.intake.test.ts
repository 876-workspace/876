import { describe, expect, it } from 'vitest'
import type { RequestIntakeContext } from './request.js'

function intake(
  overrides: Partial<RequestIntakeContext> = {}
): RequestIntakeContext {
  return {
    formId: 'crm_form_1',
    formVersion: 1,
    definitionSnapshot: { fields: [] },
    answers: { subject: 'Hi' },
    customerOrganizationId: 'org_1',
    customerUserId: null,
    ...overrides,
  }
}

describe('RequestIntakeContext - intake metadata', () => {
  it('holds formId, version, snapshot, answers and customer party', () => {
    const ctx = intake()
    expect(ctx.formId).toBe('crm_form_1')
    expect(ctx.formVersion).toBe(1)
    expect(ctx.definitionSnapshot).toEqual({ fields: [] })
    expect(ctx.answers).toEqual({ subject: 'Hi' })
    expect(ctx.customerOrganizationId).toBe('org_1')
    expect(ctx.customerUserId).toBeNull()
  })

  it('allows customerUserId party instead of organization', () => {
    const ctx = intake({
      customerOrganizationId: null,
      customerUserId: 'usr_1',
    })
    expect(ctx.customerOrganizationId).toBeNull()
    expect(ctx.customerUserId).toBe('usr_1')
  })

  it('allows both customer fields null for internal callers (type permits)', () => {
    const ctx = intake({ customerOrganizationId: null, customerUserId: null })
    expect(ctx.customerOrganizationId).toBeNull()
    expect(ctx.customerUserId).toBeNull()
  })

  it('keeps version as positive integer', () => {
    expect(intake({ formVersion: 2 }).formVersion).toBe(2)
    expect(intake({ formVersion: 999 }).formVersion).toBe(999)
  })

  it('keeps answers as record of unknown values', () => {
    const ctx = intake({
      answers: { subject: 'Hi', count: 42, agree: true, tags: ['a'] },
    })
    expect(ctx.answers.count).toBe(42)
  })

  it('keeps definitionSnapshot as unknown (can be any)', () => {
    const snapshot = { fields: [{ id: 'f1', key: 'subject' }] }
    const ctx = intake({ definitionSnapshot: snapshot })
    expect(ctx.definitionSnapshot).toEqual(snapshot)
  })

  it('is serializable via JSON without losing keys', () => {
    const ctx = intake()
    const parsed = JSON.parse(JSON.stringify(ctx)) as RequestIntakeContext
    expect(parsed).toEqual(ctx)
  })
})

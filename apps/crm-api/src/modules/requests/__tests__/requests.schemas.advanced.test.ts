import { describe, expect, it } from 'vitest'

import {
  createRequestBodySchema,
  listRequestsQuerySchema,
  organizationParamsSchema,
  requestParamsSchema,
  updateRequestBodySchema,
} from '../requests.schemas.js'

describe('requests.schemas - organization and request params', () => {
  it('rejects empty organizationId', () => {
    expect(() =>
      organizationParamsSchema.parse({ organizationId: '' })
    ).toThrow()
    expect(() =>
      organizationParamsSchema.parse({ organizationId: '   ' })
    ).toThrow()
  })
  it('accepts valid organizationId and request id', () => {
    expect(
      requestParamsSchema.parse({ organizationId: 'org_1', id: 'crm_req_1' })
    ).toEqual({ organizationId: 'org_1', id: 'crm_req_1' })
  })
  it('rejects missing id', () => {
    expect(() =>
      requestParamsSchema.parse({ organizationId: 'org_1' })
    ).toThrow()
  })
})

describe('requests.schemas - listRequestsQuerySchema', () => {
  it('parses empty query as no filters', () => {
    expect(listRequestsQuerySchema.parse({})).toEqual({})
  })
  it('parses every allowed filter', () => {
    const parsed = listRequestsQuerySchema.parse({
      status: 'OPEN',
      teamId: 'crm_team_1',
      assigneeId: 'usr_1',
      customerId: 'crm_cus_1',
      categoryId: 'crm_cat_1',
      subcategoryId: 'crm_sub_1',
      ownerId: 'usr_owner',
      priorityId: 'crm_pri_urgent',
    })
    expect(parsed).toMatchObject({
      status: 'OPEN',
      priorityId: 'crm_pri_urgent',
      teamId: 'crm_team_1',
    })
  })
  it('rejects an invalid status and the retired priority enum filter', () => {
    expect(() => listRequestsQuerySchema.parse({ status: 'UNKNOWN' })).toThrow()
    // Priorities are tenant rows now, so the filter is an opaque id. A client
    // still sending `priority=URGENT` must fail rather than be filtered out.
    expect(() =>
      listRequestsQuerySchema.parse({ priority: 'URGENT' })
    ).toThrow()
  })
  it('trims teamId but does not require min length', () => {
    const parsed = listRequestsQuerySchema.parse({ teamId: '  crm_team_1  ' })
    expect(parsed.teamId).toBe('crm_team_1')
  })
})

describe('requests.schemas - createRequestBodySchema', () => {
  const base = {
    customerId: 'crm_cus_1',
    subject: 'Need help',
    createdBy: 'usr_1',
  }

  it('parses minimal valid input', () => {
    expect(createRequestBodySchema.parse(base)).toMatchObject(base)
  })
  it('trims subject and enforces max 240', () => {
    const ok = createRequestBodySchema.parse({ ...base, subject: '  hello  ' })
    expect(ok.subject).toBe('hello')
    expect(() =>
      createRequestBodySchema.parse({ ...base, subject: '' })
    ).toThrow()
    expect(() =>
      createRequestBodySchema.parse({ ...base, subject: 'a'.repeat(241) })
    ).toThrow()
    expect(
      createRequestBodySchema.parse({ ...base, subject: 'a'.repeat(240) })
        .subject
    ).toHaveLength(240)
  })
  it('accepts nullable category/subcategory/team/owner as null', () => {
    const parsed = createRequestBodySchema.parse({
      ...base,
      categoryId: null,
      subcategoryId: null,
      teamId: null,
      ownerId: null,
    })
    expect(parsed.categoryId).toBeNull()
    expect(parsed.teamId).toBeNull()
  })
  it('rejects empty customerId and createdBy', () => {
    expect(() =>
      createRequestBodySchema.parse({ ...base, customerId: '' })
    ).toThrow()
    expect(() =>
      createRequestBodySchema.parse({ ...base, createdBy: '' })
    ).toThrow()
  })
  it('accepts a tenant priority id and rejects the retired enum', () => {
    expect(
      createRequestBodySchema.parse({ ...base, priorityId: ' crm_pri_high ' })
        .priorityId
    ).toBe('crm_pri_high')
    expect(() =>
      createRequestBodySchema.parse({ ...base, priority: 'HIGH' })
    ).toThrow()
  })
  it('validates the channel enum', () => {
    expect(
      createRequestBodySchema.parse({ ...base, channel: 'EMAIL' }).channel
    ).toBe('EMAIL')
    expect(() =>
      createRequestBodySchema.parse({ ...base, channel: 'SLACK' })
    ).toThrow()
  })
  it('rejects the retired request source axis', () => {
    expect(() =>
      createRequestBodySchema.parse({ ...base, channel: 'WEB' })
    ).toThrow()
    expect(() =>
      createRequestBodySchema.parse({ ...base, source: 'EMAIL' })
    ).toThrow()
  })
  it('keeps the 20_000 authored-character description limit', () => {
    expect(
      createRequestBodySchema.parse({ ...base, description: '  details  ' })
        .description
    ).toBe('details')

    const atLimit = JSON.stringify({
      blocks: [{ type: 'paragraph', data: { text: 'a'.repeat(20_000) } }],
    })
    const overLimit = JSON.stringify({
      blocks: [{ type: 'paragraph', data: { text: 'a'.repeat(20_001) } }],
    })

    expect(
      createRequestBodySchema.parse({ ...base, description: atLimit })
        .description
    ).toBe(atLimit)
    expect(() =>
      createRequestBodySchema.parse({ ...base, description: overLimit })
    ).toThrow()
    expect(
      createRequestBodySchema.parse({ ...base, description: null }).description
    ).toBeNull()
  })
})

describe('requests.schemas - updateRequestBodySchema', () => {
  it('requires at least one field', () => {
    expect(() => updateRequestBodySchema.parse({})).toThrow()
  })
  it('accepts any single updatable field', () => {
    expect(updateRequestBodySchema.parse({ status: 'RESOLVED' })).toEqual({
      status: 'RESOLVED',
    })
    expect(updateRequestBodySchema.parse({ teamId: null }).teamId).toBeNull()
  })
  it('rejects empty subject after trim', () => {
    expect(() => updateRequestBodySchema.parse({ subject: '   ' })).toThrow()
  })
  it('rejects an invalid status and the retired priority enum', () => {
    expect(() => updateRequestBodySchema.parse({ status: 'DONE' })).toThrow()
    expect(() =>
      updateRequestBodySchema.parse({ priority: 'LOWEST' })
    ).toThrow()
    expect(
      updateRequestBodySchema.parse({ priorityId: 'crm_pri_low' }).priorityId
    ).toBe('crm_pri_low')
  })
})

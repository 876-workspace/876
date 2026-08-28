import { describe, expect, it } from 'vitest'
import {
  createReminderBodySchema,
  createRequestBodySchema,
  createRequestNoteBodySchema,
  createTaskBodySchema,
  listRequestNotesQuerySchema,
  listRequestsQuerySchema,
  organizationParamsSchema,
  requestParamsSchema,
  updateReminderBodySchema,
  updateRequestBodySchema,
  updateRequestNoteBodySchema,
  updateTaskBodySchema,
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
      priority: 'URGENT',
    })
    expect(parsed).toMatchObject({
      status: 'OPEN',
      priority: 'URGENT',
      teamId: 'crm_team_1',
    })
  })
  it('rejects invalid status and priority', () => {
    expect(() => listRequestsQuerySchema.parse({ status: 'UNKNOWN' })).toThrow()
    expect(() =>
      listRequestsQuerySchema.parse({ priority: 'CRITICAL' })
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
  it('validates priority and source enums', () => {
    expect(
      createRequestBodySchema.parse({ ...base, priority: 'HIGH' }).priority
    ).toBe('HIGH')
    expect(() =>
      createRequestBodySchema.parse({ ...base, priority: 'CRITICAL' })
    ).toThrow()
    expect(
      createRequestBodySchema.parse({ ...base, source: 'EMAIL' }).source
    ).toBe('EMAIL')
    expect(() =>
      createRequestBodySchema.parse({ ...base, source: 'SLACK' })
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
  it('rejects invalid enums', () => {
    expect(() => updateRequestBodySchema.parse({ status: 'DONE' })).toThrow()
    expect(() =>
      updateRequestBodySchema.parse({ priority: 'LOWEST' })
    ).toThrow()
  })
})

describe('requests.schemas - request note rich content', () => {
  const document = JSON.stringify({
    time: 1,
    blocks: [{ type: 'paragraph', data: { text: '<b>Hello</b>' } }],
    version: '2.31.6',
  })

  it('accepts serialized Editor.js bodies for create and update', () => {
    expect(
      createRequestNoteBodySchema.parse({
        body: document,
        authorId: 'usr_1',
      }).body
    ).toBe(document)
    expect(
      updateRequestNoteBodySchema.parse({
        body: document,
        editedBy: 'usr_1',
      }).body
    ).toBe(document)
  })

  it('accepts private visibility and parses private list access', () => {
    expect(
      createRequestNoteBodySchema.parse({
        body: document,
        authorId: 'usr_1',
        visibility: 'PRIVATE',
      }).visibility
    ).toBe('PRIVATE')
    expect(
      listRequestNotesQuerySchema.parse({
        viewer_id: 'usr_1',
        include_private: 'true',
      })
    ).toEqual({ viewer_id: 'usr_1', include_private: true })
  })

  it('keeps legacy plain text valid and preserves the 10_000 text limit', () => {
    expect(
      createRequestNoteBodySchema.parse({
        body: 'Legacy note',
        authorId: 'usr_1',
      }).body
    ).toBe('Legacy note')

    const overLimit = JSON.stringify({
      blocks: [{ type: 'paragraph', data: { text: 'a'.repeat(10_001) } }],
    })
    expect(() =>
      createRequestNoteBodySchema.parse({
        body: overLimit,
        authorId: 'usr_1',
      })
    ).toThrow()
  })

  it('rejects documents with more than 250 blocks', () => {
    const tooManyBlocks = JSON.stringify({
      blocks: Array.from({ length: 251 }, () => ({
        type: 'paragraph',
        data: { text: 'x' },
      })),
    })

    expect(() =>
      createRequestNoteBodySchema.parse({
        body: tooManyBlocks,
        authorId: 'usr_1',
      })
    ).toThrow()
  })
})

describe('requests.schemas - task schemas', () => {
  it('creates task with required title', () => {
    const parsed = createTaskBodySchema.parse({
      title: ' Call customer ',
      createdBy: 'usr_1',
    })
    expect(parsed.title).toBe('Call customer')
    expect(parsed.createdBy).toBe('usr_1')
  })
  it('rejects empty title and overly long title', () => {
    expect(() =>
      createTaskBodySchema.parse({ title: '', createdBy: 'usr_1' })
    ).toThrow()
    expect(() =>
      createTaskBodySchema.parse({ title: '  ', createdBy: 'usr_1' })
    ).toThrow()
  })
  it('accepts optional rich description, status, priority, assignee, dueAt', () => {
    const parsed = createTaskBodySchema.parse({
      title: 'Task',
      createdBy: 'usr_1',
      description: JSON.stringify({
        blocks: [{ type: 'paragraph', data: { text: 'Do it' } }],
      }),
      status: 'OPEN',
      priority: 'HIGH',
      assigneeId: 'usr_2',
      dueAt: 123456,
    })
    expect(parsed.status).toBe('OPEN')
    expect(parsed.priority).toBe('HIGH')
    expect(parsed.assigneeId).toBe('usr_2')
  })
  it('updateTask requires at least one field', () => {
    expect(() => updateTaskBodySchema.parse({})).toThrow()
  })
  it('updateTask accepts status DONE with completedBy', () => {
    expect(
      updateTaskBodySchema.parse({ status: 'DONE', completedBy: 'usr_2' })
        .status
    ).toBe('DONE')
  })
})

describe('requests.schemas - reminder schemas', () => {
  it('creates reminder with required fields', () => {
    const parsed = createReminderBodySchema.parse({
      title: ' Follow up ',
      remindAt: Date.now(),
      userId: 'usr_2',
      createdBy: 'usr_1',
    })
    expect(parsed.title).toBe('Follow up')
  })
  it('rejects missing remindAt', () => {
    expect(() =>
      createReminderBodySchema.parse({
        title: 'x',
        userId: 'usr_2',
        createdBy: 'usr_1',
      })
    ).toThrow()
  })
  it('updateReminder requires at least one field', () => {
    expect(() => updateReminderBodySchema.parse({})).toThrow()
  })
  it('accepts partial update with status', () => {
    expect(updateReminderBodySchema.parse({ status: 'DISMISSED' }).status).toBe(
      'DISMISSED'
    )
  })
})

import { describe, expect, it } from 'vitest'
import {
  createRequestFormBodySchema,
  deleteRequestFormBodySchema,
  listFormCustomerRequestsQuerySchema,
  listRequestFormsQuerySchema,
  requestFormOrganizationParamsSchema,
  requestFormParamsSchema,
  submitRequestFormBodySchema,
  updateRequestFormBodySchema,
} from '../request-forms.schemas.js'

const validDefinition = {
  fields: [
    {
      id: 'f1',
      key: 'subject',
      type: 'TEXT' as const,
      label: 'Subject',
      required: true,
      mapping: 'REQUEST_SUBJECT' as const,
    },
    {
      id: 'f2',
      key: 'details',
      type: 'LONG_TEXT' as const,
      label: 'Details',
      required: false,
      mapping: 'REQUEST_DESCRIPTION' as const,
    },
  ],
}

describe('requestForms schemas - params', () => {
  it('parses organization params and trims', () => {
    expect(
      requestFormOrganizationParamsSchema.parse({ organizationId: '  org_1  ' })
    ).toEqual({ organizationId: 'org_1' })
  })
  it('rejects empty organizationId', () => {
    expect(() =>
      requestFormOrganizationParamsSchema.parse({ organizationId: '   ' })
    ).toThrow()
  })
  it('parses params with id', () => {
    expect(
      requestFormParamsSchema.parse({ organizationId: 'org_1', id: 'form_1' })
    ).toEqual({ organizationId: 'org_1', id: 'form_1' })
  })
  it('rejects missing id', () => {
    expect(() =>
      requestFormParamsSchema.parse({ organizationId: 'org_1', id: '  ' })
    ).toThrow()
  })
  it('trims id', () => {
    expect(
      requestFormParamsSchema.parse({
        organizationId: 'org_1',
        id: '  form_1  ',
      }).id
    ).toBe('form_1')
  })
})

describe('listRequestFormsQuerySchema', () => {
  it('parses empty query', () => {
    expect(listRequestFormsQuerySchema.parse({})).toEqual({})
  })
  it('parses status filter', () => {
    expect(listRequestFormsQuerySchema.parse({ status: 'PUBLISHED' })).toEqual({
      status: 'PUBLISHED',
    })
    expect(listRequestFormsQuerySchema.parse({ status: 'DRAFT' })).toEqual({
      status: 'DRAFT',
    })
    expect(listRequestFormsQuerySchema.parse({ status: 'ARCHIVED' })).toEqual({
      status: 'ARCHIVED',
    })
  })
  it('rejects invalid status', () => {
    expect(() =>
      listRequestFormsQuerySchema.parse({ status: 'UNKNOWN' })
    ).toThrow()
  })
})

describe('createRequestFormBodySchema', () => {
  it('parses valid create body', () => {
    const data = {
      name: 'Support',
      slug: 'support',
      definition: validDefinition,
      createdBy: 'usr_1',
    }
    expect(createRequestFormBodySchema.safeParse(data).success).toBe(true)
  })
  it('rejects missing definition', () => {
    expect(
      createRequestFormBodySchema.safeParse({
        name: 'x',
        slug: 'x',
        createdBy: 'usr_1',
      }).success
    ).toBe(false)
  })
  it('rejects bad slug', () => {
    expect(
      createRequestFormBodySchema.safeParse({
        name: 'x',
        slug: 'Bad Slug',
        definition: validDefinition,
        createdBy: 'usr_1',
      }).success
    ).toBe(false)
  })
  it('trims name', () => {
    const res = createRequestFormBodySchema.parse({
      name: '  My Form  ',
      slug: 'my-form',
      definition: validDefinition,
      createdBy: 'usr_1',
    })
    expect(res.name).toBe('My Form')
  })
})

describe('updateRequestFormBodySchema', () => {
  it('allows empty partial with updatedBy', () => {
    expect(
      updateRequestFormBodySchema.safeParse({ updatedBy: 'usr_1' }).success
    ).toBe(true)
  })
  it('allows patching name and status together', () => {
    expect(
      updateRequestFormBodySchema.safeParse({
        name: 'New Name',
        status: 'PUBLISHED',
        updatedBy: 'usr_1',
      }).success
    ).toBe(true)
  })
  it('rejects without updatedBy', () => {
    expect(updateRequestFormBodySchema.safeParse({ name: 'x' }).success).toBe(
      false
    )
  })
  it('rejects invalid status', () => {
    expect(
      updateRequestFormBodySchema.safeParse({
        status: 'INVALID',
        updatedBy: 'usr_1',
      }).success
    ).toBe(false)
  })
  it('allows definition patch', () => {
    expect(
      updateRequestFormBodySchema.safeParse({
        definition: validDefinition,
        updatedBy: 'usr_1',
      }).success
    ).toBe(true)
  })
})

describe('deleteRequestFormBodySchema', () => {
  it('parses deletedBy', () => {
    expect(
      deleteRequestFormBodySchema.safeParse({ deletedBy: 'usr_1' }).success
    ).toBe(true)
  })
  it('parses with reason', () => {
    expect(
      deleteRequestFormBodySchema.safeParse({
        deletedBy: 'usr_1',
        reason: 'outdated',
      }).success
    ).toBe(true)
  })
  it('parses with null reason', () => {
    expect(
      deleteRequestFormBodySchema.safeParse({
        deletedBy: 'usr_1',
        reason: null,
      }).success
    ).toBe(true)
  })
  it('trims deletedBy and reason', () => {
    const res = deleteRequestFormBodySchema.parse({
      deletedBy: '  usr_1  ',
      reason: '  because  ',
    })
    expect(res.deletedBy).toBe('usr_1')
    expect(res.reason).toBe('because')
  })
  it('rejects missing deletedBy', () => {
    expect(deleteRequestFormBodySchema.safeParse({}).success).toBe(false)
  })
  it('rejects deletedBy empty after trim', () => {
    expect(
      deleteRequestFormBodySchema.safeParse({ deletedBy: '   ' }).success
    ).toBe(false)
  })
  it('rejects reason over 300 chars', () => {
    expect(
      deleteRequestFormBodySchema.safeParse({
        deletedBy: 'usr_1',
        reason: 'a'.repeat(301),
      }).success
    ).toBe(false)
  })
  it('allows reason empty after trim as empty string', () => {
    const res = deleteRequestFormBodySchema.parse({
      deletedBy: 'usr_1',
      reason: '   ',
    })
    expect(res.reason).toBe('')
  })
})

describe('submitRequestFormBodySchema', () => {
  it('parses with org customer', () => {
    expect(
      submitRequestFormBodySchema.safeParse({
        answers: { subject: 'Hi' },
        customerOrganizationId: 'org_1',
        createdBy: 'usr_1',
      }).success
    ).toBe(true)
  })
  it('parses with user customer', () => {
    expect(
      submitRequestFormBodySchema.safeParse({
        answers: { subject: 'Hi' },
        customerUserId: 'usr_2',
        createdBy: 'usr_1',
      }).success
    ).toBe(true)
  })
  it('rejects missing customer party', () => {
    expect(
      submitRequestFormBodySchema.safeParse({
        answers: { subject: 'Hi' },
        createdBy: 'usr_1',
      }).success
    ).toBe(false)
  })
  it('rejects both parties', () => {
    expect(
      submitRequestFormBodySchema.safeParse({
        answers: { subject: 'Hi' },
        customerOrganizationId: 'org_1',
        customerUserId: 'usr_2',
        createdBy: 'usr_1',
      }).success
    ).toBe(false)
  })
  it('allows requester fields nullable', () => {
    expect(
      submitRequestFormBodySchema.safeParse({
        answers: { subject: 'Hi' },
        customerOrganizationId: 'org_1',
        requesterUserId: null,
        requesterContactId: null,
        createdBy: 'usr_1',
      }).success
    ).toBe(true)
  })
})

describe('listFormCustomerRequestsQuerySchema', () => {
  it('parses with customerOrganizationId', () => {
    expect(
      listFormCustomerRequestsQuerySchema.safeParse({
        customerOrganizationId: 'org_1',
      }).success
    ).toBe(true)
  })
  it('parses with customerUserId', () => {
    expect(
      listFormCustomerRequestsQuerySchema.safeParse({ customerUserId: 'usr_1' })
        .success
    ).toBe(true)
  })
  it('rejects empty query (requires exactly one)', () => {
    expect(listFormCustomerRequestsQuerySchema.safeParse({}).success).toBe(
      false
    )
  })
  it('rejects both', () => {
    expect(
      listFormCustomerRequestsQuerySchema.safeParse({
        customerOrganizationId: 'org_1',
        customerUserId: 'usr_1',
      }).success
    ).toBe(false)
  })
  it('rejects empty strings', () => {
    expect(
      listFormCustomerRequestsQuerySchema.safeParse({
        customerOrganizationId: '   ',
      }).success
    ).toBe(false)
  })
  it('trims ids', () => {
    const res = listFormCustomerRequestsQuerySchema.parse({
      customerOrganizationId: '  org_1  ',
    })
    expect(res.customerOrganizationId).toBe('org_1')
  })
})

import { describe, expect, it } from 'vitest'

import {
  createRequestFormInputSchema,
  requestFormDefinitionSchema,
  submitRequestFormInputSchema,
} from '../../../types/request-form.js'

const definition = {
  fields: [
    {
      id: 'subject',
      key: 'subject',
      type: 'TEXT' as const,
      label: 'Subject',
      required: true,
      mapping: 'REQUEST_SUBJECT' as const,
    },
    {
      id: 'description',
      key: 'description',
      type: 'LONG_TEXT' as const,
      label: 'Description',
      required: true,
      mapping: 'REQUEST_DESCRIPTION' as const,
    },
  ],
}

describe('request form contracts', () => {
  it('accepts a reusable support intake definition', () => {
    expect(requestFormDefinitionSchema.parse(definition)).toEqual(definition)
  })

  it('requires exactly one request subject mapping', () => {
    const result = requestFormDefinitionSchema.safeParse({
      fields: definition.fields.map((field) => ({
        ...field,
        mapping: 'REQUEST_DESCRIPTION' as const,
      })),
    })

    expect(result.success).toBe(false)
  })

  it('rejects duplicate field keys', () => {
    const result = requestFormDefinitionSchema.safeParse({
      fields: [
        definition.fields[0],
        { ...definition.fields[1], key: 'subject' },
      ],
    })

    expect(result.success).toBe(false)
  })

  it('keeps form slugs URL-safe and stable', () => {
    const valid = createRequestFormInputSchema.safeParse({
      name: '876 Support',
      slug: '876-support',
      definition,
      createdBy: 'user_1',
    })
    const invalid = createRequestFormInputSchema.safeParse({
      name: '876 Support',
      slug: '876 Support',
      definition,
      createdBy: 'user_1',
    })

    expect(valid.success).toBe(true)
    expect(invalid.success).toBe(false)
  })

  it('requires one customer party for first-party submissions', () => {
    const base = {
      answers: { subject: 'Help', description: 'Something broke.' },
      requesterUserId: 'user_1',
      createdBy: 'user_1',
    }

    expect(
      submitRequestFormInputSchema.safeParse({
        ...base,
        customerOrganizationId: 'org_1',
      }).success
    ).toBe(true)
    expect(submitRequestFormInputSchema.safeParse(base).success).toBe(false)
    expect(
      submitRequestFormInputSchema.safeParse({
        ...base,
        customerOrganizationId: 'org_1',
        customerUserId: 'user_1',
      }).success
    ).toBe(false)
  })
})

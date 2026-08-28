import { describe, expect, it } from 'vitest'

import {
  createRequestFormInputSchema,
  requestFormDefinitionSchema,
  requestFormFieldSchema,
  submitRequestFormInputSchema,
  updateRequestFormInputSchema,
} from './request-form.js'

function definition(...fields: unknown[]) {
  return { fields }
}

function textField(overrides: Record<string, unknown> = {}) {
  return {
    id: 'field_subject',
    key: 'subject',
    type: 'TEXT' as const,
    label: 'Subject',
    required: true,
    mapping: 'REQUEST_SUBJECT' as const,
    ...overrides,
  }
}

function longTextField(overrides: Record<string, unknown> = {}) {
  return {
    id: 'field_description',
    key: 'description',
    type: 'LONG_TEXT' as const,
    label: 'Description',
    required: false,
    mapping: 'REQUEST_DESCRIPTION' as const,
    ...overrides,
  }
}

function selectField(overrides: Record<string, unknown> = {}) {
  return {
    id: 'field_topic',
    key: 'topic',
    type: 'SELECT' as const,
    label: 'Topic',
    required: true,
    options: [
      { id: 'opt_billing', label: 'Billing', value: 'billing' },
      { id: 'opt_tech', label: 'Tech', value: 'tech' },
    ],
    ...overrides,
  }
}

function validDefinition() {
  return definition(textField(), longTextField())
}

describe('requestFormFieldSchema', () => {
  it.each([
    { id: 'text', key: 'text', label: 'Text', required: true, type: 'TEXT' },
    {
      id: 'long',
      key: 'long',
      label: 'Long',
      required: false,
      type: 'LONG_TEXT',
    },
    {
      id: 'email',
      key: 'email',
      label: 'Email',
      required: true,
      type: 'EMAIL',
    },
    {
      id: 'phone',
      key: 'phone',
      label: 'Phone',
      required: false,
      type: 'PHONE',
    },
    {
      id: 'date',
      key: 'date',
      label: 'Date',
      required: false,
      type: 'DATE',
    },
    {
      id: 'number',
      key: 'number',
      label: 'Number',
      required: false,
      type: 'NUMBER',
    },
    {
      id: 'check',
      key: 'check',
      label: 'Check',
      required: false,
      type: 'CHECKBOX',
    },
  ])('parses $type fields', (field) => {
    expect(requestFormFieldSchema.safeParse(field).success).toBe(true)
  })

  it('parses SELECT and MULTI_SELECT fields', () => {
    expect(requestFormFieldSchema.safeParse(selectField()).success).toBe(true)
    expect(
      requestFormFieldSchema.safeParse({
        id: 'f',
        key: 'tags',
        type: 'MULTI_SELECT',
        label: 'Tags',
        required: false,
        options: [{ id: 'o1', label: 'A', value: 'a' }],
      }).success
    ).toBe(true)
  })

  it('requires instruction fields to be non-required', () => {
    const base = {
      id: 'info',
      key: 'info',
      type: 'INSTRUCTIONS',
      label: 'Info',
      text: 'Read me',
    }
    expect(
      requestFormFieldSchema.safeParse({ ...base, required: false }).success
    ).toBe(true)
    expect(
      requestFormFieldSchema.safeParse({ ...base, required: true }).success
    ).toBe(false)
  })

  it('enforces field key, label, id, and select-option bounds', () => {
    expect(
      requestFormFieldSchema.safeParse({ ...textField(), key: 'Bad-Key' }).success
    ).toBe(false)
    expect(
      requestFormFieldSchema.safeParse({
        ...textField(),
        label: 'a'.repeat(161),
      }).success
    ).toBe(false)
    expect(
      requestFormFieldSchema.safeParse({ ...textField(), id: 'a'.repeat(81) })
        .success
    ).toBe(false)
    expect(
      requestFormFieldSchema.safeParse({ ...selectField(), options: [] }).success
    ).toBe(false)
  })
})

describe('requestFormDefinitionSchema', () => {
  it('accepts a valid subject + description definition', () => {
    expect(requestFormDefinitionSchema.safeParse(validDefinition()).success).toBe(
      true
    )
  })

  it('requires at least one field and at most fifty', () => {
    expect(requestFormDefinitionSchema.safeParse({ fields: [] }).success).toBe(
      false
    )
    const fields = Array.from({ length: 51 }, (_, i) => ({
      id: `f${i}`,
      key: `k${i}`,
      type: 'TEXT' as const,
      label: `Field ${i}`,
      required: false,
      ...(i === 0 ? { mapping: 'REQUEST_SUBJECT' as const } : {}),
    }))
    expect(requestFormDefinitionSchema.safeParse({ fields }).success).toBe(false)
  })

  it('rejects duplicate ids and keys', () => {
    expect(
      requestFormDefinitionSchema.safeParse({
        fields: [
          { ...textField(), id: 'dup' },
          { ...longTextField(), id: 'dup' },
        ],
      }).success
    ).toBe(false)
    expect(
      requestFormDefinitionSchema.safeParse({
        fields: [textField(), { ...longTextField(), key: 'subject' }],
      }).success
    ).toBe(false)
  })

  it('requires exactly one request subject mapping', () => {
    expect(
      requestFormDefinitionSchema.safeParse({
        fields: [
          {
            id: 'f1',
            key: 'a',
            type: 'TEXT',
            label: 'A',
            required: true,
          },
        ],
      }).success
    ).toBe(false)
    expect(
      requestFormDefinitionSchema.safeParse({
        fields: [
          textField(),
          { ...longTextField(), mapping: 'REQUEST_SUBJECT' },
        ],
      }).success
    ).toBe(false)
  })

  it('allows zero or one description mapping, but not two', () => {
    expect(
      requestFormDefinitionSchema.safeParse({ fields: [textField()] }).success
    ).toBe(true)
    expect(
      requestFormDefinitionSchema.safeParse({
        fields: [
          textField(),
          longTextField(),
          {
            id: 'f3',
            key: 'extra',
            type: 'TEXT',
            label: 'Extra',
            required: false,
            mapping: 'REQUEST_DESCRIPTION',
          },
        ],
      }).success
    ).toBe(false)
  })

  it('rejects duplicate option values in one field', () => {
    expect(
      requestFormDefinitionSchema.safeParse({
        fields: [
          textField(),
          selectField({
            options: [
              { id: 'o1', label: 'A', value: 'dup' },
              { id: 'o2', label: 'B', value: 'dup' },
            ],
          }),
        ],
      }).success
    ).toBe(false)
  })
})

describe('createRequestFormInputSchema', () => {
  it('accepts minimal input and trims name/slug', () => {
    const parsed = createRequestFormInputSchema.parse({
      name: '  Support Intake  ',
      slug: '  support-intake  ',
      definition: validDefinition(),
      createdBy: 'usr_1',
    })
    expect(parsed.name).toBe('Support Intake')
    expect(parsed.slug).toBe('support-intake')
  })

  it('accepts nullable routing defaults using defaultPriorityId', () => {
    const parsed = createRequestFormInputSchema.parse({
      name: 'Form',
      slug: 'form',
      definition: validDefinition(),
      description: null,
      defaultCategoryId: null,
      defaultSubcategoryId: null,
      defaultTeamId: null,
      defaultPriorityId: 'crm_pri_high',
      confirmationTitle: 'Done',
      confirmationMessage: 'Thanks',
      createdBy: 'usr_1',
    })
    expect(parsed.defaultPriorityId).toBe('crm_pri_high')
  })

  it('rejects the removed defaultPriority enum field', () => {
    expect(
      createRequestFormInputSchema.safeParse({
        name: 'Form',
        slug: 'form',
        definition: validDefinition(),
        defaultPriority: 'HIGH',
        createdBy: 'usr_1',
      }).success
    ).toBe(false)
  })

  it('rejects invalid slugs and empty names', () => {
    for (const slug of ['Bad Slug', 'UPPER', 'bad-']) {
      expect(
        createRequestFormInputSchema.safeParse({
          name: 'Form',
          slug,
          definition: validDefinition(),
          createdBy: 'usr_1',
        }).success
      ).toBe(false)
    }
    expect(
      createRequestFormInputSchema.safeParse({
        name: '   ',
        slug: 'form',
        definition: validDefinition(),
        createdBy: 'usr_1',
      }).success
    ).toBe(false)
  })

  it('enforces description/confirmation bounds and definition validity', () => {
    expect(
      createRequestFormInputSchema.safeParse({
        name: 'Form',
        slug: 'form',
        definition: validDefinition(),
        description: 'a'.repeat(1001),
        createdBy: 'usr_1',
      }).success
    ).toBe(false)
    expect(
      createRequestFormInputSchema.safeParse({
        name: 'Form',
        slug: 'form',
        definition: validDefinition(),
        confirmationMessage: 'a'.repeat(1001),
        createdBy: 'usr_1',
      }).success
    ).toBe(false)
    expect(
      createRequestFormInputSchema.safeParse({
        name: 'Form',
        slug: 'form',
        definition: definition({
          id: 'f1',
          key: 'a',
          type: 'TEXT',
          label: 'A',
          required: true,
        }),
        createdBy: 'usr_1',
      }).success
    ).toBe(false)
  })
})

describe('updateRequestFormInputSchema', () => {
  it('allows PATCH semantics with only updatedBy', () => {
    expect(
      updateRequestFormInputSchema.safeParse({ updatedBy: 'usr_1' }).success
    ).toBe(true)
  })

  it('accepts status, definition, and priority-id updates', () => {
    expect(
      updateRequestFormInputSchema.safeParse({
        status: 'PUBLISHED',
        definition: validDefinition(),
        defaultPriorityId: 'crm_pri_critical',
        updatedBy: 'usr_1',
      }).success
    ).toBe(true)
  })

  it('requires updatedBy and rejects invalid slugs', () => {
    expect(
      updateRequestFormInputSchema.safeParse({ name: 'New' }).success
    ).toBe(false)
    expect(
      updateRequestFormInputSchema.safeParse({
        slug: 'Bad Slug',
        updatedBy: 'usr_1',
      }).success
    ).toBe(false)
  })
})

describe('submitRequestFormInputSchema', () => {
  it('accepts exactly one customer identity', () => {
    expect(
      submitRequestFormInputSchema.safeParse({
        answers: { subject: 'Hi' },
        customerOrganizationId: 'org_1',
        createdBy: 'usr_1',
      }).success
    ).toBe(true)
    expect(
      submitRequestFormInputSchema.safeParse({
        answers: { subject: 'Hi' },
        customerUserId: 'usr_2',
        createdBy: 'usr_1',
      }).success
    ).toBe(true)
    expect(
      submitRequestFormInputSchema.safeParse({
        answers: { subject: 'Hi' },
        createdBy: 'usr_1',
      }).success
    ).toBe(false)
    expect(
      submitRequestFormInputSchema.safeParse({
        answers: { subject: 'Hi' },
        customerOrganizationId: 'org_1',
        customerUserId: 'usr_2',
        createdBy: 'usr_1',
      }).success
    ).toBe(false)
  })

  it('accepts nullable requester identities and trims customer ids', () => {
    const parsed = submitRequestFormInputSchema.parse({
      answers: { subject: 'Hi' },
      customerOrganizationId: '  org_1  ',
      requesterUserId: null,
      requesterContactId: null,
      createdBy: 'usr_1',
    })
    expect(parsed.customerOrganizationId).toBe('org_1')
  })
})

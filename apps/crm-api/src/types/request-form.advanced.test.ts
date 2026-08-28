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

describe('requestFormFieldSchema - each type', () => {
  it('parses TEXT with placeholder', () => {
    expect(
      requestFormFieldSchema.safeParse({
        ...textField(),
        type: 'TEXT',
        placeholder: 'Enter',
      }).success
    ).toBe(true)
  })
  it('parses LONG_TEXT', () => {
    expect(
      requestFormFieldSchema.safeParse({
        ...longTextField(),
        type: 'LONG_TEXT',
      }).success
    ).toBe(true)
  })
  it('parses EMAIL with placeholder', () => {
    const f = {
      id: 'f',
      key: 'email',
      type: 'EMAIL' as const,
      label: 'Email',
      required: true,
    }
    expect(requestFormFieldSchema.safeParse(f).success).toBe(true)
  })
  it('parses PHONE', () => {
    const f = {
      id: 'f',
      key: 'phone',
      type: 'PHONE' as const,
      label: 'Phone',
      required: false,
    }
    expect(requestFormFieldSchema.safeParse(f).success).toBe(true)
  })
  it('parses DATE', () => {
    const f = {
      id: 'f',
      key: 'date',
      type: 'DATE' as const,
      label: 'Date',
      required: false,
    }
    expect(requestFormFieldSchema.safeParse(f).success).toBe(true)
  })
  it('parses NUMBER', () => {
    const f = {
      id: 'f',
      key: 'count',
      type: 'NUMBER' as const,
      label: 'Count',
      required: false,
    }
    expect(requestFormFieldSchema.safeParse(f).success).toBe(true)
  })
  it('parses SELECT', () => {
    expect(requestFormFieldSchema.safeParse(selectField()).success).toBe(true)
  })
  it('parses MULTI_SELECT', () => {
    expect(
      requestFormFieldSchema.safeParse({
        id: 'f',
        key: 'tags',
        type: 'MULTI_SELECT' as const,
        label: 'Tags',
        required: false,
        options: [{ id: 'o1', label: 'A', value: 'a' }],
      }).success
    ).toBe(true)
  })
  it('parses CHECKBOX', () => {
    expect(
      requestFormFieldSchema.safeParse({
        id: 'f',
        key: 'agree',
        type: 'CHECKBOX' as const,
        label: 'Agree',
        required: true,
      }).success
    ).toBe(true)
  })
  it('parses INSTRUCTIONS with text and required false', () => {
    expect(
      requestFormFieldSchema.safeParse({
        id: 'info',
        key: 'info',
        type: 'INSTRUCTIONS' as const,
        label: 'Info',
        text: 'Read me',
        required: false,
      }).success
    ).toBe(true)
  })
  it('rejects invalid key pattern', () => {
    const f = { ...textField(), key: 'Bad-Key' }
    expect(requestFormFieldSchema.safeParse(f).success).toBe(false)
  })
  it('rejects label too long', () => {
    const f = { ...textField(), label: 'a'.repeat(161) }
    expect(requestFormFieldSchema.safeParse(f).success).toBe(false)
  })
  it('rejects SELECT with zero options (min 1)', () => {
    const f = { ...selectField(), options: [] }
    expect(requestFormFieldSchema.safeParse(f).success).toBe(false)
  })
  it('rejects field id too long', () => {
    const f = { ...textField(), id: 'a'.repeat(81) }
    expect(requestFormFieldSchema.safeParse(f).success).toBe(false)
  })
})

describe('requestFormDefinitionSchema - structure validation', () => {
  it('accepts minimal valid definition with subject mapping', () => {
    expect(
      requestFormDefinitionSchema.safeParse(validDefinition()).success
    ).toBe(true)
  })
  it('rejects empty fields array (min 1)', () => {
    expect(requestFormDefinitionSchema.safeParse({ fields: [] }).success).toBe(
      false
    )
  })
  it('rejects more than 50 fields', () => {
    const fields = Array.from({ length: 51 }, (_, i) => ({
      id: `f${i}`,
      key: `k${i}`,
      type: 'TEXT' as const,
      label: `Field ${i}`,
      required: false,
      ...(i === 0 ? { mapping: 'REQUEST_SUBJECT' as const } : {}),
    }))
    expect(requestFormDefinitionSchema.safeParse({ fields }).success).toBe(
      false
    )
  })
  it('rejects duplicate field ids', () => {
    const dup = { ...textField(), id: 'dup' }
    const other = { ...longTextField(), id: 'dup' }
    expect(
      requestFormDefinitionSchema.safeParse({ fields: [dup, other] }).success
    ).toBe(false)
  })
  it('rejects duplicate field keys', () => {
    const a = textField()
    const b = { ...longTextField(), key: 'subject' }
    expect(
      requestFormDefinitionSchema.safeParse({ fields: [a, b] }).success
    ).toBe(false)
  })
  it('rejects zero REQUEST_SUBJECT mappings', () => {
    const a = {
      id: 'f1',
      key: 'a',
      type: 'TEXT' as const,
      label: 'A',
      required: true,
      mapping: 'REQUEST_DESCRIPTION' as const,
    }
    const b = {
      id: 'f2',
      key: 'b',
      type: 'TEXT' as const,
      label: 'B',
      required: true,
    }
    expect(
      requestFormDefinitionSchema.safeParse({ fields: [a, b] }).success
    ).toBe(false)
  })
  it('rejects two REQUEST_SUBJECT mappings', () => {
    const a = textField()
    const b = { ...longTextField(), mapping: 'REQUEST_SUBJECT' as const }
    expect(
      requestFormDefinitionSchema.safeParse({ fields: [a, b] }).success
    ).toBe(false)
  })
  it('rejects duplicate REQUEST_DESCRIPTION mappings', () => {
    const a = textField()
    const b = longTextField()
    const c = {
      id: 'f3',
      key: 'extra',
      type: 'TEXT' as const,
      label: 'Extra',
      required: false,
      mapping: 'REQUEST_DESCRIPTION' as const,
    }
    expect(
      requestFormDefinitionSchema.safeParse({ fields: [a, b, c] }).success
    ).toBe(false)
  })
  it('allows zero REQUEST_DESCRIPTION mappings', () => {
    expect(
      requestFormDefinitionSchema.safeParse({ fields: [textField()] }).success
    ).toBe(true)
  })
  it('rejects duplicate option values within same SELECT', () => {
    const f = {
      id: 'f',
      key: 'topic',
      type: 'SELECT' as const,
      label: 'Topic',
      required: true,
      options: [
        { id: 'o1', label: 'A', value: 'dupe' },
        { id: 'o2', label: 'B', value: 'dupe' },
      ],
    }
    expect(
      requestFormDefinitionSchema.safeParse({ fields: [textField(), f] })
        .success
    ).toBe(false)
  })
  it('allows same option value across different fields', () => {
    const f1 = {
      id: 'f1',
      key: 'topic',
      type: 'SELECT' as const,
      label: 'Topic',
      required: true,
      options: [{ id: 'o1', label: 'A', value: 'x' }],
      mapping: 'REQUEST_SUBJECT' as const,
    }
    const f2 = {
      id: 'f2',
      key: 'other',
      type: 'SELECT' as const,
      label: 'Other',
      required: false,
      options: [{ id: 'o2', label: 'A', value: 'x' }],
    }
    expect(
      requestFormDefinitionSchema.safeParse({ fields: [f1, f2] }).success
    ).toBe(true)
  })
  it('includes INSTRUCTIONS fields in count but not in mapping checks', () => {
    const info = {
      id: 'info',
      key: 'info',
      type: 'INSTRUCTIONS' as const,
      label: 'Info',
      text: 'Hello',
      required: false as const,
    }
    expect(
      requestFormDefinitionSchema.safeParse({ fields: [textField(), info] })
        .success
    ).toBe(true)
  })
  it('accepts 50 fields boundary', () => {
    const fields = Array.from({ length: 50 }, (_, i) => ({
      id: `f${i}`,
      key: `k${i}`,
      type: 'TEXT' as const,
      label: `L ${i}`,
      required: false,
      ...(i === 0 ? { mapping: 'REQUEST_SUBJECT' as const } : {}),
    }))
    expect(requestFormDefinitionSchema.safeParse({ fields }).success).toBe(true)
  })
})

describe('createRequestFormInputSchema', () => {
  it('accepts minimal valid create input', () => {
    expect(
      createRequestFormInputSchema.safeParse({
        name: 'Support Intake',
        slug: 'support-intake',
        definition: validDefinition(),
        createdBy: 'usr_1',
      }).success
    ).toBe(true)
  })
  it('accepts nullable optionals', () => {
    expect(
      createRequestFormInputSchema.safeParse({
        name: 'Form',
        slug: 'form',
        definition: validDefinition(),
        description: null,
        defaultCategoryId: null,
        defaultPriority: 'HIGH',
        confirmationTitle: 'Done',
        confirmationMessage: 'Thanks',
        createdBy: 'usr_1',
      }).success
    ).toBe(true)
  })
  it('rejects slug with spaces or caps', () => {
    expect(
      createRequestFormInputSchema.safeParse({
        name: 'x',
        slug: 'Bad Slug',
        definition: validDefinition(),
        createdBy: 'usr_1',
      }).success
    ).toBe(false)
    expect(
      createRequestFormInputSchema.safeParse({
        name: 'x',
        slug: 'UPPER',
        definition: validDefinition(),
        createdBy: 'usr_1',
      }).success
    ).toBe(false)
  })
  it('rejects slug with trailing dash', () => {
    expect(
      createRequestFormInputSchema.safeParse({
        name: 'x',
        slug: 'bad-',
        definition: validDefinition(),
        createdBy: 'usr_1',
      }).success
    ).toBe(false)
  })
  it('rejects name empty after trim', () => {
    expect(
      createRequestFormInputSchema.safeParse({
        name: '   ',
        slug: 'form',
        definition: validDefinition(),
        createdBy: 'usr_1',
      }).success
    ).toBe(false)
  })
  it('rejects description over 1000', () => {
    expect(
      createRequestFormInputSchema.safeParse({
        name: 'x',
        slug: 'form',
        definition: validDefinition(),
        description: 'a'.repeat(1001),
        createdBy: 'usr_1',
      }).success
    ).toBe(false)
  })
  it('rejects confirmationMessage over 1000', () => {
    expect(
      createRequestFormInputSchema.safeParse({
        name: 'x',
        slug: 'form',
        definition: validDefinition(),
        confirmationMessage: 'a'.repeat(1001),
        createdBy: 'usr_1',
      }).success
    ).toBe(false)
  })
  it('trims name and slug', () => {
    const res = createRequestFormInputSchema.safeParse({
      name: '  My Form  ',
      slug: '  my-form  ',
      definition: validDefinition(),
      createdBy: 'usr_1',
    })
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.name).toBe('My Form')
      expect(res.data.slug).toBe('my-form')
    }
  })
  it('rejects definition without subject', () => {
    const bad = definition({
      id: 'f1',
      key: 'a',
      type: 'TEXT' as const,
      label: 'A',
      required: true,
    })
    expect(
      createRequestFormInputSchema.safeParse({
        name: 'x',
        slug: 'form',
        definition: bad,
        createdBy: 'usr_1',
      }).success
    ).toBe(false)
  })
})

describe('updateRequestFormInputSchema', () => {
  it('allows partial update with only updatedBy', () => {
    expect(
      updateRequestFormInputSchema.safeParse({ updatedBy: 'usr_1' }).success
    ).toBe(true)
  })
  it('allows status transition to PUBLISHED', () => {
    expect(
      updateRequestFormInputSchema.safeParse({
        status: 'PUBLISHED',
        updatedBy: 'usr_1',
      }).success
    ).toBe(true)
  })
  it('allows status ARCHIVED', () => {
    expect(
      updateRequestFormInputSchema.safeParse({
        status: 'ARCHIVED',
        updatedBy: 'usr_1',
      }).success
    ).toBe(true)
  })
  it('rejects without updatedBy', () => {
    expect(
      updateRequestFormInputSchema.safeParse({ name: 'New' }).success
    ).toBe(false)
  })
  it('allows updating definition alone', () => {
    expect(
      updateRequestFormInputSchema.safeParse({
        definition: validDefinition(),
        updatedBy: 'usr_1',
      }).success
    ).toBe(true)
  })
  it('rejects invalid slug on update', () => {
    expect(
      updateRequestFormInputSchema.safeParse({
        slug: 'Bad Slug',
        updatedBy: 'usr_1',
      }).success
    ).toBe(false)
  })
})

describe('submitRequestFormInputSchema', () => {
  it('accepts customerOrganizationId', () => {
    expect(
      submitRequestFormInputSchema.safeParse({
        answers: { subject: 'Hi' },
        customerOrganizationId: 'org_1',
        createdBy: 'usr_1',
      }).success
    ).toBe(true)
  })
  it('accepts customerUserId', () => {
    expect(
      submitRequestFormInputSchema.safeParse({
        answers: { subject: 'Hi' },
        customerUserId: 'usr_2',
        createdBy: 'usr_1',
      }).success
    ).toBe(true)
  })
  it('rejects when both customerOrganizationId and customerUserId missing', () => {
    expect(
      submitRequestFormInputSchema.safeParse({
        answers: { subject: 'Hi' },
        createdBy: 'usr_1',
      }).success
    ).toBe(false)
  })
  it('rejects when both customerOrganizationId and customerUserId provided', () => {
    expect(
      submitRequestFormInputSchema.safeParse({
        answers: { subject: 'Hi' },
        customerOrganizationId: 'org_1',
        customerUserId: 'usr_2',
        createdBy: 'usr_1',
      }).success
    ).toBe(false)
  })
  it('accepts nullable requesterUserId and requesterContactId', () => {
    expect(
      submitRequestFormInputSchema.safeParse({
        answers: { subject: 'Hi' },
        customerOrganizationId: 'org_1',
        requesterUserId: null,
        requesterContactId: null,
        createdBy: 'usr_1',
      }).success
    ).toBe(true)
  })
  it('trims customer ids', () => {
    const res = submitRequestFormInputSchema.safeParse({
      answers: { subject: 'Hi' },
      customerOrganizationId: '  org_1  ',
      createdBy: 'usr_1',
    })
    expect(res.success).toBe(true)
    if (res.success) expect(res.data.customerOrganizationId).toBe('org_1')
  })
  it('rejects empty answers with whitespace party still fails xor', () => {
    // empty object as answers is allowed by schema (record), but xor still fails if no customer
    expect(
      submitRequestFormInputSchema.safeParse({
        answers: {},
        customerOrganizationId: '   ',
        createdBy: 'usr_1',
      }).success
    ).toBe(false)
  })
})

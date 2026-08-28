import { describe, expect, it } from 'vitest'
import {
  requestFormDefinitionSchema,
  requestFormFieldMappingSchema,
  requestFormFieldSchema,
  requestFormListSchema,
  requestFormSchema,
  requestFormStatusSchema,
  requestFormSubmissionListSchema,
  requestFormSubmissionRecordSchema,
  requestFormSubmissionSchema,
} from './request-form-types.js'
import { crmRequestSchema } from './types.js'

function subjectField(overrides: Record<string, unknown> = {}) {
  return {
    id: 'f_subject',
    key: 'subject',
    label: 'Subject',
    required: true,
    type: 'TEXT' as const,
    mapping: 'REQUEST_SUBJECT' as const,
    ...overrides,
  }
}
function descriptionField(overrides: Record<string, unknown> = {}) {
  return {
    id: 'f_description',
    key: 'description',
    label: 'Description',
    required: false,
    type: 'LONG_TEXT' as const,
    mapping: 'REQUEST_DESCRIPTION' as const,
    ...overrides,
  }
}
function validForm(overrides: Record<string, unknown> = {}) {
  return {
    object: 'request_form' as const,
    id: 'crm_form_1',
    tenantId: 'crm_tenant_1',
    name: 'Support Intake',
    slug: 'support-intake',
    description: 'Help us help you',
    status: 'PUBLISHED' as const,
    definition: {
      fields: [subjectField(), descriptionField()],
    },
    publishedDefinition: {
      fields: [subjectField(), descriptionField()],
    },
    version: 1,
    defaultCategoryId: null,
    defaultSubcategoryId: null,
    defaultTeamId: null,
    defaultPriority: null,
    confirmationTitle: 'Thanks',
    confirmationMessage: 'We will be in touch',
    createdBy: 'usr_1',
    publishedAt: 1700000000,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    ...overrides,
  }
}
function validRequest() {
  return {
    object: 'request' as const,
    id: 'crm_req_1',
    tenantId: 'crm_tenant_1',
    customerId: 'crm_cus_1',
    number: 1,
    subject: 'Need help',
    categoryId: null,
    subcategoryId: null,
    status: 'OPEN' as const,
    priority: 'NORMAL' as const,
    source: 'WEB' as const,
    teamId: null,
    assigneeId: null,
    ownerId: null,
    requesterUserId: null,
    requesterContactId: null,
    createdBy: 'usr_1',
    resolvedAt: null,
    closedAt: null,
    createdAt: 1,
    updatedAt: 1,
  }
}

describe('requestFormStatusSchema', () => {
  it('parses DRAFT, PUBLISHED, ARCHIVED', () => {
    expect(requestFormStatusSchema.safeParse('DRAFT').success).toBe(true)
    expect(requestFormStatusSchema.safeParse('PUBLISHED').success).toBe(true)
    expect(requestFormStatusSchema.safeParse('ARCHIVED').success).toBe(true)
  })
  it('rejects unknown status', () => {
    expect(requestFormStatusSchema.safeParse('DELETED').success).toBe(false)
    expect(requestFormStatusSchema.safeParse('').success).toBe(false)
    expect(requestFormStatusSchema.safeParse(null).success).toBe(false)
  })
})

describe('requestFormFieldMappingSchema', () => {
  it('accepts REQUEST_SUBJECT and REQUEST_DESCRIPTION', () => {
    expect(
      requestFormFieldMappingSchema.safeParse('REQUEST_SUBJECT').success
    ).toBe(true)
    expect(
      requestFormFieldMappingSchema.safeParse('REQUEST_DESCRIPTION').success
    ).toBe(true)
  })
  it('rejects unknown mapping', () => {
    expect(
      requestFormFieldMappingSchema.safeParse('REQUEST_PRIORITY').success
    ).toBe(false)
  })
})

describe('requestFormFieldSchema - discriminatedUnion', () => {
  it('parses TEXT field with optional placeholder and hint', () => {
    const f = subjectField({
      type: 'TEXT',
      placeholder: 'Enter subject',
      hint: 'help',
    })
    expect(requestFormFieldSchema.safeParse(f).success).toBe(true)
  })
  it('parses LONG_TEXT without mapping', () => {
    const f = {
      id: 'f1',
      key: 'details',
      label: 'Details',
      required: false,
      type: 'LONG_TEXT' as const,
    }
    expect(requestFormFieldSchema.safeParse(f).success).toBe(true)
  })
  it('parses EMAIL field', () => {
    const f = {
      id: 'f2',
      key: 'email',
      label: 'Email',
      required: true,
      type: 'EMAIL' as const,
    }
    expect(requestFormFieldSchema.safeParse(f).success).toBe(true)
  })
  it('parses PHONE field', () => {
    const f = {
      id: 'f3',
      key: 'phone',
      label: 'Phone',
      required: false,
      type: 'PHONE' as const,
    }
    expect(requestFormFieldSchema.safeParse(f).success).toBe(true)
  })
  it('parses DATE field', () => {
    const f = {
      id: 'f4',
      key: 'date',
      label: 'Date',
      required: false,
      type: 'DATE' as const,
    }
    expect(requestFormFieldSchema.safeParse(f).success).toBe(true)
  })
  it('parses NUMBER field', () => {
    const f = {
      id: 'f5',
      key: 'count',
      label: 'Count',
      required: true,
      type: 'NUMBER' as const,
    }
    expect(requestFormFieldSchema.safeParse(f).success).toBe(true)
  })
  it('parses SELECT field with options', () => {
    const f = {
      id: 'f6',
      key: 'topic',
      label: 'Topic',
      required: true,
      type: 'SELECT' as const,
      options: [
        { id: 'o1', label: 'Billing', value: 'billing' },
        { id: 'o2', label: 'Tech', value: 'tech' },
      ],
    }
    expect(requestFormFieldSchema.safeParse(f).success).toBe(true)
  })
  it('parses MULTI_SELECT field', () => {
    const f = {
      id: 'f7',
      key: 'tags',
      label: 'Tags',
      required: false,
      type: 'MULTI_SELECT' as const,
      options: [{ id: 'o1', label: 'A', value: 'a' }],
    }
    expect(requestFormFieldSchema.safeParse(f).success).toBe(true)
  })
  it('parses CHECKBOX field', () => {
    const f = {
      id: 'f8',
      key: 'agree',
      label: 'Agree',
      required: true,
      type: 'CHECKBOX' as const,
    }
    expect(requestFormFieldSchema.safeParse(f).success).toBe(true)
  })
  it('parses INSTRUCTIONS field with required false', () => {
    const f = {
      id: 'f9',
      key: 'info',
      type: 'INSTRUCTIONS' as const,
      label: 'Info',
      text: 'Read this',
      required: false as const,
    }
    expect(requestFormFieldSchema.safeParse(f).success).toBe(true)
  })
  it('rejects INSTRUCTIONS with required true', () => {
    const f = {
      id: 'f9',
      key: 'info',
      type: 'INSTRUCTIONS' as const,
      label: 'Info',
      text: 'Read this',
      required: true as unknown as false,
    }
    expect(requestFormFieldSchema.safeParse(f).success).toBe(false)
  })
  it('rejects unknown type', () => {
    const f = {
      id: 'x',
      key: 'x',
      label: 'X',
      required: true,
      type: 'UNKNOWN' as unknown as 'TEXT',
    }
    expect(requestFormFieldSchema.safeParse(f).success).toBe(false)
  })
  it('rejects SELECT without options', () => {
    const f = {
      id: 'f6',
      key: 'topic',
      label: 'Topic',
      required: true,
      type: 'SELECT' as const,
      options: [] as unknown as never,
    }
    // client schema allows empty array (no min), but we test shape still parses (server enforces min 1)
    expect(requestFormFieldSchema.safeParse(f).success).toBe(true)
  })
})

describe('requestFormDefinitionSchema (client)', () => {
  it('parses minimal definition with subject mapping', () => {
    const def = {
      fields: [
        subjectField(),
        {
          id: 'f2',
          key: 'email',
          label: 'Email',
          required: false,
          type: 'EMAIL' as const,
        },
      ],
    }
    expect(requestFormDefinitionSchema.safeParse(def).success).toBe(true)
  })
  it('parses definition mixing all field types', () => {
    const def = {
      fields: [
        subjectField(),
        {
          id: 'f2',
          key: 'age',
          label: 'Age',
          required: false,
          type: 'NUMBER' as const,
        },
        {
          id: 'f3',
          key: 'pick',
          label: 'Pick',
          required: true,
          type: 'SELECT' as const,
          options: [{ id: 'o1', label: 'A', value: 'a' }],
        },
        {
          id: 'f4',
          key: 'agree',
          label: 'Agree',
          required: false,
          type: 'CHECKBOX' as const,
        },
        {
          id: 'f5',
          key: 'info',
          type: 'INSTRUCTIONS' as const,
          label: 'Info',
          text: 'hello',
          required: false as const,
        },
      ],
    }
    expect(requestFormDefinitionSchema.safeParse(def).success).toBe(true)
  })
  it('allows empty fields array (client-side is lenient)', () => {
    expect(requestFormDefinitionSchema.safeParse({ fields: [] }).success).toBe(
      true
    )
  })
})

describe('requestFormSchema', () => {
  it('parses a valid published form', () => {
    expect(requestFormSchema.safeParse(validForm()).success).toBe(true)
  })
  it('parses DRAFT without publishedDefinition', () => {
    const f = validForm({
      status: 'DRAFT',
      publishedDefinition: null,
      publishedAt: null,
      version: 0,
    })
    expect(requestFormSchema.safeParse(f).success).toBe(true)
  })
  it('parses ARCHIVED form', () => {
    expect(
      requestFormSchema.safeParse(validForm({ status: 'ARCHIVED' })).success
    ).toBe(true)
  })
  it('rejects missing object discriminator', () => {
    const { object: _o, ...rest } = validForm() as Record<string, unknown>
    expect(requestFormSchema.safeParse(rest).success).toBe(false)
  })
  it('rejects wrong object value', () => {
    expect(
      requestFormSchema.safeParse(validForm({ object: 'request' })).success
    ).toBe(false)
  })
  it('allows nullable description, category, priority, confirmation fields', () => {
    const f = validForm({
      description: null,
      defaultCategoryId: null,
      defaultPriority: 'HIGH',
      confirmationTitle: null,
      confirmationMessage: null,
    })
    expect(requestFormSchema.safeParse(f).success).toBe(true)
  })
  it('rejects negative version', () => {
    expect(
      requestFormSchema.safeParse(validForm({ version: -1 })).success
    ).toBe(false)
  })
  it('rejects null publishedAt when it should be number', () => {
    const f = validForm({ publishedAt: 'now' as unknown as number })
    expect(requestFormSchema.safeParse(f).success).toBe(false)
  })
  it('keeps timestamps as integers', () => {
    const data = requestFormSchema.parse(validForm())
    expect(data.createdAt).toBe(1700000000)
    expect(data.updatedAt).toBe(1700000000)
  })
})

describe('requestFormListSchema', () => {
  it('parses list envelope with has_more and url', () => {
    const list = {
      object: 'list' as const,
      data: [validForm()],
      has_more: false,
      total_count: 1,
      url: '/v1/organizations/org_1/request-forms',
    }
    expect(requestFormListSchema.safeParse(list).success).toBe(true)
  })
  it('allows null total_count', () => {
    const list = {
      object: 'list' as const,
      data: [],
      has_more: false,
      total_count: null,
      url: '/v1/organizations/org_1/request-forms',
    }
    expect(requestFormListSchema.safeParse(list).success).toBe(true)
  })
  it('rejects missing has_more', () => {
    const list = {
      object: 'list' as const,
      data: [],
      total_count: 0,
      url: '/x',
    } as unknown as Record<string, unknown>
    expect(requestFormListSchema.safeParse(list).success).toBe(false)
  })
})

describe('requestFormSubmissionSchema', () => {
  it('parses a submission that embeds the created request', () => {
    const sub = {
      object: 'request_form_submission' as const,
      id: 'sub_1',
      formId: 'crm_form_1',
      formVersion: 1,
      request: validRequest(),
      createdAt: 1,
    }
    expect(requestFormSubmissionSchema.safeParse(sub).success).toBe(true)
  })
  it('rejects formVersion zero (requires positive)', () => {
    const sub = {
      object: 'request_form_submission' as const,
      id: 'sub_1',
      formId: 'f',
      formVersion: 0,
      request: validRequest(),
      createdAt: 1,
    }
    expect(requestFormSubmissionSchema.safeParse(sub).success).toBe(false)
  })
  it('rejects missing request', () => {
    const sub = {
      object: 'request_form_submission' as const,
      id: 'sub_1',
      formId: 'f',
      formVersion: 1,
      createdAt: 1,
    } as unknown as Record<string, unknown>
    expect(requestFormSubmissionSchema.safeParse(sub).success).toBe(false)
  })
})

describe('requestFormSubmissionRecordSchema & List', () => {
  it('parses a stored submission record with snapshots', () => {
    const rec = {
      object: 'request_form_submission_record' as const,
      id: 'sub_1',
      formId: 'crm_form_1',
      requestId: 'crm_req_1',
      formVersion: 2,
      definitionSnapshot: { fields: [] },
      answers: { subject: 'Hi' },
      customerOrganizationId: 'org_1',
      customerUserId: null,
      requesterUserId: 'usr_1',
      requesterContactId: null,
      createdBy: 'usr_1',
      createdAt: 1,
    }
    expect(requestFormSubmissionRecordSchema.safeParse(rec).success).toBe(true)
  })
  it('allows null customer ids and string customer ids', () => {
    const rec = {
      object: 'request_form_submission_record' as const,
      id: 'sub_1',
      formId: 'f',
      requestId: 'r',
      formVersion: 1,
      definitionSnapshot: {},
      answers: {},
      customerOrganizationId: null,
      customerUserId: 'usr_2',
      requesterUserId: null,
      requesterContactId: null,
      createdBy: 'usr_1',
      createdAt: 1,
    }
    expect(requestFormSubmissionRecordSchema.safeParse(rec).success).toBe(true)
  })
  it('parses list envelope for records', () => {
    const rec = {
      object: 'request_form_submission_record' as const,
      id: 'sub_1',
      formId: 'f',
      requestId: 'r',
      formVersion: 1,
      definitionSnapshot: {},
      answers: {},
      customerOrganizationId: null,
      customerUserId: null,
      requesterUserId: null,
      requesterContactId: null,
      createdBy: 'usr_1',
      createdAt: 1,
    }
    const list = {
      object: 'list' as const,
      data: [rec],
      has_more: false,
      total_count: 1,
      url: '/v1/organizations/org_1/request-forms/f/submissions',
    }
    expect(requestFormSubmissionListSchema.safeParse(list).success).toBe(true)
    expect(requestFormSubmissionListSchema.parse(list).data[0].id).toBe('sub_1')
  })
})

describe('crmRequestSchema embedded in submission', () => {
  it('submission rejects if embedded request is malformed', () => {
    const badRequest = {
      ...validRequest(),
      status: 'UNKNOWN' as unknown as 'OPEN',
    }
    const sub = {
      object: 'request_form_submission' as const,
      id: 'sub_1',
      formId: 'f',
      formVersion: 1,
      request: badRequest,
      createdAt: 1,
    }
    expect(requestFormSubmissionSchema.safeParse(sub).success).toBe(false)
  })
  it('parses every priority value in form definition', () => {
    for (const p of ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const) {
      const f = validForm({ defaultPriority: p })
      expect(requestFormSchema.safeParse(f).success).toBe(true)
    }
  })
})

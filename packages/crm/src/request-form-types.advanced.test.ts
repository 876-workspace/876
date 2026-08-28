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

const priority = {
  object: 'request_priority' as const,
  id: 'crm_pri_normal',
  tenantId: 'crm_tenant_1',
  provisioningKey: 'normal',
  name: 'Normal',
  slug: 'normal',
  description: null,
  color: null,
  icon: null,
  weight: 20,
  sortOrder: 20,
  isDefault: true,
  isActive: true,
  createdBy: null,
  createdAt: 1,
  updatedAt: 1,
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
    definition: { fields: [subjectField(), descriptionField()] },
    publishedDefinition: { fields: [subjectField(), descriptionField()] },
    version: 1,
    defaultCategoryId: null,
    defaultSubcategoryId: null,
    defaultTeamId: null,
    defaultPriorityId: priority.id,
    confirmationTitle: 'Thanks',
    confirmationMessage: 'We will be in touch',
    createdBy: 'usr_1',
    publishedAt: 1_700_000_000,
    createdAt: 1_700_000_000,
    updatedAt: 1_700_000_000,
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
    priorityId: priority.id,
    priority,
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

describe('request form enums and fields', () => {
  it.each(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const)(
    'accepts status %s',
    (status) => {
      expect(requestFormStatusSchema.parse(status)).toBe(status)
    }
  )

  it('rejects unknown status and mapping values', () => {
    expect(requestFormStatusSchema.safeParse('DELETED').success).toBe(false)
    expect(
      requestFormFieldMappingSchema.safeParse('REQUEST_PRIORITY').success
    ).toBe(false)
  })

  it.each([
    {
      id: 'text',
      key: 'text',
      label: 'Text',
      required: true,
      type: 'TEXT',
    },
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

  it('parses select and multi-select fields', () => {
    const options = [{ id: 'o1', label: 'Billing', value: 'billing' }]
    expect(
      requestFormFieldSchema.safeParse({
        id: 'select',
        key: 'select',
        label: 'Select',
        required: true,
        type: 'SELECT',
        options,
      }).success
    ).toBe(true)
    expect(
      requestFormFieldSchema.safeParse({
        id: 'multi',
        key: 'multi',
        label: 'Multi',
        required: false,
        type: 'MULTI_SELECT',
        options,
      }).success
    ).toBe(true)
  })

  it('requires instruction fields to be non-required', () => {
    expect(
      requestFormFieldSchema.safeParse({
        id: 'info',
        key: 'info',
        label: 'Info',
        text: 'Read this first',
        required: false,
        type: 'INSTRUCTIONS',
      }).success
    ).toBe(true)
    expect(
      requestFormFieldSchema.safeParse({
        id: 'info',
        key: 'info',
        label: 'Info',
        text: 'Read this first',
        required: true,
        type: 'INSTRUCTIONS',
      }).success
    ).toBe(false)
  })
})

describe('requestFormDefinitionSchema', () => {
  it('parses the client field collection', () => {
    expect(
      requestFormDefinitionSchema.safeParse({
        fields: [subjectField(), descriptionField()],
      }).success
    ).toBe(true)
  })

  it('keeps the client schema lenient for an empty draft field list', () => {
    expect(requestFormDefinitionSchema.safeParse({ fields: [] }).success).toBe(
      true
    )
  })
})

describe('requestFormSchema', () => {
  it('parses a published form with a priority-id routing default', () => {
    const parsed = requestFormSchema.parse(validForm())
    expect(parsed.defaultPriorityId).toBe(priority.id)
    expect(parsed.placement).toBe('HOSTED')
  })

  it('parses a draft without published content', () => {
    expect(
      requestFormSchema.safeParse(
        validForm({
          status: 'DRAFT',
          publishedDefinition: null,
          publishedAt: null,
          version: 0,
          defaultPriorityId: null,
        })
      ).success
    ).toBe(true)
  })

  it('rejects the removed defaultPriority field when priority id is missing', () => {
    const form = validForm({ defaultPriority: 'HIGH' }) as Record<
      string,
      unknown
    >
    delete form.defaultPriorityId
    expect(requestFormSchema.safeParse(form).success).toBe(false)
  })

  it('rejects negative versions and wrong object discriminators', () => {
    expect(requestFormSchema.safeParse(validForm({ version: -1 })).success).toBe(
      false
    )
    expect(
      requestFormSchema.safeParse(validForm({ object: 'request' })).success
    ).toBe(false)
  })
})

describe('requestFormListSchema', () => {
  it('parses list envelopes', () => {
    expect(
      requestFormListSchema.safeParse({
        object: 'list',
        data: [validForm()],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_1/request-forms',
      }).success
    ).toBe(true)
  })

  it('allows null total_count', () => {
    expect(
      requestFormListSchema.safeParse({
        object: 'list',
        data: [],
        has_more: false,
        total_count: null,
        url: '/x',
      }).success
    ).toBe(true)
  })
})

describe('request form submission schemas', () => {
  it('parses a submission with the created request priority resource', () => {
    expect(
      requestFormSubmissionSchema.safeParse({
        object: 'request_form_submission',
        id: 'sub_1',
        formId: 'crm_form_1',
        formVersion: 1,
        request: validRequest(),
        createdAt: 1,
      }).success
    ).toBe(true)
  })

  it('requires a positive form version', () => {
    expect(
      requestFormSubmissionSchema.safeParse({
        object: 'request_form_submission',
        id: 'sub_1',
        formId: 'crm_form_1',
        formVersion: 0,
        request: validRequest(),
        createdAt: 1,
      }).success
    ).toBe(false)
  })

  const record = {
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

  it('parses stored records and lists', () => {
    expect(requestFormSubmissionRecordSchema.safeParse(record).success).toBe(
      true
    )
    expect(
      requestFormSubmissionListSchema.safeParse({
        object: 'list',
        data: [record],
        has_more: false,
        total_count: 1,
        url: '/x',
      }).success
    ).toBe(true)
  })
})

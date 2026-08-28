import { crmError } from '../../http/errors.js'
import type {
  CreateRequestFormInput,
  RequestFormAnswers,
  RequestFormDefinition,
  RequestFormField,
  RequestFormFieldMapping,
  RequestFormStatus,
  SubmitRequestFormInput,
  UpdateRequestFormInput,
} from '../../types/request-form.js'
import { requestFormDefinitionSchema } from '../../types/request-form.js'
import * as customers from '../customers/index.js'
import * as requests from '../requests/index.js'
import * as tenants from '../tenants/tenants.service.js'
import * as repository from './request-forms.repository.js'

async function requireTenant(organizationId: string) {
  const tenant = await tenants.retrieveByOrganization(organizationId)
  if (!tenant) throw crmError('crm/tenant-not-found')
  if (tenant.status !== 'ACTIVE') throw crmError('crm/tenant-inactive')

  return tenant
}

// A stored definition that no longer satisfies the current schema must not take
// the whole list endpoint down with it. Read paths degrade to an empty field
// list; the write and submit paths still parse strictly.
function readDefinition(value: unknown): RequestFormDefinition | null {
  const result = requestFormDefinitionSchema.safeParse(value)
  return result.success ? result.data : null
}

function serialize(
  form: NonNullable<Awaited<ReturnType<typeof repository.retrieve>>>
) {
  return {
    object: 'request_form' as const,
    id: form.id,
    tenantId: form.tenantId,
    name: form.name,
    slug: form.slug,
    description: form.description,
    status: form.status,
    definition: readDefinition(form.definition) ?? { fields: [] },
    publishedDefinition: form.publishedDefinition
      ? readDefinition(form.publishedDefinition)
      : null,
    version: form.version,
    defaultCategoryId: form.defaultCategoryId,
    defaultSubcategoryId: form.defaultSubcategoryId,
    defaultTeamId: form.defaultTeamId,
    defaultPriority: form.defaultPriority,
    confirmationTitle: form.confirmationTitle,
    confirmationMessage: form.confirmationMessage,
    createdBy: form.createdBy,
    publishedAt: form.publishedAt
      ? Math.floor(form.publishedAt.getTime() / 1000)
      : null,
    createdAt: Math.floor(form.createdAt.getTime() / 1000),
    updatedAt: Math.floor(form.updatedAt.getTime() / 1000),
  }
}

function isEmpty(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  )
}

function invalid(): never {
  throw crmError('crm/form-invalid-submission')
}

function asText(value: unknown, max: number) {
  if (typeof value !== 'string' || value.length > max) invalid()
  return value.trim()
}

// Called only for a field that has a non-empty answer; empties are dropped by
// `validateAnswers` before it gets here.
function normalizeAnswer(field: RequestFormField, value: unknown): unknown {
  switch (field.type) {
    case 'INSTRUCTIONS':
      return undefined

    case 'TEXT':
    case 'PHONE':
      return asText(value, 2_000)

    case 'EMAIL': {
      const email = asText(value, 2_000)
      if (!/^\S+@\S+\.\S+$/.test(email)) invalid()
      return email
    }

    case 'DATE': {
      // `Date.parse` is not a calendar check: it rolls 2026-02-30 forward into
      // March rather than rejecting it. Round-trip the parts instead.
      const date = asText(value, 2_000)
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
      if (!match) invalid()

      const [year, month, day] = match.slice(1).map(Number)
      const parsed = new Date(Date.UTC(year, month - 1, day))
      if (
        parsed.getUTCFullYear() !== year ||
        parsed.getUTCMonth() !== month - 1 ||
        parsed.getUTCDate() !== day
      )
        invalid()

      return date
    }

    case 'LONG_TEXT':
      return asText(value, 20_000)

    case 'NUMBER':
      if (typeof value !== 'number' || !Number.isFinite(value)) invalid()
      return value

    case 'CHECKBOX':
      if (typeof value !== 'boolean') invalid()
      return value

    case 'SELECT': {
      const allowed = new Set(field.options.map((option) => option.value))
      if (typeof value !== 'string' || !allowed.has(value)) invalid()
      return value
    }

    case 'MULTI_SELECT': {
      const allowed = new Set(field.options.map((option) => option.value))
      if (
        !Array.isArray(value) ||
        value.some((entry) => typeof entry !== 'string' || !allowed.has(entry))
      )
        invalid()
      return [...new Set(value as string[])]
    }
  }
}

function validateAnswers(
  definition: RequestFormDefinition,
  answers: RequestFormAnswers
) {
  const fields = definition.fields.filter(
    (field) => field.type !== 'INSTRUCTIONS'
  )
  const allowedKeys = new Set(fields.map((field) => field.key))

  for (const key of Object.keys(answers)) {
    if (!allowedKeys.has(key)) invalid()
  }

  const normalized: RequestFormAnswers = {}
  for (const field of fields) {
    const value = answers[field.key]
    if (field.required && isEmpty(value)) invalid()

    if (!isEmpty(value)) normalized[field.key] = normalizeAnswer(field, value)
  }

  return normalized
}

function mappedField(
  definition: RequestFormDefinition,
  mapping: RequestFormFieldMapping
) {
  return definition.fields.find(
    (field) => 'mapping' in field && field.mapping === mapping
  )
}

function mappedText(
  definition: RequestFormDefinition,
  answers: RequestFormAnswers,
  mapping: RequestFormFieldMapping
) {
  const field = mappedField(definition, mapping)
  if (!field) return null

  const value = answers[field.key]
  return typeof value === 'string' ? value.trim() : null
}

function describeAnswers(
  definition: RequestFormDefinition,
  answers: RequestFormAnswers
) {
  const rows = definition.fields.flatMap((field) => {
    if (field.type === 'INSTRUCTIONS') return []
    if ('mapping' in field && field.mapping === 'REQUEST_SUBJECT') return []

    const value = answers[field.key]
    if (isEmpty(value)) return []
    const display = Array.isArray(value) ? value.join(', ') : String(value)

    return [`${field.label}\n${display}`]
  })

  const description = rows.join('\n\n')
  if (description.length > 20_000) invalid()

  return description || null
}

async function ensureSlugAvailable(
  tenantId: string,
  slug: string,
  currentId?: string
) {
  const existing = await repository.retrieveBySlug(tenantId, slug)
  if (existing && existing.id !== currentId)
    throw crmError('crm/form-slug-taken')
}

export async function list(organizationId: string, status?: RequestFormStatus) {
  const tenant = await requireTenant(organizationId)
  const forms = await repository.list(tenant.id, status)

  return forms.map(serialize)
}

export async function retrieve(organizationId: string, formId: string) {
  const tenant = await requireTenant(organizationId)
  const form = await repository.retrieve(tenant.id, formId)

  return form ? serialize(form) : null
}

// Routing defaults are resolved against the tenant when the form is saved. A
// form that names a deleted category would otherwise fail at submission time,
// in front of the customer filling it in.
async function assertRoutingDefaults(
  organizationId: string,
  input: {
    defaultCategoryId?: string | null
    defaultSubcategoryId?: string | null
    defaultTeamId?: string | null
  }
) {
  await requests.assertRouting(organizationId, {
    categoryId: input.defaultCategoryId ?? null,
    subcategoryId: input.defaultSubcategoryId ?? null,
    teamId: input.defaultTeamId ?? null,
  })
}

export async function create(
  organizationId: string,
  input: CreateRequestFormInput
) {
  const tenant = await requireTenant(organizationId)
  await ensureSlugAvailable(tenant.id, input.slug)
  await assertRoutingDefaults(organizationId, input)

  return serialize(await repository.create(tenant.id, input))
}

export async function update(
  organizationId: string,
  formId: string,
  input: UpdateRequestFormInput
) {
  const tenant = await requireTenant(organizationId)
  const current = await repository.retrieve(tenant.id, formId)
  if (!current) return null
  if (input.slug) await ensureSlugAvailable(tenant.id, input.slug, current.id)
  await assertRoutingDefaults(organizationId, {
    defaultCategoryId:
      input.defaultCategoryId === undefined
        ? current.defaultCategoryId
        : input.defaultCategoryId,
    defaultSubcategoryId:
      input.defaultSubcategoryId === undefined
        ? current.defaultSubcategoryId
        : input.defaultSubcategoryId,
    defaultTeamId:
      input.defaultTeamId === undefined
        ? current.defaultTeamId
        : input.defaultTeamId,
  })

  const publishing = input.status === 'PUBLISHED'
  // The definition being published is the contract every future submission is
  // validated against, so it is parsed strictly here even when it is carried
  // over unchanged from the stored draft.
  const definition = input.definition ?? readDefinition(current.definition)
  if (publishing && !definition) throw crmError('crm/form-invalid-definition')

  const updated = await repository.update(formId, {
    ...input,
    ...(definition ? { definition } : {}),
    ...(publishing && definition
      ? {
          publishedDefinition: definition,
          version: current.version + 1,
          publishedAt: new Date(),
        }
      : {}),
  })

  return serialize(updated)
}

export async function remove(
  organizationId: string,
  formId: string,
  input: { deletedBy: string; reason?: string | null }
) {
  const tenant = await requireTenant(organizationId)
  const current = await repository.retrieve(tenant.id, formId)
  if (!current) return null

  if (
    process.env.DELETION_MODE === 'hard' &&
    (await repository.submissionCount(tenant.id, formId)) > 0
  )
    throw crmError('crm/form-in-use')

  return repository.remove({ id: formId, slug: current.slug, ...input })
}

export async function submit(
  organizationId: string,
  formId: string,
  input: SubmitRequestFormInput
) {
  const tenant = await requireTenant(organizationId)
  const form = await repository.retrieve(tenant.id, formId)
  if (!form) throw crmError('crm/form-not-found')
  if (form.status !== 'PUBLISHED' || !form.publishedDefinition)
    throw crmError('crm/form-not-published')

  const definition = readDefinition(form.publishedDefinition)
  if (!definition) throw crmError('crm/form-invalid-definition')

  const answers = validateAnswers(definition, input.answers)
  const customerResult = await customers.list(organizationId, {
    ...(input.customerOrganizationId
      ? { customerOrganizationId: input.customerOrganizationId }
      : {}),
    ...(input.customerUserId ? { customerUserId: input.customerUserId } : {}),
  })
  const customer = customerResult.customers[0]
  if (!customer) throw crmError('crm/customer-not-found')

  const subject = mappedText(definition, answers, 'REQUEST_SUBJECT')
  if (!subject || subject.length > 240)
    throw crmError('crm/form-invalid-submission')

  const mappedDescription = mappedText(
    definition,
    answers,
    'REQUEST_DESCRIPTION'
  )
  const description = mappedDescription ?? describeAnswers(definition, answers)
  if (description && description.length > 20_000)
    throw crmError('crm/form-invalid-submission')

  const result = await requests.createFromIntake(
    organizationId,
    {
      customerId: customer.profile.id,
      subject,
      description,
      categoryId: form.defaultCategoryId ?? undefined,
      subcategoryId: form.defaultSubcategoryId ?? undefined,
      priority: form.defaultPriority ?? undefined,
      source: 'WEB',
      teamId: form.defaultTeamId ?? undefined,
      requesterUserId: input.requesterUserId ?? null,
      requesterContactId: input.requesterContactId ?? null,
      createdBy: input.createdBy,
    },
    {
      formId: form.id,
      formVersion: form.version,
      definitionSnapshot: definition,
      answers,
      customerOrganizationId: input.customerOrganizationId ?? null,
      customerUserId: input.customerUserId ?? null,
    }
  )

  return {
    object: 'request_form_submission' as const,
    id: result.submission.id,
    formId: form.id,
    formVersion: result.submission.formVersion,
    request: result.request,
    createdAt: Math.floor(result.submission.createdAt.getTime() / 1000),
  }
}

export async function listCustomerRequests(
  organizationId: string,
  formId: string,
  identity: {
    customerOrganizationId?: string
    customerUserId?: string
  }
) {
  const tenant = await requireTenant(organizationId)
  const form = await repository.retrieve(tenant.id, formId)
  if (!form) throw crmError('crm/form-not-found')

  const customerResult = await customers.list(organizationId, identity)
  const customer = customerResult.customers[0]
  if (!customer) return []

  return requests.list(organizationId, { customerId: customer.profile.id })
}

export async function listSubmissions(organizationId: string, formId: string) {
  const tenant = await requireTenant(organizationId)
  const form = await repository.retrieve(tenant.id, formId)
  if (!form) throw crmError('crm/form-not-found')

  const submissions = await repository.listSubmissions(tenant.id, formId)
  return submissions.map((submission) => ({
    object: 'request_form_submission_record' as const,
    id: submission.id,
    formId: submission.formId,
    requestId: submission.requestId,
    formVersion: submission.formVersion,
    definitionSnapshot: submission.definitionSnapshot,
    answers: submission.answers,
    customerOrganizationId: submission.customerOrganizationId,
    customerUserId: submission.customerUserId,
    requesterUserId: submission.requesterUserId,
    requesterContactId: submission.requesterContactId,
    createdBy: submission.createdBy,
    createdAt: Math.floor(submission.createdAt.getTime() / 1000),
  }))
}

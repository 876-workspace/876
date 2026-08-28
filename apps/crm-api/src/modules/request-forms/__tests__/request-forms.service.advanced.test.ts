import { beforeEach, describe, expect, it, vi } from 'vitest'

const { tenants, repository, customers, requests } = vi.hoisted(() => ({
  tenants: { retrieveByOrganization: vi.fn() },
  repository: {
    list: vi.fn(),
    retrieve: vi.fn(),
    retrieveBySlug: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    submissionCount: vi.fn(),
    listSubmissions: vi.fn(),
  },
  customers: { list: vi.fn() },
  requests: {
    assertRouting: vi.fn().mockResolvedValue(undefined),
    createFromIntake: vi.fn(),
    list: vi.fn(),
  },
}))

vi.mock('../../tenants/tenants.service.js', () => tenants)
vi.mock('../request-forms.repository.js', () => repository)
vi.mock('../../customers/index.js', () => customers)
vi.mock('../../requests/index.js', () => requests)

const service = await import('../request-forms.service.js')

const tenant = {
  id: 'crm_tenant_1',
  organizationId: 'org_1',
  status: 'ACTIVE' as const,
}
const definition = {
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
    {
      id: 'f3',
      key: 'email',
      type: 'EMAIL' as const,
      label: 'Email',
      required: false,
    },
    {
      id: 'f4',
      key: 'priority_pick',
      type: 'SELECT' as const,
      label: 'Priority',
      required: false,
      options: [
        { id: 'o1', label: 'Low', value: 'low' },
        { id: 'o2', label: 'High', value: 'high' },
      ],
    },
    {
      id: 'f5',
      key: 'tags',
      type: 'MULTI_SELECT' as const,
      label: 'Tags',
      required: false,
      options: [
        { id: 't1', label: 'A', value: 'a' },
        { id: 't2', label: 'B', value: 'b' },
      ],
    },
    {
      id: 'f6',
      key: 'count',
      type: 'NUMBER' as const,
      label: 'Count',
      required: false,
    },
    {
      id: 'f7',
      key: 'agree',
      type: 'CHECKBOX' as const,
      label: 'Agree',
      required: false,
    },
    {
      id: 'f8',
      key: 'phone',
      type: 'PHONE' as const,
      label: 'Phone',
      required: false,
    },
    {
      id: 'f9',
      key: 'due',
      type: 'DATE' as const,
      label: 'Due',
      required: false,
    },
    {
      id: 'info',
      key: 'info',
      type: 'INSTRUCTIONS' as const,
      label: 'Info',
      text: 'Read this',
      required: false as const,
    },
  ],
}
function formRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'crm_form_1',
    tenantId: 'crm_tenant_1',
    name: 'Support Intake',
    slug: 'support-intake',
    description: null,
    status: 'PUBLISHED' as const,
    definition,
    publishedDefinition: definition,
    version: 1,
    defaultCategoryId: null,
    defaultSubcategoryId: null,
    defaultTeamId: null,
    defaultPriority: null,
    confirmationTitle: null,
    confirmationMessage: null,
    createdBy: 'usr_1',
    publishedAt: new Date('2026-08-26T18:00:00.000Z'),
    createdAt: new Date('2026-08-26T18:00:00.000Z'),
    updatedAt: new Date('2026-08-26T18:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  }
}
const customerProfile = { id: 'crm_cus_1', tenantId: 'crm_tenant_1' }

/** The normalized answers recorded on the most recent intake submission. */
function lastAnswers(): Record<string, unknown> {
  const intake = requests.createFromIntake.mock.calls.at(-1)?.[2] as {
    answers: Record<string, unknown>
  }
  return intake.answers
}

beforeEach(() => {
  vi.clearAllMocks()
  tenants.retrieveByOrganization.mockResolvedValue(tenant)
  repository.list.mockResolvedValue([formRow()])
  repository.retrieve.mockResolvedValue(formRow())
  repository.retrieveBySlug.mockResolvedValue(null)
  repository.create.mockImplementation(async (_tid: string, input: unknown) =>
    formRow(input as Record<string, unknown>)
  )
  repository.update.mockImplementation(async (id: string, input: unknown) =>
    formRow({
      id,
      ...(input as Record<string, unknown>),
      version: 2,
      publishedAt: new Date(),
    })
  )
  repository.remove.mockResolvedValue({
    object: 'request_form' as const,
    id: 'crm_form_1',
    deleted: true as const,
  })
  repository.submissionCount.mockResolvedValue(0)
  repository.listSubmissions.mockResolvedValue([])
  customers.list.mockResolvedValue({
    customers: [{ profile: customerProfile }],
  })
  requests.createFromIntake.mockResolvedValue({
    request: {
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
    },
    submission: {
      id: 'sub_1',
      formId: 'crm_form_1',
      formVersion: 1,
      createdAt: new Date('2026-08-26T18:00:00.000Z'),
    },
  })
  requests.list.mockResolvedValue([{ object: 'request', id: 'crm_req_1' }])
})

describe('request-forms.service - tenant guards', () => {
  it('throws tenant-not-found when no tenant for org', async () => {
    tenants.retrieveByOrganization.mockResolvedValue(null)
    await expect(service.list('org_missing')).rejects.toMatchObject({
      code: 'crm/tenant-not-found',
    })
    await expect(
      service.retrieve('org_missing', 'form_1')
    ).rejects.toMatchObject({ code: 'crm/tenant-not-found' })
    await expect(
      service.create('org_missing', {
        name: 'x',
        slug: 'x',
        definition,
        createdBy: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/tenant-not-found' })
  })
  it('throws tenant-inactive when tenant not ACTIVE', async () => {
    tenants.retrieveByOrganization.mockResolvedValue({
      ...tenant,
      status: 'SUSPENDED',
    })
    await expect(service.list('org_1')).rejects.toMatchObject({
      code: 'crm/tenant-inactive',
    })
  })
  it('serializes timestamps as unix seconds', async () => {
    const res = await service.list('org_1')
    expect(res[0].createdAt).toBe(
      Math.floor(new Date('2026-08-26T18:00:00.000Z').getTime() / 1000)
    )
    expect(res[0].publishedAt).toBe(
      Math.floor(new Date('2026-08-26T18:00:00.000Z').getTime() / 1000)
    )
  })
})

describe('request-forms.service - create', () => {
  it('throws form-slug-taken when slug exists', async () => {
    repository.retrieveBySlug.mockResolvedValue(formRow())
    await expect(
      service.create('org_1', {
        name: 'x',
        slug: 'support-intake',
        definition,
        createdBy: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/form-slug-taken' })
    expect(repository.create).not.toHaveBeenCalled()
  })
  it('creates DRAFT by default', async () => {
    const created = await service.create('org_1', {
      name: 'New',
      slug: 'new-form',
      definition,
      createdBy: 'usr_1',
    })
    expect(created.slug).toBe('new-form')
    expect(repository.create.mock.calls[0][1]).not.toHaveProperty('status')
    expect(repository.create).toHaveBeenCalledWith(
      'crm_tenant_1',
      expect.objectContaining({ slug: 'new-form' })
    )
  })
})

describe('request-forms.service - retrieve', () => {
  it('returns null when form not found', async () => {
    repository.retrieve.mockResolvedValue(null)
    expect(await service.retrieve('org_1', 'missing')).toBeNull()
  })
  it('degrades to empty fields when stored definition is stale', async () => {
    repository.retrieve.mockResolvedValue({
      ...formRow(),
      definition: { fields: [{ bad: true }] },
    })
    const res = await service.retrieve('org_1', 'crm_form_1')
    expect(res?.definition.fields).toEqual([])
  })
  it('parses publishedDefinition when present else null', async () => {
    const withPub = await service.retrieve('org_1', 'crm_form_1')
    expect(withPub?.publishedDefinition).not.toBeNull()
    repository.retrieve.mockResolvedValue({
      ...formRow(),
      publishedDefinition: null,
    })
    const withoutPub = await service.retrieve('org_1', 'crm_form_1')
    expect(withoutPub?.publishedDefinition).toBeNull()
  })
})

describe('request-forms.service - update', () => {
  it('returns null when form missing', async () => {
    repository.retrieve.mockResolvedValue(null)
    expect(
      await service.update('org_1', 'missing', { updatedBy: 'usr_1' })
    ).toBeNull()
  })
  it('throws slug-taken on update when slug belongs to another form', async () => {
    repository.retrieveBySlug.mockResolvedValue({
      ...formRow(),
      id: 'other_form',
    })
    await expect(
      service.update('org_1', 'crm_form_1', {
        slug: 'support-intake',
        updatedBy: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/form-slug-taken' })
  })
  it('allows keeping same slug', async () => {
    repository.retrieveBySlug.mockResolvedValue(formRow())
    const res = await service.update('org_1', 'crm_form_1', {
      slug: 'support-intake',
      updatedBy: 'usr_1',
    })
    expect(res).not.toBeNull()
  })
  it('publishing bumps version and sets publishedDefinition/publishedAt', async () => {
    const res = await service.update('org_1', 'crm_form_1', {
      status: 'PUBLISHED',
      updatedBy: 'usr_1',
    })
    expect(repository.update).toHaveBeenCalledWith(
      'crm_form_1',
      expect.objectContaining({
        version: 2,
        publishedDefinition: expect.anything(),
        publishedAt: expect.any(Date),
      })
    )
    expect(res?.version).toBe(2)
  })
  it('non-publishing update does not bump version', async () => {
    await service.update('org_1', 'crm_form_1', {
      name: 'Renamed',
      updatedBy: 'usr_1',
    })
    const arg = repository.update.mock.calls[0]?.[1] as Record<string, unknown>
    expect(arg.version).toBeUndefined()
    expect(arg.publishedDefinition).toBeUndefined()
  })
  it('uses existing definition when none provided on update', async () => {
    // Should parse current.definition as definition
    await service.update('org_1', 'crm_form_1', {
      name: 'Renamed',
      updatedBy: 'usr_1',
    })
    expect(repository.update).toHaveBeenCalledWith(
      'crm_form_1',
      expect.objectContaining({ definition })
    )
  })
})

describe('request-forms.service - remove', () => {
  it('returns null when form not found', async () => {
    repository.retrieve.mockResolvedValue(null)
    expect(
      await service.remove('org_1', 'missing', { deletedBy: 'usr_1' })
    ).toBeNull()
  })
  it('soft-deletes via repository.remove and archives', async () => {
    const res = await service.remove('org_1', 'crm_form_1', {
      deletedBy: 'usr_1',
      reason: 'outdated',
    })
    expect(repository.remove).toHaveBeenCalledWith({
      id: 'crm_form_1',
      slug: 'support-intake',
      deletedBy: 'usr_1',
      reason: 'outdated',
    })
    expect(res?.deleted).toBe(true)
  })
  it('hard delete guard throws form-in-use when submissions exist', async () => {
    const prev = process.env.DELETION_MODE
    process.env.DELETION_MODE = 'hard'
    repository.submissionCount.mockResolvedValue(1)
    await expect(
      service.remove('org_1', 'crm_form_1', { deletedBy: 'usr_1' })
    ).rejects.toMatchObject({ code: 'crm/form-in-use' })
    process.env.DELETION_MODE = prev
  })
  it('hard delete allows when no submissions', async () => {
    const prev = process.env.DELETION_MODE
    process.env.DELETION_MODE = 'hard'
    repository.submissionCount.mockResolvedValue(0)
    const res = await service.remove('org_1', 'crm_form_1', {
      deletedBy: 'usr_1',
    })
    expect(res?.deleted).toBe(true)
    process.env.DELETION_MODE = prev
  })
})

describe('request-forms.service - submit validation', () => {
  it('throws form-not-found when form missing', async () => {
    repository.retrieve.mockResolvedValue(null)
    await expect(
      service.submit('org_1', 'missing', {
        answers: { subject: 'Hi' },
        customerOrganizationId: 'org_2',
        createdBy: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/form-not-found' })
  })
  it('throws form-not-published when status is DRAFT', async () => {
    repository.retrieve.mockResolvedValue({
      ...formRow(),
      status: 'DRAFT',
      publishedDefinition: null,
    })
    await expect(
      service.submit('org_1', 'crm_form_1', {
        answers: { subject: 'Hi' },
        customerOrganizationId: 'org_2',
        createdBy: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/form-not-published' })
  })
  it('throws form-not-published when publishedDefinition null', async () => {
    repository.retrieve.mockResolvedValue({
      ...formRow(),
      status: 'PUBLISHED',
      publishedDefinition: null,
    })
    await expect(
      service.submit('org_1', 'crm_form_1', {
        answers: { subject: 'Hi' },
        customerOrganizationId: 'org_2',
        createdBy: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/form-not-published' })
  })
  it('throws customer-not-found when no customer matches party', async () => {
    customers.list.mockResolvedValue({ customers: [] })
    await expect(
      service.submit('org_1', 'crm_form_1', {
        answers: { subject: 'Hi' },
        customerOrganizationId: 'org_2',
        createdBy: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/customer-not-found' })
  })
  it('throws form-invalid-submission when subject empty or missing', async () => {
    await expect(
      service.submit('org_1', 'crm_form_1', {
        answers: { details: 'only details' },
        customerOrganizationId: 'org_2',
        createdBy: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/form-invalid-submission' })
    await expect(
      service.submit('org_1', 'crm_form_1', {
        answers: { subject: '' },
        customerOrganizationId: 'org_2',
        createdBy: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/form-invalid-submission' })
  })
  it('throws form-invalid-submission when subject too long (>240)', async () => {
    const long = 'a'.repeat(241)
    await expect(
      service.submit('org_1', 'crm_form_1', {
        answers: { subject: long },
        customerOrganizationId: 'org_2',
        createdBy: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/form-invalid-submission' })
  })
  it('throws form-invalid-submission for unknown answer key', async () => {
    await expect(
      service.submit('org_1', 'crm_form_1', {
        answers: { subject: 'Hi', unknown_key: 'x' },
        customerOrganizationId: 'org_2',
        createdBy: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/form-invalid-submission' })
  })
  it('throws for missing required field', async () => {
    await expect(
      service.submit('org_1', 'crm_form_1', {
        answers: {},
        customerOrganizationId: 'org_2',
        createdBy: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/form-invalid-submission' })
  })
  it('validates EMAIL format', async () => {
    await expect(
      service.submit('org_1', 'crm_form_1', {
        answers: { subject: 'Hi', email: 'not-an-email' },
        customerOrganizationId: 'org_2',
        createdBy: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/form-invalid-submission' })
    // valid email should pass (when required false it still validates format)
    await expect(
      service.submit('org_1', 'crm_form_1', {
        answers: { subject: 'Hi', email: '  a@b.com  ' },
        customerOrganizationId: 'org_2',
        createdBy: 'usr_1',
      })
    ).resolves.toBeTruthy()
    expect(lastAnswers().email).toEqual('a@b.com')
  })
  it('validates NUMBER type', async () => {
    await expect(
      service.submit('org_1', 'crm_form_1', {
        answers: { subject: 'Hi', count: 'ten' as unknown as number },
        customerOrganizationId: 'org_2',
        createdBy: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/form-invalid-submission' })
    await expect(
      service.submit('org_1', 'crm_form_1', {
        answers: { subject: 'Hi', count: NaN },
        customerOrganizationId: 'org_2',
        createdBy: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/form-invalid-submission' })
    await expect(
      service.submit('org_1', 'crm_form_1', {
        answers: { subject: 'Hi', count: 42 },
        customerOrganizationId: 'org_2',
        createdBy: 'usr_1',
      })
    ).resolves.toBeTruthy()
    expect(lastAnswers().count).toEqual(42)
  })
  it('validates CHECKBOX boolean', async () => {
    await expect(
      service.submit('org_1', 'crm_form_1', {
        answers: { subject: 'Hi', agree: 'true' as unknown as boolean },
        customerOrganizationId: 'org_2',
        createdBy: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/form-invalid-submission' })
    await expect(
      service.submit('org_1', 'crm_form_1', {
        answers: { subject: 'Hi', agree: true },
        customerOrganizationId: 'org_2',
        createdBy: 'usr_1',
      })
    ).resolves.toBeTruthy()
    expect(lastAnswers().agree).toEqual(true)
  })
  it('validates SELECT allowed value', async () => {
    await expect(
      service.submit('org_1', 'crm_form_1', {
        answers: { subject: 'Hi', priority_pick: 'unknown' },
        customerOrganizationId: 'org_2',
        createdBy: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/form-invalid-submission' })
    await expect(
      service.submit('org_1', 'crm_form_1', {
        answers: { subject: 'Hi', priority_pick: 'high' },
        customerOrganizationId: 'org_2',
        createdBy: 'usr_1',
      })
    ).resolves.toBeTruthy()
    expect(lastAnswers().priority_pick).toEqual('high')
  })
  it('validates MULTI_SELECT array and dedupes', async () => {
    await expect(
      service.submit('org_1', 'crm_form_1', {
        answers: { subject: 'Hi', tags: 'a' as unknown as string[] },
        customerOrganizationId: 'org_2',
        createdBy: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/form-invalid-submission' })
    await expect(
      service.submit('org_1', 'crm_form_1', {
        answers: { subject: 'Hi', tags: ['a', 'unknown'] },
        customerOrganizationId: 'org_2',
        createdBy: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/form-invalid-submission' })
    const res = await service.submit('org_1', 'crm_form_1', {
      answers: { subject: 'Hi', tags: ['a', 'a', 'b'] },
      customerOrganizationId: 'org_2',
      createdBy: 'usr_1',
    })
    expect(res.object).toBe('request_form_submission')
    // deduped in normalized answers sent to createFromIntake
    const intakeAnswers = requests.createFromIntake.mock.calls[0]?.[2]
      ?.answers as Record<string, unknown>
    expect(intakeAnswers?.tags).toEqual(['a', 'b'])
  })
  it('validates PHONE trims and length', async () => {
    // phone uses asText with 2000 limit, so very long should fail
    await expect(
      service.submit('org_1', 'crm_form_1', {
        answers: { subject: 'Hi', phone: 'a'.repeat(2001) },
        customerOrganizationId: 'org_2',
        createdBy: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/form-invalid-submission' })
    await expect(
      service.submit('org_1', 'crm_form_1', {
        answers: { subject: 'Hi', phone: '  +12065550100  ' },
        customerOrganizationId: 'org_2',
        createdBy: 'usr_1',
      })
    ).resolves.toBeTruthy()
    expect(lastAnswers().phone).toEqual('+12065550100')
  })
  it('validates DATE format and parsing', async () => {
    await expect(
      service.submit('org_1', 'crm_form_1', {
        answers: { subject: 'Hi', due: '26-08-2026' },
        customerOrganizationId: 'org_2',
        createdBy: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/form-invalid-submission' })
    await expect(
      service.submit('org_1', 'crm_form_1', {
        answers: { subject: 'Hi', due: '2026-02-30' },
        customerOrganizationId: 'org_2',
        createdBy: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/form-invalid-submission' })
    await expect(
      service.submit('org_1', 'crm_form_1', {
        answers: { subject: 'Hi', due: '2026-08-26' },
        customerOrganizationId: 'org_2',
        createdBy: 'usr_1',
      })
    ).resolves.toBeTruthy()
    expect(lastAnswers().due).toEqual('2026-08-26')
  })
  it('trims TEXT answers', async () => {
    await service.submit('org_1', 'crm_form_1', {
      answers: { subject: '  Hi  ' },
      customerOrganizationId: 'org_2',
      createdBy: 'usr_1',
    })
    const intake = requests.createFromIntake.mock.calls.at(-1)?.[1] as Record<
      string,
      unknown
    >
    expect(intake.subject).toBe('Hi')
  })
  it('ignores INSTRUCTIONS keys and uses mapped description when present', async () => {
    // When the mapped REQUEST_DESCRIPTION field (details) is answered, that mapped text
    // is used verbatim as the request description, not the label-row format.
    await service.submit('org_1', 'crm_form_1', {
      answers: { subject: 'Title', details: 'Body', email: 'a@b.com' },
      customerOrganizationId: 'org_2',
      createdBy: 'usr_1',
    })
    const intake = requests.createFromIntake.mock.calls.at(-1)?.[1] as Record<
      string,
      unknown
    >
    expect(intake.description).toBe('Body')
    expect(intake.description as string).not.toContain('Title')
  })
  it('uses mapped description when present, else describes other answers', async () => {
    // with details mapping present, mappedDescription should be used as description
    await service.submit('org_1', 'crm_form_1', {
      answers: { subject: 'Title', details: 'From mapping' },
      customerOrganizationId: 'org_2',
      createdBy: 'usr_1',
    })
    expect(requests.createFromIntake.mock.calls.at(-1)?.[1].description).toBe(
      'From mapping'
    )
    // without details, description is built from describeAnswers (join of label rows)
    await service.submit('org_1', 'crm_form_1', {
      answers: { subject: 'Title', email: 'a@b.com' },
      customerOrganizationId: 'org_2',
      createdBy: 'usr_1',
    })
    const desc = requests.createFromIntake.mock.calls.at(-1)?.[1]
      .description as string | null
    expect(desc).toContain('Email')
  })
  it('creates request with defaults from form', async () => {
    const rowWithDefaults = formRow({
      defaultCategoryId: 'cat_1',
      defaultSubcategoryId: 'sub_1',
      defaultTeamId: 'team_1',
      defaultPriority: 'HIGH' as const,
    })
    repository.retrieve.mockResolvedValue(rowWithDefaults)
    await service.submit('org_1', 'crm_form_1', {
      answers: { subject: 'Hi' },
      customerOrganizationId: 'org_2',
      createdBy: 'usr_1',
    })
    const intake = requests.createFromIntake.mock.calls.at(-1)?.[1] as Record<
      string,
      unknown
    >
    expect(intake.categoryId).toBe('cat_1')
    expect(intake.priority).toBe('HIGH')
    expect(intake.teamId).toBe('team_1')
  })
  it('passes requester ids and strips INSTRUCTIONS from intake answers', async () => {
    await service.submit('org_1', 'crm_form_1', {
      answers: { subject: 'Hi', details: 'x' },
      customerUserId: 'usr_99',
      requesterUserId: 'usr_2',
      requesterContactId: 'contact_1',
      createdBy: 'usr_1',
    })
    const intakeCtx = requests.createFromIntake.mock.calls.at(
      -1
    )?.[2] as Record<string, unknown>
    expect(intakeCtx.customerUserId).toBe('usr_99')
    expect(intakeCtx.customerOrganizationId).toBeNull()
    const intake = requests.createFromIntake.mock.calls.at(-1)?.[1] as Record<
      string,
      unknown
    >
    expect(intake.requesterUserId).toBe('usr_2')
    expect(intake.requesterContactId).toBe('contact_1')
  })
  it('returns submission envelope with request and unix timestamp', async () => {
    const res = await service.submit('org_1', 'crm_form_1', {
      answers: { subject: 'Title', details: 'Desc' },
      customerOrganizationId: 'org_2',
      createdBy: 'usr_1',
    })
    expect(res.object).toBe('request_form_submission')
    expect(res.formId).toBe('crm_form_1')
    expect(res.request.object).toBe('request')
    expect(typeof res.createdAt).toBe('number')
  })
})

describe('request-forms.service - listCustomerRequests', () => {
  it('throws form-not-found when form missing', async () => {
    repository.retrieve.mockResolvedValue(null)
    await expect(
      service.listCustomerRequests('org_1', 'missing', {
        customerOrganizationId: 'org_2',
      })
    ).rejects.toMatchObject({ code: 'crm/form-not-found' })
  })
  it('returns [] when customer not found', async () => {
    customers.list.mockResolvedValue({ customers: [] })
    expect(
      await service.listCustomerRequests('org_1', 'crm_form_1', {
        customerOrganizationId: 'org_99',
      })
    ).toEqual([])
    expect(requests.list).not.toHaveBeenCalled()
  })
  it('lists requests for resolved customer', async () => {
    const res = await service.listCustomerRequests('org_1', 'crm_form_1', {
      customerOrganizationId: 'org_2',
    })
    expect(requests.list).toHaveBeenCalledWith('org_1', {
      customerId: 'crm_cus_1',
    })
    expect(res).toHaveLength(1)
  })
})

describe('request-forms.service - listSubmissions', () => {
  it('throws form-not-found when missing', async () => {
    repository.retrieve.mockResolvedValue(null)
    await expect(
      service.listSubmissions('org_1', 'missing')
    ).rejects.toMatchObject({ code: 'crm/form-not-found' })
  })
  it('returns mapped submission records', async () => {
    repository.listSubmissions.mockResolvedValue([
      {
        id: 'sub_1',
        formId: 'crm_form_1',
        requestId: 'req_1',
        formVersion: 1,
        definitionSnapshot: definition,
        answers: { subject: 'Hi' },
        customerOrganizationId: 'org_2',
        customerUserId: null,
        requesterUserId: null,
        requesterContactId: null,
        createdBy: 'usr_1',
        createdAt: new Date('2026-08-26T18:00:00.000Z'),
      },
    ])
    const res = await service.listSubmissions('org_1', 'crm_form_1')
    expect(res[0].object).toBe('request_form_submission_record')
    expect(res[0].createdAt).toBe(
      Math.floor(new Date('2026-08-26T18:00:00.000Z').getTime() / 1000)
    )
  })
})

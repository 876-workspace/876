/**
 * Onboarding, driven through the real middleware chain.
 *
 * The catalog and the validator are checked exhaustively against the Python in
 * `onboarding.catalog.test.ts`; this file covers the HTTP surface and the two
 * rules that live in the service — that saving never validates, and that
 * submitting validates against the revision the answers were given under.
 */

import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  onboardingSession,
  onboardingAnswer,
  organization,
  app: appModel,
  apiKey,
  transaction,
} = vi.hoisted(() => ({
  onboardingSession: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  onboardingAnswer: { deleteMany: vi.fn(), createMany: vi.fn() },
  organization: { findUnique: vi.fn() },
  app: { findFirst: vi.fn() },
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
  transaction: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: {
    onboardingSession,
    onboardingAnswer,
    organization,
    app: appModel,
    apiKey,
    $transaction: transaction,
  },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { createApp } = await import('@/app')

const APP_KEY = '876_app_secret_kQ8vN2xLpR7wT4mB'
const ADMIN = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}
const KEY_ONLY = { 'X-876-API-Key': APP_KEY }
const NOW = 1785000000

function sessionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'obs_1',
    organizationId: 'org_5',
    targetType: 'organization',
    targetKey: 'core',
    countryCode: 'JM',
    schemaVersion: 1,
    catalogRevision: 1,
    status: 'draft',
    submittedAt: null,
    completedAt: null,
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    onboardingAnswers: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  apiKey.findUnique.mockResolvedValue({
    id: 'key_1',
    appId: 'app_4qR8',
    revoked: false,
    expiresAt: null,
  })
  apiKey.update.mockResolvedValue({})

  organization.findUnique.mockResolvedValue({ id: 'org_5' })
  appModel.findFirst.mockResolvedValue({ id: 'app_1' })

  onboardingSession.findFirst.mockResolvedValue(sessionRow())
  onboardingSession.findUnique.mockResolvedValue({ submittedAt: null })
  onboardingSession.create.mockResolvedValue(sessionRow())
  onboardingSession.update.mockResolvedValue(sessionRow())
  onboardingAnswer.deleteMany.mockResolvedValue({ count: 0 })
  onboardingAnswer.createMany.mockResolvedValue({ count: 0 })

  // Run the transaction body against the same mocked models.
  transaction.mockImplementation(
    async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ onboardingSession, onboardingAnswer })
  )
})

describe('GET /onboarding/catalog/:target_type/:target_key', () => {
  it('returns the core organization catalog', async () => {
    const response = await request(createApp())
      .get('/onboarding/catalog/organization/core')
      .set(ADMIN)

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      object: 'onboarding_catalog',
      target_type: 'organization',
      target_key: 'core',
      country_code: 'JM',
      schema_version: 1,
      catalog_revision: 1,
    })
    expect(response.body.data.sections[0].key).toBe('business_profile')
  })

  it('returns the full Jamaican legal catalog for the global target', async () => {
    const response = await request(createApp())
      .get('/onboarding/catalog/organization/global')
      .set(ADMIN)

    expect(response.status).toBe(200)
    expect(
      response.body.data.sections.map((s: { key: string }) => s.key)
    ).toEqual([
      'identity',
      'registrations',
      'registered_office',
      'contact',
      'operations',
      'leadership',
      'locations',
      'survey',
    ])
  })

  it('marks a sensitive field as sensitive', async () => {
    const response = await request(createApp())
      .get('/onboarding/catalog/organization/global')
      .set(ADMIN)

    const registrations = response.body.data.sections.find(
      (s: { key: string }) => s.key === 'registrations'
    )
    const trn = registrations.fields.find(
      (f: { key: string }) => f.key === 'trn'
    )

    expect(trn.sensitive).toBe(true)
    expect(trn.required).toBe(true)
  })

  it('returns an application catalog by slug', async () => {
    const response = await request(createApp())
      .get('/onboarding/catalog/application/876-couriers')
      .set(ADMIN)

    expect(response.status).toBe(200)
    expect(response.body.data.sections[0].key).toBe('workspace')
  })

  it('answers 404 for an unregistered application', async () => {
    const response = await request(createApp())
      .get('/onboarding/catalog/application/876-nonexistent')
      .set(ADMIN)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('onboarding/catalog-not-found')
  })

  it('answers 404 for a country with no catalog', async () => {
    const response = await request(createApp())
      .get('/onboarding/catalog/organization/global?country_code=US')
      .set(ADMIN)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('onboarding/catalog-not-found')
  })

  it('rejects a target type outside the enum', async () => {
    const response = await request(createApp())
      .get('/onboarding/catalog/spaceship/core')
      .set(ADMIN)

    expect(response.status).toBe(422)
  })

  it('refuses an app-key caller', async () => {
    const response = await request(createApp())
      .get('/onboarding/catalog/organization/core')
      .set(KEY_ONLY)

    expect(response.status).toBe(401)
  })
})

describe('POST /onboarding/catalog/:target_type/:target_key/validate', () => {
  it('reports valid for a complete core answer set', async () => {
    const response = await request(createApp())
      .post('/onboarding/catalog/organization/core/validate')
      .set(ADMIN)
      .send({ country_code: 'JM', answers: { business_category: 'retail' } })

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      object: 'onboarding_validation',
      valid: true,
      issues: [],
    })
  })

  it('reports the required issue for an empty answer set', async () => {
    const response = await request(createApp())
      .post('/onboarding/catalog/organization/core/validate')
      .set(ADMIN)
      .send({ country_code: 'JM', answers: {} })

    expect(response.status).toBe(200)
    expect(response.body.data.valid).toBe(false)
    expect(response.body.data.issues).toEqual([
      {
        path: 'answers.business_category',
        code: 'required',
        message: 'Business category is required.',
      },
    ])
  })

  it('reports an unsupported select option', async () => {
    const response = await request(createApp())
      .post('/onboarding/catalog/organization/core/validate')
      .set(ADMIN)
      .send({
        country_code: 'JM',
        answers: { business_category: 'spaceflight' },
      })

    expect(response.body.data.issues).toContainEqual({
      path: 'answers.business_category',
      code: 'invalid_option',
      message: 'Business category contains an unsupported option.',
    })
  })

  it('reports an unknown field', async () => {
    const response = await request(createApp())
      .post('/onboarding/catalog/organization/core/validate')
      .set(ADMIN)
      .send({
        country_code: 'JM',
        answers: { business_category: 'retail', surprise: 1 },
      })

    expect(response.body.data.issues).toContainEqual({
      path: 'answers.surprise',
      code: 'unknown_field',
      message: "Unknown field 'surprise'.",
    })
  })

  it('requires a conditionally required field once its condition is met', async () => {
    const response = await request(createApp())
      .post('/onboarding/catalog/organization/global/validate')
      .set(ADMIN)
      .send({ country_code: 'JM', answers: { gct_registered: true } })

    expect(response.body.data.issues).toContainEqual({
      path: 'answers.gct_number',
      code: 'required',
      message: 'GCT registration number is required.',
    })
  })

  it('does not require it when the condition is not met', async () => {
    const response = await request(createApp())
      .post('/onboarding/catalog/organization/global/validate')
      .set(ADMIN)
      .send({ country_code: 'JM', answers: { gct_registered: false } })

    const paths = response.body.data.issues.map((i: { path: string }) => i.path)
    expect(paths).not.toContain('answers.gct_number')
  })

  it('rejects a body with an unknown top-level field', async () => {
    const response = await request(createApp())
      .post('/onboarding/catalog/organization/core/validate')
      .set(ADMIN)
      .send({ country_code: 'JM', answers: {}, extra: true })

    expect(response.status).toBe(422)
  })
})

describe('GET /onboarding/organizations/:id/:type/:key', () => {
  it('returns the session', async () => {
    const response = await request(createApp())
      .get('/onboarding/organizations/org_5/organization/core')
      .set(ADMIN)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      object: 'onboarding_session',
      id: 'obs_1',
      organization_id: 'org_5',
      target_type: 'organization',
      target_key: 'core',
      country_code: 'JM',
      schema_version: 1,
      catalog_revision: 1,
      status: 'draft',
      answers: {},
      submitted_at: null,
      completed_at: null,
      created_at: NOW,
      updated_at: NOW,
    })
  })

  it('creates a draft when none exists', async () => {
    onboardingSession.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(sessionRow())

    const response = await request(createApp())
      .get('/onboarding/organizations/org_5/organization/core')
      .set(ADMIN)

    expect(response.status).toBe(200)
    expect(onboardingSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'draft', catalogRevision: 1 }),
      })
    )
  })

  it('flattens stored answers into a map', async () => {
    onboardingSession.findFirst.mockResolvedValue(
      sessionRow({
        onboardingAnswers: [
          { fieldKey: 'business_category', value: 'retail' },
          { fieldKey: 'employee_count_range', value: '2-10' },
        ],
      })
    )

    const response = await request(createApp())
      .get('/onboarding/organizations/org_5/organization/core')
      .set(ADMIN)

    expect(response.body.data.answers).toEqual({
      business_category: 'retail',
      employee_count_range: '2-10',
    })
  })

  it('answers 404 when the organization is absent', async () => {
    organization.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/onboarding/organizations/org_missing/organization/core')
      .set(ADMIN)

    expect(response.status).toBe(404)
    expect(response.body.error).toEqual({
      code: 'onboarding/organization-not-found',
      message: 'Organization not found.',
    })
  })

  it('answers 404 for an organization target that is not global or core', async () => {
    const response = await request(createApp())
      .get('/onboarding/organizations/org_5/organization/nonsense')
      .set(ADMIN)

    expect(response.status).toBe(404)
    expect(response.body.error).toEqual({
      code: 'onboarding/target-not-found',
      message:
        "The organization onboarding targets are named 'global' and 'core'.",
    })
  })

  it('answers 404 for an application target with no app row', async () => {
    appModel.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/onboarding/organizations/org_5/application/876-couriers')
      .set(ADMIN)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('onboarding/target-not-found')
  })

  it('checks the organization before the target', async () => {
    // A caller naming a missing organization should hear about that, not about
    // the target inside it.
    organization.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/onboarding/organizations/org_missing/organization/nonsense')
      .set(ADMIN)

    expect(response.body.error.code).toBe('onboarding/organization-not-found')
  })
})

describe('PUT /onboarding/organizations/:id/:type/:key', () => {
  it('saves answers without validating them', async () => {
    // A half-filled draft is the normal state of an onboarding form.
    const response = await request(createApp())
      .put('/onboarding/organizations/org_5/organization/core')
      .set(ADMIN)
      .send({ country_code: 'JM', answers: { business_category: 'nonsense' } })

    expect(response.status).toBe(200)
    expect(onboardingAnswer.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          fieldKey: 'business_category',
          value: 'nonsense',
        }),
      ],
    })
  })

  it('replaces the previous answers rather than merging them', async () => {
    await request(createApp())
      .put('/onboarding/organizations/org_5/organization/core')
      .set(ADMIN)
      .send({ country_code: 'JM', answers: { business_category: 'retail' } })

    expect(onboardingAnswer.deleteMany).toHaveBeenCalledWith({
      where: { sessionId: 'obs_1' },
    })
  })

  it('writes the delete and the inserts in one transaction', async () => {
    // Separating them would let a failure leave the session with no answers.
    await request(createApp())
      .put('/onboarding/organizations/org_5/organization/core')
      .set(ADMIN)
      .send({ country_code: 'JM', answers: { business_category: 'retail' } })

    expect(transaction).toHaveBeenCalledTimes(1)
  })

  it('keeps an already-submitted session out of draft', async () => {
    onboardingSession.findUnique.mockResolvedValue({ submittedAt: BigInt(NOW) })

    await request(createApp())
      .put('/onboarding/organizations/org_5/organization/core')
      .set(ADMIN)
      .send({ country_code: 'JM', answers: { business_category: 'retail' } })

    expect(onboardingSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'needs_update',
          completedAt: null,
        }),
      })
    )
  })

  it('returns a never-submitted session to draft', async () => {
    await request(createApp())
      .put('/onboarding/organizations/org_5/organization/core')
      .set(ADMIN)
      .send({ country_code: 'JM', answers: { business_category: 'retail' } })

    expect(onboardingSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'draft' }),
      })
    )
  })

  it('writes no answer rows for an empty answer set', async () => {
    await request(createApp())
      .put('/onboarding/organizations/org_5/organization/core')
      .set(ADMIN)
      .send({ country_code: 'JM', answers: {} })

    expect(onboardingAnswer.deleteMany).toHaveBeenCalled()
    expect(onboardingAnswer.createMany).not.toHaveBeenCalled()
  })

  it('rejects a country code that is not two characters', async () => {
    const response = await request(createApp())
      .put('/onboarding/organizations/org_5/organization/core')
      .set(ADMIN)
      .send({ country_code: 'JAM', answers: {} })

    expect(response.status).toBe(422)
    expect(transaction).not.toHaveBeenCalled()
  })
})

describe('POST /onboarding/organizations/:id/:type/:key/submit', () => {
  it('submits when the saved answers are valid', async () => {
    onboardingSession.findFirst.mockResolvedValue(
      sessionRow({
        onboardingAnswers: [{ fieldKey: 'business_category', value: 'retail' }],
      })
    )

    const response = await request(createApp())
      .post('/onboarding/organizations/org_5/organization/core/submit')
      .set(ADMIN)

    expect(response.status).toBe(200)
    expect(onboardingSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'submitted' }),
      })
    )
  })

  it('answers 422 when the saved answers fail validation', async () => {
    onboardingSession.findFirst.mockResolvedValue(sessionRow())

    const response = await request(createApp())
      .post('/onboarding/organizations/org_5/organization/core/submit')
      .set(ADMIN)

    expect(response.status).toBe(422)
    expect(response.body.error).toEqual({
      code: 'onboarding/validation-failed',
      message: 'Onboarding answers failed validation with 1 issue(s).',
    })
    expect(onboardingSession.update).not.toHaveBeenCalled()
  })

  it('answers 404 when nothing has been saved yet', async () => {
    onboardingSession.findFirst.mockResolvedValue(null)

    const response = await request(createApp())
      .post('/onboarding/organizations/org_5/organization/core/submit')
      .set(ADMIN)

    expect(response.status).toBe(404)
    expect(response.body.error).toEqual({
      code: 'onboarding/session-not-found',
      message: 'Save onboarding answers before submitting them.',
    })
  })

  it('reports an unknown target rather than "save your answers"', async () => {
    onboardingSession.findFirst.mockResolvedValue(null)
    appModel.findFirst.mockResolvedValue({ id: 'app_1' })

    const response = await request(createApp())
      .post('/onboarding/organizations/org_5/application/876-unknown/submit')
      .set(ADMIN)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('onboarding/catalog-not-found')
  })

  it('validates against the revision the answers were saved under', async () => {
    // The saved session names revision 1; submit must resolve that revision, not
    // whatever the current default happens to become.
    onboardingSession.findFirst.mockResolvedValue(
      sessionRow({
        catalogRevision: 1,
        onboardingAnswers: [{ fieldKey: 'business_category', value: 'retail' }],
      })
    )

    const response = await request(createApp())
      .post('/onboarding/organizations/org_5/organization/core/submit')
      .set(ADMIN)

    expect(response.status).toBe(200)
    expect(onboardingSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { catalogRevision: 'desc' } })
    )
  })
})

import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  repository,
  workStructureRepo,
  milestoneDetailsRepo,
  milestoneListRepo,
  projectsRepo,
  labelsRepo,
  commentsRepo,
  issuesRepo,
} = vi.hoisted(() => ({
  repository: {
    retrieveByOrganization: vi.fn(),
    retrieveById: vi.fn(),
    createWithTriageProject: vi.fn(),
  },
  // `tenants.service.ts` calls `work-structure.service.ts`'s `seedPreset` to
  // backfill a pre-Phase-2 tenant on `ensure()`. That file also imports the
  // projects and issues modules for unrelated resources, and every one of
  // those repositories connects to the DB pool at module-eval time — so each
  // must be mocked here too, or importing `tenants.service.js` throws
  // `PROJECTS_DATABASE_URL is not configured` before a single test runs.
  workStructureRepo: { seedPreset: vi.fn() },
  // Phase-2 added milestone detail/list repositories that connect to the DB
  // pool at module-eval time via `work-structure.routes.ts`. Mock them here
  // too for the same reason.
  milestoneDetailsRepo: {
    milestoneProgress: vi.fn(),
    listMilestoneComments: vi.fn(),
    retrieveMilestoneComment: vi.fn(),
    createMilestoneComment: vi.fn(),
    updateMilestoneComment: vi.fn(),
    deleteMilestoneComment: vi.fn(),
    listMilestoneEvents: vi.fn(),
    createMilestoneEvent: vi.fn(),
    listMilestoneCustomFields: vi.fn(),
    retrieveMilestoneCustomField: vi.fn(),
    retrieveMilestoneCustomFieldByKey: vi.fn(),
    createMilestoneCustomField: vi.fn(),
    updateMilestoneCustomField: vi.fn(),
    archiveMilestoneCustomField: vi.fn(),
    listMilestoneCustomFieldValues: vi.fn(),
    upsertMilestoneCustomFieldValue: vi.fn(),
    clearMilestoneCustomFieldValue: vi.fn(),
  },
  milestoneListRepo: { listOrganizationMilestones: vi.fn() },
  projectsRepo: { retrieve: vi.fn(), retrieveByKey: vi.fn() },
  labelsRepo: { retrieve: vi.fn(), retrieveByName: vi.fn(), create: vi.fn() },
  commentsRepo: {
    list: vi.fn(),
    count: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    hardDelete: vi.fn(),
  },
  issuesRepo: {
    list: vi.fn(),
    count: vi.fn(),
    retrieve: vi.fn(),
    retrieveByIdentifier: vi.fn(),
    retrieveByRef: vi.fn(),
    listEvents: vi.fn(),
    softDelete: vi.fn(),
    hardDelete: vi.fn(),
    getBatchEnrichment: vi.fn(),
    transaction: vi.fn(),
  },
}))

vi.mock('../tenants.repository.js', () => repository)
vi.mock(
  '../../work-structure/work-structure.repository.js',
  () => workStructureRepo
)
vi.mock(
  '../../work-structure/milestone-details.repository.js',
  () => milestoneDetailsRepo
)
vi.mock(
  '../../work-structure/milestone-list.repository.js',
  () => milestoneListRepo
)
vi.mock('../../projects/projects.repository.js', () => projectsRepo)
vi.mock('../../labels/labels.repository.js', () => labelsRepo)
vi.mock('../../comments/comments.repository.js', () => commentsRepo)
vi.mock('../../issues/issues.repository.js', () => issuesRepo)

const service = await import('../tenants.service.js')
const { serializeTenant } = await import('../tenants.serializers.js')
const { createTenantsRouter } = await import('../tenants.routes.js')

const existingTenantRow = {
  id: 'prjten_existing_1',
  organizationId: 'org_1',
  triageProjectId: 'prj_triage_1',
  createdAt: 1787767200n,
  updatedAt: 1787823000n,
}

const createdTenantRow = {
  id: 'prjten_created_1',
  organizationId: 'org_new',
  triageProjectId: 'prj_triage_new',
  createdAt: 1787767200n,
  updatedAt: 1787767200n,
}

async function requestJson(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const app = express()
  app.use(express.json())
  app.use('/v1/tenants', createTenantsRouter())
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No port')

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-internal-key': 'test-internal-key',
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    return {
      status: response.status,
      body: await response.json(),
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.PROJECTS_INTERNAL_KEY = 'test-internal-key'
})

describe('tenants module', () => {
  it('ensure creates a tenant and a Triage project when none exists', async () => {
    repository.retrieveByOrganization.mockResolvedValue(null)
    repository.createWithTriageProject.mockResolvedValue(createdTenantRow)

    const result = await service.ensure('org_new')

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'projects.tenant',
      id: createdTenantRow.id,
      organizationId: 'org_new',
      triageProjectId: createdTenantRow.triageProjectId,
      createdAt: 1787767200,
      updatedAt: 1787767200,
    })
    expect(repository.retrieveByOrganization).toHaveBeenCalledWith('org_new')
    expect(repository.createWithTriageProject).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_new',
        triageProjectKey: 'TRI',
        triageProjectSlug: 'triage',
        tenantId: expect.stringMatching(/^prjten_/),
        triageProjectId: expect.stringMatching(/^prj_/),
        now: expect.any(BigInt),
      })
    )
  })

  it('ensure is idempotent — an existing tenant is returned unchanged and nothing is created', async () => {
    repository.retrieveByOrganization.mockResolvedValue(existingTenantRow)

    const result = await service.ensure('org_1')

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'projects.tenant',
      id: existingTenantRow.id,
      organizationId: 'org_1',
      triageProjectId: 'prj_triage_1',
      createdAt: 1787767200,
      updatedAt: 1787823000,
    })
    expect(repository.retrieveByOrganization).toHaveBeenCalledWith('org_1')
    expect(repository.createWithTriageProject).not.toHaveBeenCalled()
  })

  it('ensure backfills the work-structure preset for a tenant provisioned before it existed', async () => {
    repository.retrieveByOrganization.mockResolvedValue(existingTenantRow)

    await service.ensure('org_1')

    expect(workStructureRepo.seedPreset).toHaveBeenCalledTimes(1)
    expect(workStructureRepo.seedPreset).toHaveBeenCalledWith(
      existingTenantRow.id,
      expect.objectContaining({ key: 'software-development' })
    )
  })

  it("ensure sets triageProjectId to the created Triage project's id", async () => {
    repository.retrieveByOrganization.mockResolvedValue(null)
    let assignedTriageId = ''
    repository.createWithTriageProject.mockImplementation(
      async (params: {
        triageProjectId: string
        tenantId: string
        organizationId: string
        now: bigint
      }) => {
        assignedTriageId = params.triageProjectId
        return {
          id: params.tenantId,
          organizationId: params.organizationId,
          triageProjectId: params.triageProjectId,
          createdAt: params.now,
          updatedAt: params.now,
        }
      }
    )

    const result = await service.ensure('org_custom_triage')

    expect(result.error).toBeNull()
    expect(result.data?.triageProjectId).toBe(assignedTriageId)
    expect(assignedTriageId).toMatch(/^prj_/)
    expect(repository.createWithTriageProject).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_custom_triage',
        triageProjectId: assignedTriageId,
      })
    )
  })

  it('retrieve returns the serialized tenant with the exact full shape', async () => {
    repository.retrieveByOrganization.mockResolvedValue(existingTenantRow)

    const result = await service.retrieveByOrganization('org_1')

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'projects.tenant',
      id: 'prjten_existing_1',
      organizationId: 'org_1',
      triageProjectId: 'prj_triage_1',
      createdAt: 1787767200,
      updatedAt: 1787823000,
    })
    expect(repository.retrieveByOrganization).toHaveBeenCalledWith('org_1')
  })

  it('retrieve returns projects/tenant-not-found (asserting the complete error object) when absent', async () => {
    repository.retrieveByOrganization.mockResolvedValue(null)

    const result = await service.retrieveByOrganization('org_unknown')

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/tenant-not-found',
      message: 'This organization does not have a 876 Projects workspace.',
      httpStatus: 404,
    })
    expect(repository.retrieveByOrganization).toHaveBeenCalledWith(
      'org_unknown'
    )
  })

  it('the serializer converts every BigInt timestamp to number', () => {
    const rawRow = {
      id: 'prjten_test_timestamps',
      organizationId: 'org_ts',
      triageProjectId: 'prj_triage_ts',
      createdAt: 1787767200n,
      updatedAt: 1787823000n,
    }

    const serialized = serializeTenant(rawRow)

    expect(typeof serialized.createdAt).toBe('number')
    expect(typeof serialized.updatedAt).toBe('number')
    expect(serialized.createdAt).toBe(1787767200)
    expect(serialized.updatedAt).toBe(1787823000)
    expect(serialized).toEqual({
      object: 'projects.tenant',
      id: 'prjten_test_timestamps',
      organizationId: 'org_ts',
      triageProjectId: 'prj_triage_ts',
      createdAt: 1787767200,
      updatedAt: 1787823000,
    })
  })

  it('ensure handles concurrent race condition gracefully when tenant already created', async () => {
    repository.retrieveByOrganization
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingTenantRow)
    repository.createWithTriageProject.mockRejectedValue({ code: 'P2002' })

    const result = await service.ensure('org_1')

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'projects.tenant',
      id: existingTenantRow.id,
      organizationId: 'org_1',
      triageProjectId: 'prj_triage_1',
      createdAt: 1787767200,
      updatedAt: 1787823000,
    })
  })

  it('POST /v1/tenants/ensure returns 201 for new tenant and 200 for existing tenant', async () => {
    repository.retrieveByOrganization.mockResolvedValueOnce(null)
    repository.createWithTriageProject.mockResolvedValueOnce(createdTenantRow)

    const responseCreate = await requestJson('POST', '/v1/tenants/ensure', {
      organizationId: 'org_new',
    })
    expect(responseCreate.status).toBe(201)
    expect(responseCreate.body).toEqual({
      data: {
        object: 'projects.tenant',
        id: createdTenantRow.id,
        organizationId: 'org_new',
        triageProjectId: createdTenantRow.triageProjectId,
        createdAt: 1787767200,
        updatedAt: 1787767200,
      },
      error: null,
    })

    repository.retrieveByOrganization.mockResolvedValueOnce(existingTenantRow)
    const responseExisting = await requestJson('POST', '/v1/tenants/ensure', {
      organizationId: 'org_1',
    })
    expect(responseExisting.status).toBe(200)
    expect(responseExisting.body).toEqual({
      data: {
        object: 'projects.tenant',
        id: existingTenantRow.id,
        organizationId: 'org_1',
        triageProjectId: 'prj_triage_1',
        createdAt: 1787767200,
        updatedAt: 1787823000,
      },
      error: null,
    })
  })

  it('GET /v1/tenants/:organizationId returns 404 with complete error shape when absent', async () => {
    repository.retrieveByOrganization.mockResolvedValue(null)

    const response = await requestJson('GET', '/v1/tenants/org_missing')
    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'projects/tenant-not-found',
        message: 'This organization does not have a 876 Projects workspace.',
      },
    })
  })

  it('rejects unauthorized requests with projects/unauthorized when internal key is invalid', async () => {
    const response = await requestJson('GET', '/v1/tenants/org_1', undefined, {
      'x-internal-key': 'wrong-key',
    })
    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'projects/unauthorized',
        message: 'This request is missing valid credentials.',
      },
    })
    expect(repository.retrieveByOrganization).not.toHaveBeenCalled()
  })
})

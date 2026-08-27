import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CrmHttpError } from '../../../http/errors.js'

const { tenants, repository } = vi.hoisted(() => ({
  tenants: {
    retrieveByOrganization: vi.fn(),
  },
  repository: {
    list: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    used: vi.fn(),
    remove: vi.fn(),
    retrieveSub: vi.fn(),
    createSub: vi.fn(),
    updateSub: vi.fn(),
    usedSub: vi.fn(),
    removeSub: vi.fn(),
  },
}))

vi.mock('../../tenants/tenants.service.js', () => tenants)
vi.mock('../categories.repository.js', () => repository)

const { createCategoriesRouter } = await import('../categories.routes.js')

const HEADERS = {
  'x-internal-key': 'crm-internal-key',
}

const tenant = {
  id: 'crm_tenant_1',
  organizationId: 'org_1',
  status: 'ACTIVE',
}

const createdAt = new Date('2026-08-26T18:00:00.000Z')
const updatedAt = new Date('2026-08-27T09:30:00.000Z')

const categoryRow = {
  id: 'crm_cat_1',
  tenantId: tenant.id,
  name: 'Billing',
  slug: 'billing',
  description: null,
  color: null,
  icon: 'receipt',
  sortOrder: 0,
  isActive: true,
  defaultTeamId: null,
  defaultPriority: null,
  createdBy: 'usr_1',
  createdAt,
  updatedAt,
  deletedAt: null,
  deletedBy: null,
  subcategories: [],
}

const subcategoryRow = {
  id: 'crm_subcat_1',
  tenantId: tenant.id,
  categoryId: categoryRow.id,
  name: 'Refunds',
  slug: 'refunds',
  description: null,
  icon: null,
  sortOrder: 0,
  isActive: true,
  defaultTeamId: null,
  defaultPriority: null,
  createdBy: 'usr_1',
  createdAt,
  updatedAt,
  deletedAt: null,
  deletedBy: null,
}

async function requestJson(method: string, path: string, body?: unknown) {
  const app = express()
  app.use(express.json())
  app.use(
    '/v1/organizations/:organizationId/request-categories',
    createCategoriesRouter()
  )
  app.use(
    (
      error: unknown,
      _request: Request,
      response: Response,
      _next: NextFunction
    ) => {
      void _next

      if (error instanceof CrmHttpError)
        return response.status(error.httpStatus).json({
          data: null,
          error: { code: error.code, message: error.message },
        })

      return response.status(500).json({
        data: null,
        error: { code: 'crm/internal', message: 'Internal server error.' },
      })
    }
  )
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No port')

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...HEADERS,
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
  process.env.CRM_INTERNAL_KEY = 'crm-internal-key'
  tenants.retrieveByOrganization.mockResolvedValue(tenant)
  repository.list.mockResolvedValue([categoryRow])
  repository.retrieve.mockResolvedValue(categoryRow)
  repository.create.mockResolvedValue(categoryRow)
  repository.update.mockResolvedValue(categoryRow)
  repository.used.mockResolvedValue(null)
  repository.remove.mockResolvedValue({
    object: 'request_category',
    id: categoryRow.id,
    deleted: true,
  })
  repository.retrieveSub.mockResolvedValue(subcategoryRow)
  repository.createSub.mockResolvedValue(subcategoryRow)
  repository.updateSub.mockResolvedValue(subcategoryRow)
  repository.usedSub.mockResolvedValue(null)
  repository.removeSub.mockResolvedValue({
    object: 'request_subcategory',
    id: subcategoryRow.id,
    deleted: true,
  })
})

describe('CRM category routes', () => {
  it('refuses to delete a category that is in use', async () => {
    repository.used.mockResolvedValue({ id: 'crm_req_1' })

    const response = await requestJson(
      'DELETE',
      `/v1/organizations/org_1/request-categories/${categoryRow.id}`,
      { deletedBy: 'usr_2' }
    )

    expect(response).toEqual({
      status: 409,
      body: {
        data: null,
        error: {
          code: 'crm/category-in-use',
          message: 'Category is in use by a live request.',
        },
      },
    })
    expect(repository.used).toHaveBeenCalledOnce()
    expect(repository.used).toHaveBeenCalledWith(tenant.id, categoryRow.id)
    expect(repository.remove).not.toHaveBeenCalled()
  })

  it('deletes a category that is not in use', async () => {
    const response = await requestJson(
      'DELETE',
      `/v1/organizations/org_1/request-categories/${categoryRow.id}`,
      { deletedBy: 'usr_2' }
    )

    expect(response).toEqual({
      status: 200,
      body: {
        data: {
          object: 'request_category',
          id: categoryRow.id,
          deleted: true,
        },
        error: null,
      },
    })
    expect(repository.used).toHaveBeenCalledOnce()
    expect(repository.used).toHaveBeenCalledWith(tenant.id, categoryRow.id)
    expect(repository.remove).toHaveBeenCalledOnce()
    expect(repository.remove).toHaveBeenCalledWith({
      id: categoryRow.id,
      deletedBy: 'usr_2',
    })
  })

  it('refuses to delete a subcategory that is in use', async () => {
    repository.usedSub.mockResolvedValue({ id: 'crm_req_1' })

    const response = await requestJson(
      'DELETE',
      `/v1/organizations/org_1/request-categories/${categoryRow.id}/subcategories/${subcategoryRow.id}`,
      { deletedBy: 'usr_2' }
    )

    expect(response).toEqual({
      status: 409,
      body: {
        data: null,
        error: {
          code: 'crm/subcategory-in-use',
          message: 'Subcategory is in use by a live request.',
        },
      },
    })
    expect(repository.usedSub).toHaveBeenCalledOnce()
    expect(repository.usedSub).toHaveBeenCalledWith(
      tenant.id,
      subcategoryRow.id
    )
    expect(repository.removeSub).not.toHaveBeenCalled()
  })

  it('derives a category slug from its name and preserves its icon key', async () => {
    const createdCategory = {
      ...categoryRow,
      name: 'Billing & Refunds',
      slug: 'billing-refunds',
      icon: 'legacy-billing-mark',
    }
    repository.create.mockResolvedValue(createdCategory)

    const response = await requestJson(
      'POST',
      '/v1/organizations/org_1/request-categories',
      {
        name: 'Billing & Refunds',
        icon: 'legacy-billing-mark',
        createdBy: 'usr_2',
      }
    )

    expect(response).toEqual({
      status: 201,
      body: {
        data: {
          object: 'request_category',
          ...createdCategory,
          createdAt: 1787767200,
          updatedAt: 1787823000,
          subcategories: [],
        },
        error: null,
      },
    })
    expect(repository.create).toHaveBeenCalledOnce()
    expect(repository.create).toHaveBeenCalledWith({
      tenantId: tenant.id,
      name: 'Billing & Refunds',
      icon: 'legacy-billing-mark',
      createdBy: 'usr_2',
      slug: 'billing-refunds',
    })
  })

  it('returns the full category list envelope', async () => {
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_1/request-categories'
    )

    expect(response).toEqual({
      status: 200,
      body: {
        data: {
          object: 'list',
          data: [
            {
              object: 'request_category',
              ...categoryRow,
              createdAt: 1787767200,
              updatedAt: 1787823000,
              subcategories: [],
            },
          ],
          has_more: false,
          total_count: 1,
          url: '/v1/organizations/org_1/request-categories',
        },
        error: null,
      },
    })
    expect(repository.list).toHaveBeenCalledOnce()
    expect(repository.list).toHaveBeenCalledWith(tenant.id)
  })
})

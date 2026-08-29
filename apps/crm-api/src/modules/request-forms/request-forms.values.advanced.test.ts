import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isError } from '@876/core'

const { tenants, repository, customers, requests } = vi.hoisted(() => ({
  tenants: { retrieveByOrganization: vi.fn() },
  repository: { retrieve: vi.fn(), submissionCount: vi.fn(), remove: vi.fn(), listSubmissions: vi.fn(), create: vi.fn(), update: vi.fn() },
  customers: { list: vi.fn() },
  requests: { createFromIntake: vi.fn() },
}))
vi.mock('../tenants/tenants.service.js', () => tenants)
vi.mock('./request-forms.repository.js', () => repository)
vi.mock('../customers/index.js', () => customers)
vi.mock('../requests/index.js', () => requests)

const service = await import('./request-forms.service.js')

const tenantActive = { id: 't1', organizationId: 'org_1', status: 'ACTIVE' }
const formPublished = {
  id: 'form_1', tenantId: 't1', slug: 'support', status: 'PUBLISHED' as const,
  publishedDefinition: { fields: [{ id: 'f1', key: 'subject', type: 'TEXT', label: 'Subject', required: true, mapping: 'REQUEST_SUBJECT' }] },
}

beforeEach(() => {
  vi.clearAllMocks()
  tenants.retrieveByOrganization.mockResolvedValue(tenantActive)
  repository.retrieve.mockResolvedValue(formPublished as unknown as ReturnType<typeof repository.retrieve>)
  repository.submissionCount.mockResolvedValue(0)
  repository.remove.mockResolvedValue({ id: 'form_1', deleted: true } as unknown as ReturnType<typeof repository.remove>)
  customers.list.mockResolvedValue({ customers: [{ profile: { id: 'cus_1' }, customer: { id: 'cus_1', displayName: 'Acme' } }], hasMore: false } as unknown as ReturnType<typeof customers.list>)
  requests.createFromIntake.mockResolvedValue({ id: 'req_1' } as unknown as ReturnType<typeof requests.createFromIntake>)
  process.env.DELETION_MODE = 'hard'
})

describe('request-forms.service - validation as values', () => {
  it('remove returns form-in-use value when hard delete with submissions', async () => {
    repository.submissionCount.mockResolvedValue(5)
    const res = await service.remove('org_1', 'form_1', { deletedBy: 'u1' })
    expect(isError(res)).toBe(true)
    expect(res).toMatchObject({ code: 'crm/form-in-use', httpStatus: 409 })
  })

  it('submit returns tenant-not-found value', async () => {
    tenants.retrieveByOrganization.mockResolvedValue(null)
    const res = await service.submit('org_1', 'form_1', { answers: { subject: 'Hi' }, requesterUserId: 'u1' } as unknown as Parameters<typeof service.submit>[2])
    expect(res).toMatchObject({ code: 'crm/tenant-not-found' })
  })

  it('submit returns form-not-found value', async () => {
    repository.retrieve.mockResolvedValue(null)
    const res = await service.submit('org_1', 'missing', { answers: {} } as unknown as Parameters<typeof service.submit>[2])
    expect(res).toMatchObject({ code: 'crm/form-not-found' })
  })

  it('submit returns form-not-published value when not published', async () => {
    repository.retrieve.mockResolvedValue({ ...formPublished, status: 'DRAFT' } as unknown as ReturnType<typeof repository.retrieve>)
    const res = await service.submit('org_1', 'form_1', { answers: { subject: 'Hi' } } as unknown as Parameters<typeof service.submit>[2])
    expect(res).toMatchObject({ code: 'crm/form-not-published' })
  })

  it('submit returns customer-not-found when no matching customer', async () => {
    customers.list.mockResolvedValue({ customers: [], hasMore: false } as unknown as ReturnType<typeof customers.list>)
    const res = await service.submit('org_1', 'form_1', { answers: { subject: 'Hi' } } as unknown as Parameters<typeof service.submit>[2])
    expect(res).toMatchObject({ code: 'crm/customer-not-found' })
  })

  it('submit propagates customer registry error as value', async () => {
    const err = { code: 'crm/registry-unavailable', message: 'down', httpStatus: 502 }
    customers.list.mockResolvedValue(err as unknown as ReturnType<typeof customers.list>)
    const res = await service.submit('org_1', 'form_1', { answers: { subject: 'Hi' } } as unknown as Parameters<typeof service.submit>[2])
    expect(isError(res)).toBe(true)
    expect(res).toMatchObject({ code: 'crm/registry-unavailable' })
  })

  it('submit returns form-invalid-submission when subject missing', async () => {
    const res = await service.submit('org_1', 'form_1', { answers: {} } as unknown as Parameters<typeof service.submit>[2])
    expect(res).toMatchObject({ code: 'crm/form-invalid-submission' })
  })

  it('error values are plain objects not Error', async () => {
    tenants.retrieveByOrganization.mockResolvedValue(null)
    const res = await service.submit('org_1', 'form_1', { answers: { subject: 'Hi' } } as never)
    expect(res).not.toBeInstanceOf(Error)
  })

  it('propagates request createFromIntake error as value', async () => {
    const err = { code: 'crm/tenant-inactive', message: 'inactive', httpStatus: 409 }
    requests.createFromIntake.mockResolvedValue(err as unknown as ReturnType<typeof requests.createFromIntake>)
    const res = await service.submit('org_1', 'form_1', { answers: { subject: 'Hi' } } as unknown as Parameters<typeof service.submit>[2])
    expect(isError(res)).toBe(true)
    expect(res).toMatchObject({ code: 'crm/tenant-inactive' })
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { tenants, repository } = vi.hoisted(() => ({
  tenants: { retrieveByOrganization: vi.fn() },
  repository: {
    retrieve: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    retrieveNote: vi.fn(),
    listNotes: vi.fn(),
    createNote: vi.fn(),
    removeNote: vi.fn(),
    updateNote: vi.fn(),
    categoryExists: vi.fn(),
    subcategoryExists: vi.fn(),
    teamExists: vi.fn(),
    isTeamMember: vi.fn(),
    customerExists: vi.fn(),
  },
}))

vi.mock('../../tenants/tenants.service.js', () => tenants)
vi.mock('../requests.repository.js', () => repository)

const service = await import('../requests.service.js')
const tenant = {
  id: 'crm_tenant_1',
  organizationId: 'org_1',
  status: 'ACTIVE' as const,
}

const baseRow = {
  id: 'crm_req_1',
  tenantId: 'crm_tenant_1',
  customerId: 'crm_cus_1',
  number: 1,
  subject: 'Need help',
  categoryId: null,
  subcategoryId: null,
  teamId: null,
  assigneeId: null,
  ownerId: null,
  status: 'OPEN' as const,
  priority: 'NORMAL' as const,
  source: 'CRM' as const,
  createdBy: 'usr_1',
  resolvedAt: null,
  closedAt: null,
  createdAt: new Date('2026-08-26T18:00:00.000Z'),
  updatedAt: new Date('2026-08-26T18:00:00.000Z'),
  deletedAt: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  tenants.retrieveByOrganization.mockResolvedValue(tenant)
  repository.retrieve.mockResolvedValue(baseRow)
  repository.list.mockResolvedValue([])
  repository.customerExists.mockResolvedValue({ id: 'crm_cus_1' })
  repository.categoryExists.mockResolvedValue(null)
  repository.subcategoryExists.mockResolvedValue(null)
  repository.teamExists.mockResolvedValue({ id: 'crm_team_1' })
  repository.isTeamMember.mockResolvedValue(null)
  repository.create.mockResolvedValue(baseRow)
  repository.update.mockResolvedValue(baseRow)
  repository.remove.mockResolvedValue({
    object: 'request',
    id: 'crm_req_1',
    deleted: true,
  })
  repository.listNotes.mockResolvedValue([])
  repository.removeNote.mockResolvedValue({
    object: 'request_note',
    id: 'n1',
    deleted: true,
  })
  repository.updateNote.mockResolvedValue({
    id: 'n1',
    body: 'x',
    kind: 'NOTE',
    internal: true,
    authorId: 'usr_1',
    createdAt: new Date(),
    updatedAt: new Date(),
    editedAt: null,
    tenantId: 'crm_tenant_1',
    requestId: 'crm_req_1',
  })
})

describe('requests.service - create edge cases', () => {
  it('throws tenant-not-found when organization has no tenant', async () => {
    tenants.retrieveByOrganization.mockResolvedValue(null)
    await expect(
      service.create('org_x', {
        customerId: 'crm_cus_1',
        subject: 'hi',
        createdBy: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/tenant-not-found' })
  })
  it('throws tenant-inactive when tenant is not ACTIVE', async () => {
    tenants.retrieveByOrganization.mockResolvedValue({
      ...tenant,
      status: 'INACTIVE',
    })
    await expect(
      service.create('org_1', {
        customerId: 'crm_cus_1',
        subject: 'hi',
        createdBy: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/tenant-inactive' })
  })
  it('throws customer-not-found when customer missing', async () => {
    repository.customerExists.mockResolvedValue(null)
    await expect(
      service.create('org_1', {
        customerId: 'missing',
        subject: 'hi',
        createdBy: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/customer-not-found' })
  })
  it('throws category-not-found for unknown category', async () => {
    repository.categoryExists.mockResolvedValue(null)
    await expect(
      service.create('org_1', {
        customerId: 'crm_cus_1',
        subject: 'hi',
        createdBy: 'usr_1',
        categoryId: 'bad',
      })
    ).rejects.toMatchObject({ code: 'crm/category-not-found' })
    expect(repository.create).not.toHaveBeenCalled()
  })
  it('throws subcategory-not-found for unknown subcategory', async () => {
    // The category has to resolve first: create() validates the category before
    // the subcategory, so leaving this unmocked fails on category-not-found and
    // never reaches the assertion this test is about.
    repository.categoryExists.mockResolvedValueOnce({
      id: 'crm_cat_1',
      defaultTeamId: null,
      defaultPriority: null,
    })
    repository.subcategoryExists.mockResolvedValue(null)
    await expect(
      service.create('org_1', {
        customerId: 'crm_cus_1',
        subject: 'hi',
        createdBy: 'usr_1',
        categoryId: 'crm_cat_1',
        subcategoryId: 'bad',
      })
    ).rejects.toMatchObject({ code: 'crm/subcategory-not-found' })
  })
  it('applies subcategory default team and priority when no explicit values', async () => {
    repository.categoryExists.mockResolvedValue({
      id: 'crm_cat_1',
      defaultTeamId: 'crm_team_cat',
      defaultPriority: 'LOW',
    })
    repository.subcategoryExists.mockResolvedValue({
      id: 'crm_sub_1',
      categoryId: 'crm_cat_1',
      defaultTeamId: 'crm_team_sub',
      defaultPriority: 'HIGH',
    })
    await service.create('org_1', {
      customerId: 'crm_cus_1',
      subject: 'hi',
      createdBy: 'usr_1',
      categoryId: 'crm_cat_1',
      subcategoryId: 'crm_sub_1',
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: 'crm_team_sub', priority: 'HIGH' })
    )
  })
  it('throws team-not-found for unknown team', async () => {
    repository.categoryExists.mockResolvedValue({ id: 'crm_cat_1' })
    repository.teamExists.mockResolvedValue(null)
    await expect(
      service.create('org_1', {
        customerId: 'crm_cus_1',
        subject: 'hi',
        createdBy: 'usr_1',
        categoryId: 'crm_cat_1',
        teamId: 'bad',
      })
    ).rejects.toMatchObject({ code: 'crm/team-not-found' })
  })
})

describe('requests.service - update edge cases', () => {
  it('returns null when request does not exist', async () => {
    repository.retrieve.mockResolvedValue(null)
    expect(
      await service.update('org_1', 'missing', { status: 'RESOLVED' })
    ).toBeNull()
    expect(repository.update).not.toHaveBeenCalled()
  })
  it('throws category-not-found on update with bad category', async () => {
    repository.categoryExists.mockResolvedValue(null)
    await expect(
      service.update('org_1', 'crm_req_1', { categoryId: 'bad' })
    ).rejects.toMatchObject({ code: 'crm/category-not-found' })
  })
  it('throws subcategory-category-mismatch when subcategory does not belong', async () => {
    repository.retrieve.mockResolvedValue({
      ...baseRow,
      categoryId: 'crm_cat_1',
    })
    repository.subcategoryExists.mockResolvedValue({
      id: 'crm_sub_1',
      categoryId: 'crm_cat_2',
    })
    await expect(
      service.update('org_1', 'crm_req_1', { subcategoryId: 'crm_sub_1' })
    ).rejects.toMatchObject({ code: 'crm/subcategory-category-mismatch' })
  })
  it('clears resolvedAt when moving away from RESOLVED', async () => {
    repository.retrieve.mockResolvedValue({
      ...baseRow,
      status: 'RESOLVED',
      resolvedAt: new Date(),
    })
    await service.update('org_1', 'crm_req_1', { status: 'OPEN' })
    expect(repository.update).toHaveBeenCalledWith(
      'crm_req_1',
      expect.objectContaining({ resolvedAt: null })
    )
  })
  it('clears closedAt when moving away from CLOSED', async () => {
    repository.retrieve.mockResolvedValue({
      ...baseRow,
      status: 'CLOSED',
      closedAt: new Date(),
    })
    await service.update('org_1', 'crm_req_1', { status: 'OPEN' })
    expect(repository.update).toHaveBeenCalledWith(
      'crm_req_1',
      expect.objectContaining({ closedAt: null })
    )
  })
  it('stamps closedAt when moving to CLOSED', async () => {
    repository.retrieve.mockResolvedValue({
      ...baseRow,
      status: 'OPEN',
      closedAt: null,
    })
    await service.update('org_1', 'crm_req_1', { status: 'CLOSED' })
    expect(repository.update).toHaveBeenCalledWith(
      'crm_req_1',
      expect.objectContaining({ status: 'CLOSED', closedAt: expect.any(Date) })
    )
  })
  it('does not clear assignee when team unchanged', async () => {
    repository.retrieve.mockResolvedValue({
      ...baseRow,
      teamId: 'crm_team_1',
      assigneeId: 'usr_2',
    })
    await service.update('org_1', 'crm_req_1', { teamId: 'crm_team_1' })
    expect(repository.isTeamMember).not.toHaveBeenCalled()
  })
  it('respects explicit assignee when team changes', async () => {
    repository.retrieve.mockResolvedValue({ ...baseRow, assigneeId: 'usr_2' })
    repository.isTeamMember.mockResolvedValue(null)
    await service.update('org_1', 'crm_req_1', {
      teamId: 'crm_team_2',
      assigneeId: 'usr_3',
    })
    expect(repository.update).toHaveBeenCalledWith(
      'crm_req_1',
      expect.objectContaining({ teamId: 'crm_team_2', assigneeId: 'usr_3' })
    )
    expect(repository.update).not.toHaveBeenCalledWith(
      'crm_req_1',
      expect.objectContaining({ assigneeId: null })
    )
  })
})

describe('requests.service - notes and deletion', () => {
  it('throws request-not-found when creating note for missing request', async () => {
    repository.retrieve.mockResolvedValue(null)
    await expect(
      service.createNote('org_1', 'crm_req_1', {
        body: 'hi',
        authorId: 'usr_1',
      })
    ).rejects.toMatchObject({ code: 'crm/request-not-found' })
  })
  it('returns null when removing non-existent note', async () => {
    repository.retrieveNote.mockResolvedValue(null)
    expect(
      await service.removeNote('org_1', 'crm_req_1', 'bad', {
        deletedBy: 'usr_1',
      })
    ).toBeNull()
  })
  it('throws description-note-immutable when deleting DESCRIPTION note', async () => {
    repository.retrieveNote.mockResolvedValue({ id: 'n1', kind: 'DESCRIPTION' })
    await expect(
      service.removeNote('org_1', 'crm_req_1', 'n1', { deletedBy: 'usr_1' })
    ).rejects.toMatchObject({ code: 'crm/description-note-immutable' })
  })
  it('returns null when updating non-existent note', async () => {
    repository.retrieveNote.mockResolvedValue(null)
    expect(
      await service.updateNote('org_1', 'crm_req_1', 'bad', {
        body: 'x',
        editedBy: 'usr_1',
      })
    ).toBeNull()
  })
  it('remove returns null when request missing', async () => {
    repository.retrieve.mockResolvedValue(null)
    expect(
      await service.remove('org_1', 'missing', { deletedBy: 'usr_1' })
    ).toBeNull()
  })
})

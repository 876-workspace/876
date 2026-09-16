import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { errorHandler } from '../../../http/error-handler.js'

const { tenantsMod, projectsMod, issuesMod, workStructureMod, grantsService, attachmentsService } =
  vi.hoisted(() => ({
    tenantsMod: { resolveTenant: vi.fn() },
    projectsMod: { resolveProject: vi.fn() },
    issuesMod: { resolveIssue: vi.fn() },
    workStructureMod: { resolveMilestoneById: vi.fn() },
    grantsService: {
      listGrants: vi.fn(),
      inviteGrant: vi.fn(),
      retrieveGrant: vi.fn(),
      updateGrant: vi.fn(),
      revokeGrant: vi.fn(),
    },
    attachmentsService: {
      listAttachmentLinks: vi.fn(),
      createAttachmentLink: vi.fn(),
      retrieveAttachmentLink: vi.fn(),
      updateAttachmentLink: vi.fn(),
      removeAttachmentLink: vi.fn(),
      setAttachmentVisibility: vi.fn(),
    },
  }))

vi.mock('../../tenants/index.js', () => tenantsMod)
vi.mock('../../projects/index.js', () => projectsMod)
vi.mock('../../issues/index.js', () => issuesMod)
vi.mock('../../work-structure/index.js', () => workStructureMod)
vi.mock('../client-grants.service.js', () => grantsService)
vi.mock('../attachment-links.service.js', () => attachmentsService)

const { createClientGrantsRouter, createAttachmentLinksRouter } = await import(
  '../index.js'
)

const tenant = { id: 'ten_alpha' }
const project = { id: 'prj_alpha' }
const GRANTS = '/v1/organizations/org_1/projects/prj_1/client-grants'
const ATTACHMENTS = '/v1/organizations/org_1/projects/prj_1/attachment-links'

const grantPayload = {
  object: 'projects.client-grant',
  id: 'cgt_1',
  userId: 'usr_client',
}

const attachmentPayload = {
  object: 'projects.attachment-link',
  id: 'att_1',
  url: 'https://files.example/spec.pdf',
  clientVisible: false,
}

async function requestJson(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const app = express()
  app.use(express.json())
  app.use(
    '/v1/organizations/:organizationId/projects/:projectId/client-grants',
    createClientGrantsRouter()
  )
  app.use(
    '/v1/organizations/:organizationId/projects/:projectId/attachment-links',
    createAttachmentLinksRouter()
  )
  app.use(errorHandler)
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
    return { status: response.status, body: await response.json() }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.PROJECTS_INTERNAL_KEY = 'test-internal-key'
  tenantsMod.resolveTenant.mockResolvedValue(tenant)
  projectsMod.resolveProject.mockResolvedValue(project)
  grantsService.listGrants.mockResolvedValue({
    data: { items: [grantPayload], hasMore: false, totalCount: null },
    error: null,
  })
  grantsService.inviteGrant.mockResolvedValue({ data: grantPayload, error: null })
  grantsService.retrieveGrant.mockResolvedValue({ data: grantPayload, error: null })
  grantsService.updateGrant.mockResolvedValue({ data: grantPayload, error: null })
  grantsService.revokeGrant.mockResolvedValue({ data: grantPayload, error: null })
  attachmentsService.listAttachmentLinks.mockResolvedValue({
    data: { items: [attachmentPayload], hasMore: false, totalCount: null },
    error: null,
  })
  attachmentsService.createAttachmentLink.mockResolvedValue({
    data: attachmentPayload,
    error: null,
  })
  attachmentsService.retrieveAttachmentLink.mockResolvedValue({
    data: attachmentPayload,
    error: null,
  })
  attachmentsService.updateAttachmentLink.mockResolvedValue({
    data: attachmentPayload,
    error: null,
  })
  attachmentsService.removeAttachmentLink.mockResolvedValue({
    data: { object: 'projects.attachment-link', id: 'att_1', deleted: true },
    error: null,
  })
  attachmentsService.setAttachmentVisibility.mockResolvedValue({
    data: { object: 'projects.attachment-link', id: 'att_1', clientVisible: true },
    error: null,
  })
})

describe('client grant routes', () => {
  it('rejects grant reads without the internal key', async () => {
    const { status } = await requestJson('GET', GRANTS, undefined, {
      'x-internal-key': 'wrong-key',
    })

    expect(status).toBe(401)
    expect(grantsService.listGrants).not.toHaveBeenCalled()
  })

  it('rejects grant invites without the internal key', async () => {
    const { status } = await requestJson(
      'POST',
      GRANTS,
      { userId: 'usr_client' },
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
    expect(grantsService.inviteGrant).not.toHaveBeenCalled()
  })

  it('rejects grant retrieval without the internal key', async () => {
    const { status } = await requestJson('GET', `${GRANTS}/cgt_1`, undefined, {
      'x-internal-key': 'wrong-key',
    })

    expect(status).toBe(401)
    expect(grantsService.retrieveGrant).not.toHaveBeenCalled()
  })

  it('rejects grant updates without the internal key', async () => {
    const { status } = await requestJson(
      'PATCH',
      `${GRANTS}/cgt_1`,
      { allowWiki: false },
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
    expect(grantsService.updateGrant).not.toHaveBeenCalled()
  })

  it('rejects grant revokes without the internal key', async () => {
    const { status } = await requestJson(
      'POST',
      `${GRANTS}/cgt_1/revoke`,
      {},
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
    expect(grantsService.revokeGrant).not.toHaveBeenCalled()
  })

  it('lists grants over HTTP as a platform envelope', async () => {
    const { status, body } = await requestJson('GET', GRANTS)

    expect(status).toBe(200)
    expect(body.data.object).toBe('list')
    expect(grantsService.listGrants).toHaveBeenCalledWith(
      'org_1',
      'prj_1',
      expect.objectContaining({})
    )
  })

  it('invites a grant over HTTP with a 201 envelope', async () => {
    const { status, body } = await requestJson('POST', GRANTS, {
      userId: 'usr_client',
    })

    expect(status).toBe(201)
    expect(body.data).toMatchObject({ id: 'cgt_1', userId: 'usr_client' })
    expect(grantsService.inviteGrant).toHaveBeenCalledWith(
      'org_1',
      'prj_1',
      expect.objectContaining({ userId: 'usr_client' })
    )
  })

  it('rejects strict invite bodies with unknown fields', async () => {
    const { status, body } = await requestJson('POST', GRANTS, {
      userId: 'usr_client',
      injected: true,
    })

    expect(status).toBe(400)
    expect(body.error.code).toBe('projects/invalid-request')
    expect(grantsService.inviteGrant).not.toHaveBeenCalled()
  })

  it('rejects invites missing the user id with 400', async () => {
    const { status } = await requestJson('POST', GRANTS, {})

    expect(status).toBe(400)
    expect(grantsService.inviteGrant).not.toHaveBeenCalled()
  })

  it('rejects empty grant updates with 400', async () => {
    const { status } = await requestJson('PATCH', `${GRANTS}/cgt_1`, {})

    expect(status).toBe(400)
    expect(grantsService.updateGrant).not.toHaveBeenCalled()
  })

  it('updates grant flags over HTTP', async () => {
    const { status } = await requestJson('PATCH', `${GRANTS}/cgt_1`, {
      allowWiki: false,
    })

    expect(status).toBe(200)
    expect(grantsService.updateGrant).toHaveBeenCalledWith(
      'org_1',
      'prj_1',
      'cgt_1',
      { allowWiki: false }
    )
  })

  it('revokes a grant over HTTP', async () => {
    const { status } = await requestJson('POST', `${GRANTS}/cgt_1/revoke`, {})

    expect(status).toBe(200)
    expect(grantsService.revokeGrant).toHaveBeenCalledWith(
      'org_1',
      'prj_1',
      'cgt_1'
    )
  })
})

describe('attachment link routes', () => {
  it('rejects attachment reads without the internal key', async () => {
    const { status } = await requestJson('GET', ATTACHMENTS, undefined, {
      'x-internal-key': 'wrong-key',
    })

    expect(status).toBe(401)
    expect(attachmentsService.listAttachmentLinks).not.toHaveBeenCalled()
  })

  it('rejects attachment creates without the internal key', async () => {
    const { status } = await requestJson(
      'POST',
      ATTACHMENTS,
      { url: 'https://files.example/a.pdf' },
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
    expect(attachmentsService.createAttachmentLink).not.toHaveBeenCalled()
  })

  it('rejects attachment retrieval without the internal key', async () => {
    const { status } = await requestJson(
      'GET',
      `${ATTACHMENTS}/att_1`,
      undefined,
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
    expect(attachmentsService.retrieveAttachmentLink).not.toHaveBeenCalled()
  })

  it('rejects attachment updates without the internal key', async () => {
    const { status } = await requestJson(
      'PATCH',
      `${ATTACHMENTS}/att_1`,
      { name: 'renamed.pdf' },
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
    expect(attachmentsService.updateAttachmentLink).not.toHaveBeenCalled()
  })

  it('rejects attachment deletes without the internal key', async () => {
    const { status } = await requestJson(
      'DELETE',
      `${ATTACHMENTS}/att_1`,
      undefined,
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
    expect(attachmentsService.removeAttachmentLink).not.toHaveBeenCalled()
  })

  it('rejects attachment visibility changes without the internal key', async () => {
    const { status, body } = await requestJson(
      'PATCH',
      `${ATTACHMENTS}/att_1/client-visibility`,
      { clientVisible: true },
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
    expect(body.error.code).toBe('projects/unauthorized')
    expect(attachmentsService.setAttachmentVisibility).not.toHaveBeenCalled()
  })

  it('lists attachments over HTTP as a platform envelope', async () => {
    const { status, body } = await requestJson('GET', ATTACHMENTS)

    expect(status).toBe(200)
    expect(body.data.object).toBe('list')
    expect(body.data.data).toHaveLength(1)
  })

  it('creates an attachment over HTTP with a 201 envelope', async () => {
    const { status, body } = await requestJson('POST', ATTACHMENTS, {
      url: 'https://files.example/spec.pdf',
    })

    expect(status).toBe(201)
    expect(body.data).toMatchObject({ id: 'att_1' })
  })

  it('rejects strict attachment bodies with unknown fields', async () => {
    const { status } = await requestJson('POST', ATTACHMENTS, {
      url: 'https://files.example/spec.pdf',
      injected: true,
    })

    expect(status).toBe(400)
    expect(attachmentsService.createAttachmentLink).not.toHaveBeenCalled()
  })

  it('rejects empty attachment updates with 400', async () => {
    const { status } = await requestJson('PATCH', `${ATTACHMENTS}/att_1`, {})

    expect(status).toBe(400)
    expect(attachmentsService.updateAttachmentLink).not.toHaveBeenCalled()
  })

  it('rejects visibility bodies with a non-boolean flag', async () => {
    const { status } = await requestJson(
      'PATCH',
      `${ATTACHMENTS}/att_1/client-visibility`,
      { clientVisible: 'yes' }
    )

    expect(status).toBe(400)
    expect(attachmentsService.setAttachmentVisibility).not.toHaveBeenCalled()
  })

  it('publishes an attachment to the portal over HTTP', async () => {
    const { status, body } = await requestJson(
      'PATCH',
      `${ATTACHMENTS}/att_1/client-visibility`,
      { clientVisible: true }
    )

    expect(status).toBe(200)
    expect(body.data).toEqual({
      object: 'projects.attachment-link',
      id: 'att_1',
      clientVisible: true,
    })
    expect(attachmentsService.setAttachmentVisibility).toHaveBeenCalledWith(
      'org_1',
      'prj_1',
      'att_1',
      true
    )
  })

  it('deletes an attachment over HTTP', async () => {
    const { status, body } = await requestJson(
      'DELETE',
      `${ATTACHMENTS}/att_1`
    )

    expect(status).toBe(200)
    expect(body.data).toMatchObject({ id: 'att_1', deleted: true })
  })
})

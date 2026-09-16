import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('./request', () => ({ request: vi.fn() }))

import { create876ProjectsPortalClient, portalDiscussionPostSchema } from './portal'
import { request } from './request'
import {
  portalActivityFeedSchema,
  portalCommentSchema,
  portalDiscussionDetailSchema,
  portalInvoiceArraySchema,
  portalIssueListSchema,
  portalMilestoneCommentSchema,
  portalPhaseHoursArraySchema,
  portalWikiPageSchema,
} from './types'

describe('portal client', () => {
  const client = create876ProjectsPortalClient({
    internalKey: 'key',
    actingUserId: 'usr_client',
  })
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('sends the acting user id header on portal reads', async () => {
    await client.listIssues('org_1', 'prj_1', { limit: 10 })

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/portal/organizations/org_1/projects/prj_1/issues?limit=10',
        signal: undefined,
        headers: { 'x-user-id': 'usr_client' },
      },
      portalIssueListSchema
    )
  })

  it('retrieves discussion detail with posts', async () => {
    await client.retrieveDiscussion('org_1', 'prj_1', 'dsc_1')

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'GET',
        path: '/portal/organizations/org_1/projects/prj_1/discussions/dsc_1',
      }),
      portalDiscussionDetailSchema
    )
  })

  it('reads wiki, activity, time and invoices', async () => {
    await client.retrieveWikiPage('org_1', 'prj_1', 'kickoff')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        path: '/portal/organizations/org_1/projects/prj_1/wiki/kickoff',
      }),
      portalWikiPageSchema
    )

    await client.listActivity('org_1', 'prj_1', { cursor: 'abc' })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        path: '/portal/organizations/org_1/projects/prj_1/activity?cursor=abc',
      }),
      portalActivityFeedSchema
    )

    await client.getTimeByPhase('org_1', 'prj_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        path: '/portal/organizations/org_1/projects/prj_1/time-by-phase',
      }),
      portalPhaseHoursArraySchema
    )

    await client.listInvoices('org_1', 'prj_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        path: '/portal/organizations/org_1/projects/prj_1/invoices',
      }),
      portalInvoiceArraySchema
    )
  })

  it('creates an issue comment with method, path, user header and schema', async () => {
    await client.createIssueComment('org_1', 'prj_1', 'ALPHA-7', {
      body: 'Hello',
    })

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/portal/organizations/org_1/projects/prj_1/issues/ALPHA-7/comments',
        body: { body: 'Hello' },
        headers: { 'x-user-id': 'usr_client' },
      }),
      portalCommentSchema
    )
  })

  it('creates a milestone comment with method, path, user header and schema', async () => {
    await client.createMilestoneComment('org_1', 'prj_1', 'mls_1', {
      body: 'Phase note',
    })

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/portal/organizations/org_1/projects/prj_1/milestones/mls_1/comments',
        body: { body: 'Phase note' },
        headers: { 'x-user-id': 'usr_client' },
      }),
      portalMilestoneCommentSchema
    )
  })

  it('creates a discussion post with method, path, user header and schema', async () => {
    await client.createDiscussionPost('org_1', 'prj_1', 'dsc_1', {
      body: 'Reply',
    })

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/portal/organizations/org_1/projects/prj_1/discussions/dsc_1/posts',
        body: { body: 'Reply' },
        headers: { 'x-user-id': 'usr_client' },
      }),
      portalDiscussionPostSchema
    )
  })

  it('encodes portal write refs in request paths', async () => {
    await client.createIssueComment('org_1', 'prj_1', 'ALPHA 7', {
      body: 'Hello',
    })

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        path: '/portal/organizations/org_1/projects/prj_1/issues/ALPHA%207/comments',
      }),
      portalCommentSchema
    )
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('./request', () => ({ request: vi.fn() }))

import { create876ProjectsPortalClient } from './portal'
import { request } from './request'
import {
  portalActivityFeedSchema,
  portalDiscussionDetailSchema,
  portalInvoiceArraySchema,
  portalIssueListSchema,
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
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../request', () => ({ request: vi.fn() }))

import { request } from '../request'
import { buildRuntime } from '../runtime'
import {
  deletedSchema,
  wikiPageListSchema,
  wikiPageSchema,
  wikiRevisionListSchema,
  wikiRevisionSchema,
} from '../types'
import { createWikiResource } from './wiki'

describe('wiki resource', () => {
  const resource = createWikiResource(buildRuntime({ internalKey: 'key' }))
  const requestMock = vi.mocked(request)

  beforeEach(() => requestMock.mockReset())

  it('lists pages for a project', async () => {
    await resource.list('org_1', 'prj_1', { parentPageId: 'wpg_1' })

    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org_1/projects/prj_1/wiki?parentPageId=wpg_1',
        signal: undefined,
      },
      wikiPageListSchema
    )
  })

  it('creates and retrieves pages by ref', async () => {
    await resource.create('org_1', 'prj_1', { title: 'Kickoff', body: 'Notes' })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org_1/projects/prj_1/wiki',
        body: { title: 'Kickoff', body: 'Notes' },
        signal: undefined,
      },
      wikiPageSchema
    )

    await resource.retrieve('org_1', 'prj_1', 'kickoff')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org_1/projects/prj_1/wiki/kickoff',
        signal: undefined,
      },
      wikiPageSchema
    )
  })

  it('lists and retrieves revisions', async () => {
    await resource.listRevisions('org_1', 'prj_1', 'wpg_1', { limit: 5 })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org_1/projects/prj_1/wiki/wpg_1/revisions?limit=5',
        signal: undefined,
      },
      wikiRevisionListSchema
    )

    await resource.retrieveRevision('org_1', 'prj_1', 'wpg_1', 'wrv_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'GET',
        path: '/v1/organizations/org_1/projects/prj_1/wiki/wpg_1/revisions/wrv_1',
        signal: undefined,
      },
      wikiRevisionSchema
    )
  })

  it('restores revisions and deletes pages', async () => {
    await resource.restore('org_1', 'prj_1', 'wpg_1', { revisionId: 'wrv_1' })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'POST',
        path: '/v1/organizations/org_1/projects/prj_1/wiki/wpg_1/restore',
        body: { revisionId: 'wrv_1' },
        signal: undefined,
      },
      wikiPageSchema
    )

    await resource.delete('org_1', 'prj_1', 'wpg_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      {
        method: 'DELETE',
        path: '/v1/organizations/org_1/projects/prj_1/wiki/wpg_1',
        signal: undefined,
      },
      deletedSchema
    )
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getIssueVisibility,
  getPhaseVisibility,
  listIssueCommentVisibility,
  listPhaseCommentVisibility,
  setRecordVisibility,
} from '../visibility'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('PROJECTS_INTERNAL_KEY', 'key_1')
  vi.stubEnv('PROJECTS_API_URL', 'http://projects-api.test')
})

function envelope(data: unknown) {
  return {
    ok: true,
    json: () => Promise.resolve({ data, error: null }),
  }
}

describe('setRecordVisibility', () => {
  it('patches issue visibility and returns the confirmed flag', async () => {
    fetchMock.mockResolvedValue(
      envelope({ object: 'projects.issue', id: 'iss_1', clientVisible: true })
    )

    const result = await setRecordVisibility(
      'org_1',
      { kind: 'issue', issueRef: 'PRJ-1' },
      true
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'http://projects-api.test/v1/organizations/org_1/issues/PRJ-1/client-visibility',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ clientVisible: true }),
      })
    )
    expect(result).toEqual({
      data: { object: 'projects.issue', id: 'iss_1', clientVisible: true },
      error: null,
    })
  })

  it('patches phase visibility', async () => {
    fetchMock.mockResolvedValue(
      envelope({ object: 'projects.milestone', id: 'ms_1', clientVisible: false })
    )

    const result = await setRecordVisibility(
      'org_1',
      { kind: 'phase', phaseId: 'ms_1' },
      false
    )

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/milestones/ms_1/client-visibility'),
      expect.objectContaining({ method: 'PATCH' })
    )
    expect(result.error).toBeNull()
  })

  it('patches issue comment visibility', async () => {
    fetchMock.mockResolvedValue(
      envelope({ object: 'projects.comment', id: 'cmt_1', clientVisible: true })
    )

    await setRecordVisibility(
      'org_1',
      { kind: 'issue-comment', issueRef: 'PRJ-1', commentId: 'cmt_1' },
      true
    )

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/issues/PRJ-1/comments/cmt_1/client-visibility'),
      expect.objectContaining({ method: 'PATCH' })
    )
  })

  it('patches phase comment visibility', async () => {
    fetchMock.mockResolvedValue(
      envelope({ object: 'x', id: 'cmt_2', clientVisible: true })
    )

    await setRecordVisibility(
      'org_1',
      { kind: 'phase-comment', phaseId: 'ms_1', commentId: 'cmt_2' },
      true
    )

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/milestones/ms_1/comments/cmt_2/client-visibility'),
      expect.objectContaining({ method: 'PATCH' })
    )
  })

  it('patches attachment link visibility', async () => {
    fetchMock.mockResolvedValue(
      envelope({ object: 'x', id: 'att_1', clientVisible: true })
    )

    await setRecordVisibility(
      'org_1',
      { kind: 'attachment-link', projectId: 'prj_1', attachmentId: 'att_1' },
      true
    )

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/projects/prj_1/attachment-links/att_1/client-visibility'
      ),
      expect.objectContaining({ method: 'PATCH' })
    )
  })

  it('sends the internal key, never a session credential', async () => {
    fetchMock.mockResolvedValue(
      envelope({ object: 'x', id: 'iss_1', clientVisible: true })
    )

    await setRecordVisibility('org_1', { kind: 'issue', issueRef: 'PRJ-1' }, true)

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>
    expect(headers['x-internal-key']).toBe('key_1')
  })

  it('maps a missing record to 404', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          data: null,
          error: { code: 'projects/issue-not-found', message: 'Missing.' },
        }),
    })

    const result = await setRecordVisibility(
      'org_1',
      { kind: 'issue', issueRef: 'PRJ-9' },
      true
    )

    expect(result.data).toBeNull()
    expect(result.error?.status).toBe(404)
  })

  it('fails closed when the service cannot be reached', async () => {
    fetchMock.mockRejectedValue(new Error('down'))

    const result = await setRecordVisibility(
      'org_1',
      { kind: 'issue', issueRef: 'PRJ-1' },
      true
    )

    expect(result.data).toBeNull()
    expect(result.error?.status).toBe(502)
  })
})

describe('visibility reads', () => {
  it('reads the issue flag', async () => {
    fetchMock.mockResolvedValue(
      envelope({ object: 'projects.issue', id: 'iss_1', clientVisible: true })
    )

    await expect(getIssueVisibility('org_1', 'PRJ-1')).resolves.toBe(true)
  })

  it('reads the phase flag', async () => {
    fetchMock.mockResolvedValue(envelope({ clientVisible: false }))

    await expect(getPhaseVisibility('org_1', 'ms_1')).resolves.toBe(false)
  })

  it('returns null when the flag cannot be read', async () => {
    fetchMock.mockRejectedValue(new Error('down'))

    await expect(getIssueVisibility('org_1', 'PRJ-1')).resolves.toBeNull()
  })

  it('maps issue comments to their flags', async () => {
    fetchMock.mockResolvedValue(
      envelope({
        object: 'list',
        data: [
          {
            object: 'projects.comment',
            id: 'cmt_1',
            tenantId: 'tnt_1',
            issueId: 'iss_1',
            authorUserId: null,
            body: 'Hello',
            createdAt: 1,
            updatedAt: 1,
            clientVisible: true,
          },
        ],
      })
    )

    await expect(listIssueCommentVisibility('org_1', 'PRJ-1')).resolves.toEqual({
      cmt_1: true,
    })
  })

  it('maps phase comments to their flags', async () => {
    fetchMock.mockResolvedValue(
      envelope({
        object: 'list',
        data: [
          {
            object: 'projects.milestone-comment',
            id: 'cmt_2',
            milestoneId: 'ms_1',
            authorUserId: null,
            body: 'Hello',
            createdAt: 1,
            updatedAt: 1,
            clientVisible: false,
          },
        ],
      })
    )

    await expect(listPhaseCommentVisibility('org_1', 'ms_1')).resolves.toEqual({
      cmt_2: false,
    })
  })

  it('returns an empty map when comment flags cannot be read', async () => {
    fetchMock.mockRejectedValue(new Error('down'))

    await expect(listIssueCommentVisibility('org_1', 'PRJ-1')).resolves.toEqual({})
  })
})

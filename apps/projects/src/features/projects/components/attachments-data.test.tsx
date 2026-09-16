/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  linksList: vi.fn(),
  fileRetrieve: vi.fn(),
  createReadUrl: vi.fn(),
  memberLabels: vi.fn(),
  panel: vi.fn(),
}))

vi.mock('@/lib/services/storage', () => ({
  storage: {
    uploads: { create: vi.fn(), complete: vi.fn() },
    files: {
      retrieve: mocks.fileRetrieve,
      createReadUrl: mocks.createReadUrl,
    },
    resourceLinks: { list: mocks.linksList, create: vi.fn(), delete: vi.fn() },
  },
}))
vi.mock('@/features/projects/member-labels', () => ({
  loadMemberLabels: mocks.memberLabels,
}))
vi.mock('@/features/projects/components/attachments-panel', () => ({
  AttachmentsPanel: (props: Record<string, unknown>) => {
    mocks.panel(props)
    return <div>Attachments panel</div>
  },
}))

import { AttachmentsData } from './attachments-data'

const link = {
  object: 'resource_link' as const,
  id: 'rlink_1',
  file_id: 'file_1',
  app_id: '876-projects',
  resource_type: 'issue',
  resource_id: 'iss_1',
  relation: 'attachment',
  created_by: 'usr_author',
  created_at: 1_700_000_000,
}

const secondLink = {
  ...link,
  id: 'rlink_2',
  file_id: 'file_2',
  created_by: 'usr_9',
}

function file(overrides: Record<string, unknown> = {}) {
  return {
    object: 'file' as const,
    id: 'file_1',
    owner_type: 'organization' as const,
    owner_id: 'org_1',
    source_app_id: '876-projects',
    purpose: 'projects_attachment',
    category: 'attachment' as const,
    audience: 'organization' as const,
    status: 'ready' as const,
    original_name: 'plan.pdf',
    content_type: 'application/pdf',
    size_bytes: 2048,
    version_id: 'ver_1',
    url: null,
    created_at: 1_700_000_000,
    updated_at: 1_700_000_000,
    ...overrides,
  }
}

function panelProps() {
  return mocks.panel.mock.calls[0][0] as Record<string, unknown>
}

function props(overrides: Record<string, unknown> = {}) {
  return {
    orgId: 'org_1',
    userId: 'usr_viewer',
    resourceType: 'issue' as const,
    resourceId: 'iss_1',
    canEdit: true,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.linksList.mockResolvedValue({
    data: { object: 'list', data: [link, secondLink] },
    error: null,
  })
  mocks.fileRetrieve.mockImplementation(async (fileId: string) =>
    fileId === 'file_1'
      ? { data: file(), error: null }
      : {
          data: file({
            id: 'file_2',
            original_name: 'board.png',
            content_type: 'image/png',
            size_bytes: 512,
          }),
          error: null,
        }
  )
  mocks.createReadUrl.mockResolvedValue({
    data: {
      object: 'read_url',
      url: 'https://r2.example.test/read/1',
      expires_at: 1_700_000_600,
    },
    error: null,
  })
  mocks.memberLabels.mockResolvedValue({
    labels: { usr_author: 'Ada Lovelace' },
    error: null,
  })
})

describe('AttachmentsData', () => {
  it('reads the record’s links for this app and relation as the acting org', async () => {
    render(await AttachmentsData(props()))

    expect(mocks.linksList).toHaveBeenCalledWith(
      {
        app_id: '876-projects',
        resource_type: 'issue',
        resource_id: 'iss_1',
        relation: 'attachment',
      },
      {
        sourceAppId: '876-projects',
        actorUserId: 'usr_viewer',
        actorOrgId: 'org_1',
      }
    )
  })

  it('resolves each row from Storage metadata and a signed read URL', async () => {
    render(await AttachmentsData(props()))

    expect(mocks.fileRetrieve).toHaveBeenCalledWith('file_1', {
      sourceAppId: '876-projects',
      actorUserId: 'usr_viewer',
      actorOrgId: 'org_1',
    })
    expect(panelProps().rows).toEqual([
      {
        linkId: 'rlink_1',
        fileId: 'file_1',
        name: 'plan.pdf',
        sizeBytes: 2048,
        contentType: 'application/pdf',
        addedByLabel: 'Ada Lovelace',
        downloadUrl: 'https://r2.example.test/read/1',
      },
      {
        linkId: 'rlink_2',
        fileId: 'file_2',
        name: 'board.png',
        sizeBytes: 512,
        contentType: 'image/png',
        addedByLabel: 'usr_9',
        downloadUrl: 'https://r2.example.test/read/1',
      },
    ])
  })

  it('hands the record and the edit flag to the panel', async () => {
    render(
      await AttachmentsData(
        props({ resourceType: 'project', resourceId: 'prj_1', canEdit: false })
      )
    )

    expect(panelProps()).toMatchObject({
      resourceType: 'project',
      resourceId: 'prj_1',
      canEdit: false,
    })
  })

  it('keeps a row when the file behind the link can no longer be read', async () => {
    mocks.fileRetrieve.mockResolvedValue({
      data: null,
      error: {
        code: 'storage/file-not-found',
        message: 'That file could not be found.',
      },
    })

    render(await AttachmentsData(props()))

    expect(panelProps().rows).toEqual([
      expect.objectContaining({
        linkId: 'rlink_1',
        fileId: 'file_1',
        name: 'File unavailable',
        downloadUrl: null,
      }),
      expect.objectContaining({ linkId: 'rlink_2', name: 'File unavailable' }),
    ])
  })

  it('keeps a row when only the read URL could not be minted', async () => {
    mocks.createReadUrl.mockResolvedValue({
      data: null,
      error: {
        code: 'storage/provider-error',
        message: 'The Storage service could not complete the request.',
      },
    })

    render(await AttachmentsData(props()))

    expect(panelProps().rows).toEqual([
      expect.objectContaining({ linkId: 'rlink_1', downloadUrl: null }),
      expect.objectContaining({ linkId: 'rlink_2', downloadUrl: null }),
    ])
  })

  it('passes an empty record through as no rows', async () => {
    mocks.linksList.mockResolvedValue({
      data: { object: 'list', data: [] },
      error: null,
    })

    render(await AttachmentsData(props()))

    expect(panelProps().rows).toEqual([])
  })

  it('shows the failure instead of an empty panel when the links cannot be read', async () => {
    mocks.linksList.mockResolvedValue({
      data: null,
      error: {
        code: 'storage/provider-error',
        message: 'The Storage service could not complete the request.',
      },
    })

    render(await AttachmentsData(props()))

    expect(
      screen.getByText('Attachments could not be loaded')
    ).toBeInTheDocument()
    expect(mocks.panel).not.toHaveBeenCalled()
  })
})

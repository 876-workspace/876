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

vi.mock('@/lib/clients/storage', () => ({
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

const projectLink = {
  ...link,
  id: 'rlink_7',
  file_id: 'file_7',
  resource_type: 'project',
  resource_id: 'prj_1',
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
    projectId: 'prj_1',
    resourceType: 'issue' as const,
    resourceId: 'iss_1',
    canEdit: true,
    ...overrides,
  }
}

/** Answers by record, the way Storage does: one resource per read. */
function linksByResource() {
  return async (params: { resource_id: string }) =>
    params.resource_id === 'prj_1'
      ? { data: { object: 'list', data: [projectLink] }, error: null }
      : { data: { object: 'list', data: [link, secondLink] }, error: null }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.linksList.mockImplementation(linksByResource())
  mocks.fileRetrieve.mockImplementation(async (fileId: string) => {
    if (fileId === 'file_1') return { data: file(), error: null }
    if (fileId === 'file_7')
      return {
        data: file({
          id: 'file_7',
          original_name: 'project-brief.pdf',
          content_type: 'application/pdf',
          size_bytes: 8192,
        }),
        error: null,
      }

    return {
      data: file({
        id: 'file_2',
        original_name: 'board.png',
        content_type: 'image/png',
        size_bytes: 512,
      }),
      error: null,
    }
  })
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

  it('reads the project’s files so the record can re-attach one', async () => {
    render(await AttachmentsData(props()))

    expect(mocks.linksList).toHaveBeenCalledWith(
      {
        app_id: '876-projects',
        resource_type: 'project',
        resource_id: 'prj_1',
        relation: 'attachment',
      },
      {
        sourceAppId: '876-projects',
        actorUserId: 'usr_viewer',
        actorOrgId: 'org_1',
      }
    )
    expect(panelProps().existingFiles).toEqual([
      { fileId: 'file_7', name: 'project-brief.pdf', sizeBytes: 8192 },
    ])
  })

  it('leaves the files the record already holds out of the re-attach list', async () => {
    mocks.linksList.mockImplementation(
      async (params: { resource_id: string }) =>
        params.resource_id === 'prj_1'
          ? {
              data: {
                object: 'list',
                data: [
                  projectLink,
                  { ...projectLink, id: 'rlink_1', file_id: 'file_1' },
                ],
              },
              error: null,
            }
          : { data: { object: 'list', data: [link, secondLink] }, error: null }
    )

    render(await AttachmentsData(props()))

    expect(panelProps().existingFiles).toEqual([
      { fileId: 'file_7', name: 'project-brief.pdf', sizeBytes: 8192 },
    ])
  })

  it('reads nothing extra for a project record, whose files are its own rows', async () => {
    render(
      await AttachmentsData(
        props({ resourceType: 'project', resourceId: 'prj_1' })
      )
    )

    expect(mocks.linksList).toHaveBeenCalledTimes(1)
    expect(panelProps().existingFiles).toEqual([])
  })

  it('reads nothing extra for a reader who cannot attach', async () => {
    render(await AttachmentsData(props({ canEdit: false })))

    expect(mocks.linksList).toHaveBeenCalledTimes(1)
    expect(panelProps().existingFiles).toEqual([])
  })

  it('keeps the panel and reports a project file read that failed', async () => {
    mocks.linksList.mockImplementation(
      async (params: { resource_id: string }) =>
        params.resource_id === 'prj_1'
          ? {
              data: null,
              error: {
                code: 'storage/provider-error',
                message: 'The Storage service could not complete the request.',
              },
            }
          : { data: { object: 'list', data: [link, secondLink] }, error: null }
    )

    render(await AttachmentsData(props()))

    expect(
      screen.getByText('Existing files could not be loaded')
    ).toBeInTheDocument()
    expect(screen.getByText('Attachments panel')).toBeInTheDocument()
    expect(panelProps().existingFiles).toEqual([])
  })
})

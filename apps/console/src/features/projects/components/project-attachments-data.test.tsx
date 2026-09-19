// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mocks = vi.hoisted(() => ({
  listLinks: vi.fn(),
  retrieveFile: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/projects/projects/proj_test/attachments',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/clients/storage', () => ({
  storage: {
    resourceLinks: {
      list: mocks.listLinks,
    },
    files: {
      retrieve: mocks.retrieveFile,
    },
  },
}))

import { AttachmentsData } from './attachments-data'

const link = {
  object: 'resource_link',
  id: 'rlink_1',
  file_id: 'file_1',
  app_id: '876-projects',
  resource_type: 'project',
  resource_id: 'proj_test',
  relation: 'attachment',
  created_by: 'user_lead',
  created_at: 1700000000,
}

const file = {
  object: 'file',
  id: 'file_1',
  original_name: 'static-fire-report.pdf',
  content_type: 'application/pdf',
  size_bytes: 1048576,
}

afterEach(cleanup)

describe('AttachmentsData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listLinks.mockResolvedValue({
      data: { object: 'list', data: [link] },
      error: null,
    })
    mocks.retrieveFile.mockResolvedValue({ data: file, error: null })
  })

  it('renders file names, sizes, and types without download links', async () => {
    const element = await AttachmentsData({
      organizationId: 'org_1',
      resourceType: 'project',
      resourceId: 'proj_test',
      actorUserId: 'user_lead',
    })
    render(element)

    expect(mocks.listLinks).toHaveBeenCalledWith(
      {
        app_id: '876-projects',
        resource_type: 'project',
        resource_id: 'proj_test',
        relation: 'attachment',
      },
      {
        sourceAppId: '876-projects',
        actorUserId: 'user_lead',
        actorOrgId: 'org_1',
      }
    )
    expect(screen.getByText('static-fire-report.pdf')).toBeInTheDocument()
    expect(screen.getByText('1 MB')).toBeInTheDocument()
    expect(screen.getByText('application/pdf')).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('shows an empty state when there are no attachments', async () => {
    mocks.listLinks.mockResolvedValue({
      data: { object: 'list', data: [] },
      error: null,
    })

    render(
      await AttachmentsData({
        organizationId: 'org_1',
        resourceType: 'project',
        resourceId: 'proj_test',
        actorUserId: null,
      })
    )

    expect(screen.getByText('No attachments.')).toBeInTheDocument()
  })

  it('shows a banner when the link list cannot be loaded', async () => {
    mocks.listLinks.mockResolvedValue({
      data: null,
      error: { code: 'storage/unavailable', message: 'boom' },
    })

    render(
      await AttachmentsData({
        organizationId: 'org_1',
        resourceType: 'project',
        resourceId: 'proj_test',
        actorUserId: null,
      })
    )

    expect(
      screen.getByText('Attachment data could not be loaded')
    ).toBeInTheDocument()
  })
})

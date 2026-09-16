/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  uploadFile: vi.fn(),
  removeLink: vi.fn(),
  link: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/lib/client/attachments', () => ({
  attachmentsClient: {
    uploadFile: mocks.uploadFile,
    removeLink: mocks.removeLink,
    link: mocks.link,
  },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

import {
  AttachmentsPanel,
  type AttachmentCandidate,
  type AttachmentRow,
} from '@/features/projects/components/attachments-panel'

const rows: AttachmentRow[] = [
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
    downloadUrl: null,
  },
]

const existingFiles: AttachmentCandidate[] = [
  { fileId: 'file_7', name: 'kickoff-notes.pdf', sizeBytes: 4096 },
  { fileId: 'file_8', name: 'mood-board.png', sizeBytes: null },
]

function renderPanel(
  overrides: Partial<Parameters<typeof AttachmentsPanel>[0]> = {}
) {
  return render(
    <AttachmentsPanel
      resourceType="issue"
      resourceId="iss_1"
      rows={rows}
      existingFiles={existingFiles}
      canEdit
      {...overrides}
    />
  )
}

function attachmentFile() {
  return new File(['a,b\n1\n'], 'plan.csv', { type: 'text/csv' })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.uploadFile.mockResolvedValue({
    data: { linkId: 'rlink_3', fileId: 'file_3' },
    error: null,
  })
  mocks.removeLink.mockResolvedValue({
    data: { object: 'resource_link', id: 'rlink_1', deleted: true },
    error: null,
  })
  mocks.link.mockResolvedValue({
    data: { linkId: 'rlink_7', fileId: 'file_7' },
    error: null,
  })
})

describe('AttachmentsPanel', () => {
  it('shows the name, size, content type and author of each file', () => {
    renderPanel()

    expect(screen.getByText('plan.pdf')).toBeInTheDocument()
    expect(
      screen.getByText('2 KB · application/pdf · Added by Ada Lovelace')
    ).toBeInTheDocument()
    expect(screen.getByText('board.png')).toBeInTheDocument()
    expect(
      screen.getByText('512 B · image/png · Added by usr_9')
    ).toBeInTheDocument()
  })

  it('shows a short empty state when nothing is attached', () => {
    renderPanel({ rows: [] })

    expect(screen.getByText('No attachments yet.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('downloads through the signed URL Storage returned', () => {
    renderPanel()

    expect(screen.getByLabelText('Download plan.pdf')).toHaveAttribute(
      'href',
      'https://r2.example.test/read/1'
    )
    expect(
      screen.queryByLabelText('Download board.png')
    ).not.toBeInTheDocument()
  })

  it('removes one attachment by its link id', async () => {
    renderPanel()

    await userEvent.click(screen.getByLabelText('Remove plan.pdf'))

    expect(mocks.removeLink).toHaveBeenCalledTimes(1)
    expect(mocks.removeLink).toHaveBeenCalledWith('rlink_1', {
      resourceType: 'issue',
      resourceId: 'iss_1',
    })
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it('keeps the row and shows the failure when removal fails', async () => {
    mocks.removeLink.mockResolvedValue({
      data: null,
      error: {
        code: 'storage/provider-error',
        message: 'The Storage service could not complete the request.',
      },
    })

    renderPanel()
    await userEvent.click(screen.getByLabelText('Remove plan.pdf'))

    expect(screen.getByText('Attachment not saved')).toBeInTheDocument()
    expect(
      screen.getByText('The Storage service could not complete the request.')
    ).toBeInTheDocument()
    expect(screen.getByText('plan.pdf')).toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('uploads a chosen file and refreshes the record', async () => {
    renderPanel()

    await userEvent.upload(
      screen.getByLabelText('Choose a file to attach'),
      attachmentFile()
    )

    expect(mocks.uploadFile).toHaveBeenCalledTimes(1)
    expect(mocks.uploadFile.mock.calls[0][0]).toMatchObject({
      resourceType: 'issue',
      resourceId: 'iss_1',
    })
    expect(mocks.uploadFile.mock.calls[0][0].file).toBeInstanceOf(File)
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it('shows a failed upload inline without refreshing', async () => {
    mocks.uploadFile.mockResolvedValue({
      data: null,
      error: {
        code: 'storage/file-too-large',
        message: 'The file is larger than this upload allows.',
      },
    })

    renderPanel()
    await userEvent.upload(
      screen.getByLabelText('Choose a file to attach'),
      attachmentFile()
    )

    expect(
      screen.getByText('The file is larger than this upload allows.')
    ).toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('reports the upload fraction while the file is in flight', async () => {
    let finish: (value: unknown) => void = () => {}
    mocks.uploadFile.mockImplementation(
      (params: { onProgress?: (fraction: number) => void }) => {
        params.onProgress?.(0.42)
        return new Promise((resolve) => {
          finish = resolve
        })
      }
    )

    renderPanel()
    await userEvent.upload(
      screen.getByLabelText('Choose a file to attach'),
      attachmentFile()
    )

    expect(screen.getByRole('status')).toHaveTextContent('Uploading 42%')

    finish({ data: { linkId: 'rlink_3', fileId: 'file_3' }, error: null })
  })

  it('offers no upload or removal to a reader without edit rights', () => {
    renderPanel({ canEdit: false })

    expect(
      screen.queryByLabelText('Choose a file to attach')
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Remove plan.pdf')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Download plan.pdf')).toBeInTheDocument()
  })

  it('lists the files the project already holds behind the existing-file action', async () => {
    renderPanel()

    expect(
      screen.queryByLabelText('Files already in this project')
    ).not.toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: 'Attach existing file' })
    )

    const list = screen.getByLabelText('Files already in this project')
    expect(within(list).getByText('kickoff-notes.pdf')).toBeInTheDocument()
    expect(within(list).getByText('4 KB')).toBeInTheDocument()
    expect(within(list).getByText('mood-board.png')).toBeInTheDocument()
  })

  it('links the chosen existing file once, with its file id', async () => {
    renderPanel()

    await userEvent.click(
      screen.getByRole('button', { name: 'Attach existing file' })
    )
    await userEvent.click(screen.getByLabelText('Attach kickoff-notes.pdf'))

    expect(mocks.link).toHaveBeenCalledTimes(1)
    expect(mocks.link).toHaveBeenCalledWith({
      fileId: 'file_7',
      resourceType: 'issue',
      resourceId: 'iss_1',
    })
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it('keeps the picker open and reports the failure when linking fails', async () => {
    mocks.link.mockResolvedValue({
      data: null,
      error: {
        code: 'storage/file-not-found',
        message: 'That file could not be found.',
      },
    })

    renderPanel()

    await userEvent.click(
      screen.getByRole('button', { name: 'Attach existing file' })
    )
    await userEvent.click(screen.getByLabelText('Attach kickoff-notes.pdf'))

    expect(
      screen.getByText('That file could not be found.')
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText('Files already in this project')
    ).toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('offers no existing-file action when the project holds no other file', () => {
    renderPanel({ existingFiles: [] })

    expect(
      screen.queryByRole('button', { name: 'Attach existing file' })
    ).not.toBeInTheDocument()
  })

  it('offers no existing-file action to a reader without edit rights', () => {
    renderPanel({ canEdit: false })

    expect(
      screen.queryByRole('button', { name: 'Attach existing file' })
    ).not.toBeInTheDocument()
  })
})

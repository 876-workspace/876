/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  start: vi.fn(),
  complete: vi.fn(),
  remove: vi.fn(),
  putDirectToStorage: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('@/lib/client', () => ({
  client: {
    apps: {
      startImageUpload: mocks.start,
      completeImageUpload: mocks.complete,
      removeImage: mocks.remove,
    },
    organizations: {
      startImageUpload: vi.fn(),
      completeImageUpload: vi.fn(),
      removeImage: vi.fn(),
    },
    users: {
      startImageUpload: vi.fn(),
      completeImageUpload: vi.fn(),
      removeImage: vi.fn(),
    },
  },
}))

vi.mock('@/lib/client/upload', () => ({
  putDirectToStorage: mocks.putDirectToStorage,
}))

import { ChangeImageDialog } from './change-image-dialog'

const uploadSession = {
  object: 'upload_session' as const,
  id: 'upl_123',
  file_id: 'file_new',
  upload_url: 'https://r2.example.test/signed',
  method: 'PUT' as const,
  headers: {
    'Content-Type': 'image/png',
    'Content-Length': '4',
  },
  expires_at: 2_000_000_000,
}

const completedFile = {
  object: 'file' as const,
  id: 'file_new',
  owner_type: 'platform' as const,
  owner_id: 'app_123',
  status: 'ready' as const,
  url: 'https://assets.876.test/new.png',
}

function renderDialog(currentFileId: string | null = 'file_old') {
  return render(
    <ChangeImageDialog
      entity="app"
      routeKey="app.logo"
      ownerId="app_123"
      currentImageUrl="https://assets.876.test/old.png"
      currentFileId={currentFileId}
      fallbackName="Couriers"
      imageKind="logo"
    >
      <span data-testid="existing-image">C</span>
    </ChangeImageDialog>
  )
}

function pngFile(bytes: BlobPart = 'logo') {
  return new File([bytes], 'logo.png', { type: 'image/png' })
}

async function openDialog() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Change logo' }))
  return user
}

describe('ChangeImageDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:preview'),
      revokeObjectURL: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses a keyboard-reachable labelled button to open the dialog', async () => {
    renderDialog()
    const user = userEvent.setup()
    const trigger = screen.getByRole('button', { name: 'Change logo' })

    trigger.focus()
    expect(trigger).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(await screen.findByRole('dialog')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Change logo' })).toBeVisible()
  })

  it('rejects a disallowed type without calling the client', async () => {
    renderDialog()
    await openDialog()
    const file = new File(['<svg />'], 'logo.svg', {
      type: 'image/svg+xml',
    })

    fireEvent.change(screen.getByLabelText('Select logo'), {
      target: { files: [file] },
    })

    expect(
      await screen.findByText('Choose a PNG, JPEG, or WebP image.')
    ).toBeVisible()
    expect(mocks.start).not.toHaveBeenCalled()
  })

  it('rejects an oversized file without calling the client', async () => {
    renderDialog()
    const user = await openDialog()
    const file = pngFile(new Uint8Array(5 * 1024 * 1024 + 1))

    await user.upload(screen.getByLabelText('Select logo'), file)

    expect(
      await screen.findByText('Choose an image no larger than 5 MiB.')
    ).toBeVisible()
    expect(mocks.start).not.toHaveBeenCalled()
  })

  it('calls start, direct PUT, and complete in order with expected arguments', async () => {
    mocks.start.mockResolvedValue({ data: uploadSession, error: null })
    mocks.putDirectToStorage.mockResolvedValue({
      ok: true,
      status: 200,
      body: '',
    })
    mocks.complete.mockResolvedValue({ data: completedFile, error: null })
    renderDialog()
    const user = await openDialog()
    const file = pngFile()

    await user.upload(screen.getByLabelText('Select logo'), file)
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mocks.complete).toHaveBeenCalledTimes(1))
    expect(mocks.start).toHaveBeenCalledWith('app_123', {
      route_key: 'app.logo',
      file_name: 'logo.png',
      content_type: 'image/png',
      size_bytes: file.size,
    })
    expect(mocks.putDirectToStorage).toHaveBeenCalledWith({
      url: uploadSession.upload_url,
      method: 'PUT',
      headers: uploadSession.headers,
      file,
      onProgress: expect.any(Function),
    })
    expect(mocks.complete).toHaveBeenCalledWith('app_123', {
      id: 'upl_123',
    })
    expect(mocks.start.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.putDirectToStorage.mock.invocationCallOrder[0]
    )
    expect(mocks.putDirectToStorage.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.complete.mock.invocationCallOrder[0]
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it.each([
    {
      stage: 'start',
      setup: () =>
        mocks.start.mockResolvedValue({
          data: null,
          error: { code: 'storage/start', message: 'Start failed.' },
        }),
      message: 'Start failed.',
    },
    {
      stage: 'upload',
      setup: () => {
        mocks.start.mockResolvedValue({ data: uploadSession, error: null })
        mocks.putDirectToStorage.mockResolvedValue({
          ok: false,
          status: 500,
          body: '',
        })
      },
      message: 'The image could not be uploaded (HTTP 500). Please try again.',
    },
    {
      stage: 'complete',
      setup: () => {
        mocks.start.mockResolvedValue({ data: uploadSession, error: null })
        mocks.putDirectToStorage.mockResolvedValue({
          ok: true,
          status: 200,
          body: '',
        })
        mocks.complete.mockResolvedValue({
          data: null,
          error: { code: 'storage/complete', message: 'Complete failed.' },
        })
      },
      message: 'Complete failed.',
    },
  ])(
    'surfaces a $stage error and leaves the dialog usable',
    async (testCase) => {
      testCase.setup()
      renderDialog()
      const user = await openDialog()

      await user.upload(screen.getByLabelText('Select logo'), pngFile())
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(await screen.findByText(testCase.message)).toBeVisible()
      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
      expect(screen.getByRole('dialog')).toBeVisible()
    }
  )

  it('calls the resource remove endpoint', async () => {
    mocks.remove.mockResolvedValue({
      data: { object: 'file', id: 'file_old', deleted: true },
      error: null,
    })
    renderDialog()
    const user = await openDialog()

    await user.click(screen.getByRole('button', { name: 'Remove' }))

    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith('app_123'))
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })
})

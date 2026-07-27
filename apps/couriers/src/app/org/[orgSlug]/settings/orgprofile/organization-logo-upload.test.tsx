/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  request: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))
vi.mock('@/lib/client/request', () => ({
  request: mocks.request,
}))

import { OrganizationLogoUpload } from './organization-logo-upload'

const oldLogoUrl = 'https://assets.876.test/logo-old.png'
const newLogoUrl = 'https://assets.876.test/logo-new.png'
const uploadSession = {
  object: 'upload_session',
  id: 'upl_123',
  file_id: 'file_new',
  upload_url: 'https://r2.example.test/signed',
  method: 'PUT',
  headers: {
    'Content-Type': 'image/png',
    'Content-Length': '4',
  },
  expires_at: 2_000_000_000,
}

function renderUpload(
  overrides: Partial<React.ComponentProps<typeof OrganizationLogoUpload>> = {}
) {
  return render(
    <OrganizationLogoUpload
      orgSlug="island-logistics"
      orgName="Island Logistics"
      logoUrl={oldLogoUrl}
      canEdit
      featureEnabled
      {...overrides}
    />
  )
}

function pngFile(name = 'logo.png', bytes: BlobPart = 'logo') {
  return new File([bytes], name, { type: 'image/png' })
}

describe('OrganizationLogoUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('client-side validation', () => {
    it('rejects a bad MIME type before starting an upload', async () => {
      renderUpload()

      const file = new File(['<svg />'], 'logo.svg', {
        type: 'image/svg+xml',
      })
      fireEvent.change(screen.getByLabelText('Organization logo'), {
        target: { files: [file] },
      })

      expect(
        await screen.findByText('Choose a PNG, JPEG, or WebP image.')
      ).toBeVisible()
      expect(mocks.request).not.toHaveBeenCalled()
    })

    it('rejects an oversized file before starting an upload', async () => {
      const user = userEvent.setup()
      renderUpload()

      const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'logo.png', {
        type: 'image/png',
      })
      await user.upload(screen.getByLabelText('Organization logo'), file)

      expect(
        await screen.findByText('Choose an image no larger than 5 MiB.')
      ).toBeVisible()
      expect(mocks.request).not.toHaveBeenCalled()
    })

    it('rejects an empty file before starting an upload', async () => {
      renderUpload()

      const file = new File([], 'logo.png', { type: 'image/png' })
      fireEvent.change(screen.getByLabelText('Organization logo'), {
        target: { files: [file] },
      })

      expect(await screen.findByText('Choose a non-empty image.')).toBeVisible()
      expect(mocks.request).not.toHaveBeenCalled()
    })

    it.each([
      ['image/jpeg', 'logo.jpg'],
      ['image/webp', 'logo.webp'],
      ['image/png', 'logo.png'],
    ] as const)('accepts %s for upload start', async (type, name) => {
      mocks.request.mockResolvedValueOnce({
        data: uploadSession,
        error: null,
      })
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response(null, { status: 500 }))
      )
      renderUpload()

      const file = new File(['logo'], name, { type })
      fireEvent.change(screen.getByLabelText('Organization logo'), {
        target: { files: [file] },
      })

      await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(1))
      expect(mocks.request).toHaveBeenCalledWith(
        '/api/manage/settings/orglogo',
        {
          method: 'POST',
          body: JSON.stringify({
            orgSlug: 'island-logistics',
            file_name: name,
            content_type: type,
            size_bytes: file.size,
          }),
        }
      )
    })
  })

  describe('permissions and feature flag', () => {
    it('renders the existing logo but disables replacement when editing is unavailable', () => {
      const { container } = renderUpload({ canEdit: false })

      expect(screen.getByRole('button', { name: 'Replace' })).toBeDisabled()
      expect(screen.getByLabelText('Organization logo')).toBeDisabled()
      expect(container.querySelector('img')).toHaveAttribute('src', oldLogoUrl)
    })

    it('renders the existing logo but disables replacement when the feature is off', () => {
      const { container } = renderUpload({ featureEnabled: false })

      expect(screen.getByRole('button', { name: 'Replace' })).toBeDisabled()
      expect(container.querySelector('img')).toHaveAttribute('src', oldLogoUrl)
      expect(mocks.request).not.toHaveBeenCalled()
    })

    it('labels the action Upload when there is no existing logo', () => {
      renderUpload({ logoUrl: null })

      expect(screen.getByRole('button', { name: 'Upload' })).toBeEnabled()
      expect(screen.queryByRole('button', { name: 'Replace' })).toBeNull()
    })

    it('does not start an upload when disabled even if a file is selected', async () => {
      renderUpload({ canEdit: false })

      fireEvent.change(screen.getByLabelText('Organization logo'), {
        target: { files: [pngFile()] },
      })

      await waitFor(() => expect(mocks.request).not.toHaveBeenCalled())
    })
  })

  describe('upload lifecycle', () => {
    it('keeps the existing logo when the R2 upload fails', async () => {
      mocks.request.mockResolvedValueOnce({
        data: uploadSession,
        error: null,
      })
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response(null, { status: 500 }))
      )
      const { container } = renderUpload()

      fireEvent.change(screen.getByLabelText('Organization logo'), {
        target: { files: [pngFile()] },
      })

      expect(
        await screen.findByText(
          'The image could not be uploaded (HTTP 500). Please try again.'
        )
      ).toBeVisible()
      expect(container.querySelector('img')).toHaveAttribute('src', oldLogoUrl)
      expect(mocks.request).toHaveBeenCalledTimes(1)
      expect(mocks.refresh).not.toHaveBeenCalled()
    })

    it('keeps the existing logo when the R2 fetch throws a network error', async () => {
      mocks.request.mockResolvedValueOnce({
        data: uploadSession,
        error: null,
      })
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
      )
      const { container } = renderUpload()

      fireEvent.change(screen.getByLabelText('Organization logo'), {
        target: { files: [pngFile()] },
      })

      expect(
        await screen.findByText(
          'The image could not be uploaded — the storage service is unreachable. Check your connection and try again.'
        )
      ).toBeVisible()
      expect(container.querySelector('img')).toHaveAttribute('src', oldLogoUrl)
      expect(mocks.refresh).not.toHaveBeenCalled()
    })

    it.each([
      {
        name: 'names a misconfigured provider on a signature rejection',
        status: 400,
        body: '<?xml version="1.0" encoding="UTF-8"?><Error><Code>InvalidArgument</Code><Message>Credential access key has length 0, should be 32</Message></Error>',
        expected:
          'The storage service rejected the upload (InvalidArgument). This is a server configuration problem, not a problem with your image.',
      },
      {
        name: 'reports an expired link on a denied upload',
        status: 403,
        body: '<Error><Code>AccessDenied</Code></Error>',
        expected: 'The upload link has expired. Try again.',
      },
      {
        name: 'reports a size rejection from the provider',
        status: 413,
        body: '<Error><Code>EntityTooLarge</Code></Error>',
        expected: 'The image is larger than the storage service accepts.',
      },
      {
        name: 'falls back to the status when the body carries no code',
        status: 400,
        body: '',
        expected:
          'The storage service rejected the upload (HTTP 400). This is a server configuration problem, not a problem with your image.',
      },
    ])('$name', async ({ status, body, expected }) => {
      mocks.request.mockResolvedValueOnce({
        data: uploadSession,
        error: null,
      })
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response(body, { status }))
      )
      const { container } = renderUpload()

      fireEvent.change(screen.getByLabelText('Organization logo'), {
        target: { files: [pngFile()] },
      })

      expect(await screen.findByText(expected)).toBeVisible()
      expect(container.querySelector('img')).toHaveAttribute('src', oldLogoUrl)
      expect(mocks.request).toHaveBeenCalledTimes(1)
      expect(mocks.refresh).not.toHaveBeenCalled()
    })

    it('keeps the existing logo when start fails', async () => {
      const r2Fetch = vi.fn()
      vi.stubGlobal('fetch', r2Fetch)
      mocks.request.mockResolvedValueOnce({
        data: null,
        error: {
          code: 'storage/forbidden',
          message: 'Organization logo uploads are not enabled.',
        },
      })
      const { container } = renderUpload()

      fireEvent.change(screen.getByLabelText('Organization logo'), {
        target: { files: [pngFile()] },
      })

      expect(
        await screen.findByText('Organization logo uploads are not enabled.')
      ).toBeVisible()
      expect(container.querySelector('img')).toHaveAttribute('src', oldLogoUrl)
      expect(mocks.refresh).not.toHaveBeenCalled()
      expect(r2Fetch).not.toHaveBeenCalled()
      expect(mocks.request).toHaveBeenCalledTimes(1)
    })

    it('keeps the existing logo when complete fails after a successful R2 PUT', async () => {
      mocks.request
        .mockResolvedValueOnce({ data: uploadSession, error: null })
        .mockResolvedValueOnce({
          data: null,
          error: {
            code: 'storage/upload-verification-failed',
            message:
              'The uploaded file could not be verified. Please try again.',
          },
        })
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
      )
      const { container } = renderUpload()

      fireEvent.change(screen.getByLabelText('Organization logo'), {
        target: { files: [pngFile()] },
      })

      expect(
        await screen.findByText(
          'The uploaded file could not be verified. Please try again.'
        )
      ).toBeVisible()
      expect(container.querySelector('img')).toHaveAttribute('src', oldLogoUrl)
      expect(mocks.request).toHaveBeenCalledTimes(2)
      expect(mocks.refresh).not.toHaveBeenCalled()
    })

    it('replaces the rendered logo only after successful completion', async () => {
      const user = userEvent.setup()
      mocks.request
        .mockResolvedValueOnce({ data: uploadSession, error: null })
        .mockResolvedValueOnce({
          data: {
            object: 'file',
            id: 'file_new',
            status: 'ready',
            url: newLogoUrl,
          },
          error: null,
        })
      const r2Fetch = vi
        .fn()
        .mockResolvedValue(new Response(null, { status: 200 }))
      vi.stubGlobal('fetch', r2Fetch)
      const { container } = renderUpload()

      const file = pngFile()
      await user.upload(screen.getByLabelText('Organization logo'), file)

      await waitFor(() =>
        expect(container.querySelector('img')).toHaveAttribute(
          'src',
          newLogoUrl
        )
      )
      expect(r2Fetch).toHaveBeenCalledWith(uploadSession.upload_url, {
        method: 'PUT',
        headers: uploadSession.headers,
        body: file,
      })
      expect(mocks.request).toHaveBeenNthCalledWith(
        2,
        '/api/manage/settings/orglogo/complete',
        {
          method: 'POST',
          body: JSON.stringify({
            orgSlug: 'island-logistics',
            id: 'upl_123',
          }),
        }
      )
      expect(mocks.refresh).toHaveBeenCalledTimes(1)
    })

    it('shows progress labels while the upload is in flight', async () => {
      let resolveStart!: (value: unknown) => void
      mocks.request.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveStart = resolve
          })
      )
      // Fail the R2 step so the test can finish cleanly after start resolves
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response(null, { status: 500 }))
      )
      renderUpload()

      fireEvent.change(screen.getByLabelText('Organization logo'), {
        target: { files: [pngFile()] },
      })

      expect(await screen.findByText('Preparing…')).toBeVisible()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Replace' })).toBeDisabled()

      resolveStart({ data: uploadSession, error: null })

      await screen.findByText(
        'The image could not be uploaded (HTTP 500). Please try again.'
      )
    })

    it('uploads a dropped file through the same start → R2 → complete path', async () => {
      mocks.request
        .mockResolvedValueOnce({ data: uploadSession, error: null })
        .mockResolvedValueOnce({
          data: {
            object: 'file',
            id: 'file_new',
            status: 'ready',
            url: newLogoUrl,
          },
          error: null,
        })
      const r2Fetch = vi
        .fn()
        .mockResolvedValue(new Response(null, { status: 200 }))
      vi.stubGlobal('fetch', r2Fetch)
      const { container } = renderUpload()

      const file = pngFile()
      const dropTarget =
        screen.getByLabelText('Organization logo').parentElement
      expect(dropTarget).not.toBeNull()

      fireEvent.drop(dropTarget as HTMLElement, {
        dataTransfer: { files: [file] },
      })

      await waitFor(() =>
        expect(container.querySelector('img')).toHaveAttribute(
          'src',
          newLogoUrl
        )
      )
      expect(r2Fetch).toHaveBeenCalledTimes(1)
      expect(mocks.refresh).toHaveBeenCalledTimes(1)
    })
  })
})

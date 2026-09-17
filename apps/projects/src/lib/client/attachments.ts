'use client'

import type {
  AttachmentLinkRef,
  AttachmentResourceRef,
  AttachmentUploadSession,
} from '@/types/attachments'

import { request, type ClientResult } from './request'

type UploadSessionParams = AttachmentResourceRef & {
  fileName: string
  contentType: string
  sizeBytes: number
}

type CompleteUploadParams = AttachmentResourceRef & { sessionId: string }

type LinkFileParams = AttachmentResourceRef & { fileId: string }

type UploadFileParams = AttachmentResourceRef & {
  file: File
  onProgress?: (fraction: number) => void
}

type PutResult = { ok: boolean; status: number }

/**
 * `PUT`s the bytes straight to the signed provider URL, reporting progress.
 *
 * `fetch` cannot report the fraction of a request body that has been sent, and
 * this is the one request in the flow long enough for a user to watch. The
 * bytes never pass through a Projects route handler — the URL is the provider's.
 */
function putToSignedUrl(
  session: AttachmentUploadSession,
  file: File,
  onProgress?: (fraction: number) => void
): Promise<PutResult> {
  return new Promise<PutResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(session.method, session.uploadUrl, true)

    for (const [name, value] of Object.entries(session.headers))
      xhr.setRequestHeader(name, value)

    if (onProgress)
      xhr.upload.addEventListener('progress', (event) => {
        if (!event.lengthComputable || event.total <= 0) return

        onProgress(Math.min(1, event.loaded / event.total))
      })

    xhr.addEventListener('load', () => {
      onProgress?.(1)
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status })
    })
    xhr.addEventListener('error', () =>
      reject(new TypeError('Failed to fetch'))
    )
    xhr.addEventListener('abort', () =>
      reject(new DOMException('Upload aborted', 'AbortError'))
    )

    xhr.send(file)
  })
}

function uploadFailure(status: number): { code: string; message: string } {
  if (status === 403)
    return {
      code: 'storage/upload-expired',
      message:
        'The upload link expired before the file finished sending. Try again.',
    }
  if (status === 413)
    return {
      code: 'storage/file-too-large',
      message: 'The file is larger than this upload allows.',
    }

  return {
    code: 'storage/provider-error',
    message: `The storage provider refused the upload (status ${status}).`,
  }
}

/**
 * The browser half of a Projects attachment.
 *
 * An upload is three requests, and only the middle one leaves this app: the
 * session is opened through a Projects route, the bytes go straight to the
 * signed provider URL, and completion asks Projects to verify and link the file.
 */
export const attachmentsClient = {
  createUploadSession(params: UploadSessionParams) {
    return request<AttachmentUploadSession>('/api/attachments/upload-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },

  completeUpload(params: CompleteUploadParams) {
    return request<AttachmentLinkRef>('/api/attachments/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },

  link(params: LinkFileParams) {
    return request<AttachmentLinkRef>('/api/attachments/link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },

  removeLink(linkId: string, params: AttachmentResourceRef) {
    const search = new URLSearchParams({
      resourceType: params.resourceType,
      resourceId: params.resourceId,
    })

    return request<{ object: string; id: string; deleted: true }>(
      `/api/attachments/link/${encodeURIComponent(linkId)}?${search.toString()}`,
      { method: 'DELETE' }
    )
  },

  async uploadFile(
    params: UploadFileParams
  ): Promise<ClientResult<AttachmentLinkRef>> {
    const { file, resourceType, resourceId, onProgress } = params

    const sessionResult = await attachmentsClient.createUploadSession({
      resourceType,
      resourceId,
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    })
    if (sessionResult.error || !sessionResult.data)
      return {
        data: null,
        error: sessionResult.error ?? {
          code: 'storage/provider-error',
          message: 'The upload could not be started.',
        },
      }

    let sent: PutResult
    try {
      sent = await putToSignedUrl(sessionResult.data, file, onProgress)
    } catch {
      return {
        data: null,
        error: {
          code: 'storage/provider-error',
          message:
            'The file could not be sent to storage. Check your connection and try again.',
        },
      }
    }

    if (!sent.ok)
      return {
        data: null,
        error: uploadFailure(sent.status),
      }

    return attachmentsClient.completeUpload({
      sessionId: sessionResult.data.sessionId,
      resourceType,
      resourceId,
    })
  },
}

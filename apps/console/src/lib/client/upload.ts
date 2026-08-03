'use client'

import type { DirectUploadParams, DirectUploadResult } from '@/types/upload'

/** Uploads bytes directly to the signed Storage URL with real byte progress. */
export function putDirectToStorage({
  url,
  method,
  headers,
  file,
  onProgress,
}: DirectUploadParams): Promise<DirectUploadResult> {
  return new Promise<DirectUploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, url, true)

    for (const [name, value] of Object.entries(headers))
      xhr.setRequestHeader(name, value)

    if (onProgress)
      xhr.upload.addEventListener('progress', (event) => {
        if (!event.lengthComputable || event.total <= 0) return

        onProgress(Math.min(1, event.loaded / event.total))
      })

    xhr.addEventListener('load', () => {
      onProgress?.(1)
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        body: xhr.responseText ?? '',
      })
    })
    xhr.addEventListener('error', () =>
      reject(new TypeError('Failed to fetch'))
    )
    xhr.addEventListener('timeout', () =>
      reject(new TypeError('Upload timed out'))
    )
    xhr.addEventListener('abort', () =>
      reject(new DOMException('Upload aborted', 'AbortError'))
    )

    xhr.send(file)
  })
}

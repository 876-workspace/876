'use client'

import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button, buttonVariants } from '@876/ui/button'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'

import type { AttachmentResourceRef } from '@/lib/attachments'
import { attachmentsClient } from '@/lib/client/attachments'

/** One linked file, resolved server-side to what a row has to show. */
export type AttachmentRow = {
  linkId: string
  fileId: string
  name: string
  sizeBytes: number | null
  contentType: string | null
  addedByLabel: string
  downloadUrl: string | null
}

type Props = AttachmentResourceRef & {
  rows: readonly AttachmentRow[]
  canEdit: boolean
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kilobytes = bytes / 1024
  if (kilobytes < 1024) return `${Math.round(kilobytes)} KB`
  return `${(kilobytes / 1024).toFixed(1)} MB`
}

function rowMeta(row: AttachmentRow): string {
  return [
    row.sizeBytes === null ? null : formatBytes(row.sizeBytes),
    row.contentType,
    `Added by ${row.addedByLabel}`,
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * Files attached to one record.
 *
 * The rows are rendered from what Storage returned — a name, a size, a content
 * type and a short-lived signed URL. Nothing here previews or inspects a file,
 * and the download link is the provider's URL, never a Projects route.
 */
export function AttachmentsPanel({
  resourceType,
  resourceId,
  rows,
  canEdit,
}: Props) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [fraction, setFraction] = useState(0)
  const [pendingLinkId, setPendingLinkId] = useState<string | null>(null)
  const [error, setError] = useState<AppErrorValue | null>(null)

  async function uploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || uploading) return

    setError(null)
    setFraction(0)
    setUploading(true)
    const result = await attachmentsClient.uploadFile({
      file,
      resourceType,
      resourceId,
      onProgress: setFraction,
    })
    setUploading(false)

    if (result.error) {
      setFraction(0)
      setError(result.error)
      return
    }

    setFraction(0)
    router.refresh()
  }

  async function removeAttachment(linkId: string) {
    if (pendingLinkId) return
    setPendingLinkId(linkId)
    setError(null)
    const result = await attachmentsClient.removeLink(linkId, {
      resourceType,
      resourceId,
    })
    setPendingLinkId(null)

    if (result.error) {
      setError(result.error)
      return
    }

    router.refresh()
  }

  return (
    <section className="876-card space-y-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Attachments</h2>
        {canEdit ? (
          <>
            <input
              ref={fileInput}
              type="file"
              className="hidden"
              aria-label="Choose a file to attach"
              onChange={uploadFile}
            />
            <Button
              type="button"
              variant="info"
              size="sm"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
            >
              Add file
            </Button>
          </>
        ) : null}
      </div>

      {error ? (
        <AppError title="Attachment not saved" error={error} variant="banner" />
      ) : null}

      {uploading ? (
        <p role="status" className="text-muted-foreground text-sm">
          {`Uploading ${Math.round(fraction * 100)}%`}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">No attachments yet.</p>
      ) : (
        <ul aria-label="Attachments" className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.linkId}
              className="flex flex-wrap items-center justify-between gap-3 text-sm"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{row.name}</span>
                <span className="text-muted-foreground block text-xs">
                  {rowMeta(row)}
                </span>
              </span>
              <span className="flex items-center gap-2">
                {row.downloadUrl ? (
                  <a
                    href={row.downloadUrl}
                    download={row.name}
                    rel="noreferrer"
                    className={buttonVariants({
                      variant: 'outline',
                      size: 'sm',
                    })}
                    aria-label={`Download ${row.name}`}
                  >
                    Download
                  </a>
                ) : null}
                {canEdit ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Remove ${row.name}`}
                    disabled={pendingLinkId === row.linkId}
                    onClick={() => removeAttachment(row.linkId)}
                  >
                    Remove
                  </Button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

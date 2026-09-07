'use client'

import { useRef, useState, useTransition, type ReactNode } from 'react'
import { Button } from '@876/ui/button'

export interface ItemMediaImage {
  fileId: string
  src: string | null
  position: number
}
export type ItemMediaPanelState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty'; legacyImageUrl?: string | null }
  | {
      status: 'ready'
      media: readonly ItemMediaImage[]
      legacyImageUrl?: string | null
    }
export interface ItemMediaPanelProps {
  state: ItemMediaPanelState
  /** The host starts the upload and sends bytes to Storage before returning its file id. */
  onStartUpload: (
    file: File
  ) => Promise<{ fileId: string } | { error: { message: string } }>
  onCompleteUpload: (
    fileId: string
  ) => Promise<{ error: { message: string } | null }>
  onDetach: (fileId: string) => Promise<{ error: { message: string } | null }>
  onReorder: (
    fileIds: string[]
  ) => Promise<{ error: { message: string } | null }>
}

export function ItemMediaPanel({
  state,
  onStartUpload,
  onCompleteUpload,
  onDetach,
  onReorder,
}: ItemMediaPanelProps) {
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ fileId: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const media = state.status === 'ready' ? state.media : []
  const legacy =
    state.status === 'ready' || state.status === 'empty'
      ? state.legacyImageUrl
      : null
  async function upload(file: File) {
    setError(null)
    const result = await onStartUpload(file)
    if ('error' in result) {
      setError(result.error.message)
      return
    }
    setPending({ fileId: result.fileId })
    complete(result.fileId)
  }
  function complete(fileId: string) {
    setError(null)
    startTransition(async () => {
      const result = await onCompleteUpload(fileId)
      if (result.error) {
        setError(result.error.message)
        return
      }
      setPending(null)
    })
  }
  function reorder(index: number, direction: -1 | 1) {
    const next = [...media]
    const other = index + direction
    if (!next[other]) return
    ;[next[index], next[other]] = [next[other], next[index]]
    startTransition(async () => {
      const result = await onReorder(next.map((entry) => entry.fileId))
      if (result.error) setError(result.error.message)
    })
  }
  if (state.status === 'loading')
    return (
      <ItemMediaFrame>
        <div className="bg-muted h-24 animate-pulse rounded-md" />
      </ItemMediaFrame>
    )
  if (state.status === 'error')
    return (
      <ItemMediaFrame>
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      </ItemMediaFrame>
    )
  return (
    <ItemMediaFrame>
      <input
        ref={input}
        className="sr-only"
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void upload(file)
        }}
      />
      <div className="flex flex-wrap gap-3">
        {media.map((image, index) => (
          <figure
            key={image.fileId}
            className="border-border relative w-28 space-y-1 rounded-md border p-1"
          >
            <div className="bg-muted flex h-20 items-center justify-center overflow-hidden rounded">
              {image.src ? (
                <img
                  alt={index === 0 ? 'Primary image' : `Image ${index + 1}`}
                  src={image.src}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-muted-foreground text-xs">Image</span>
              )}
            </div>
            <figcaption className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={index === 0 || isPending}
                onClick={() => reorder(index, -1)}
              >
                ↑
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={index === media.length - 1 || isPending}
                onClick={() => reorder(index, 1)}
              >
                ↓
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await onDetach(image.fileId)
                    if (result.error) setError(result.error.message)
                  })
                }
              >
                Detach
              </Button>
            </figcaption>
          </figure>
        ))}
        {media.length === 0 && legacy ? (
          <figure className="border-border w-28 rounded-md border p-1">
            <img
              alt="Legacy item image"
              src={legacy}
              className="h-20 w-full rounded object-cover"
            />
          </figure>
        ) : null}
      </div>
      {media.length === 0 && !legacy ? (
        <p className="text-muted-foreground text-sm">No images yet.</p>
      ) : null}
      {pending ? (
        <div className="flex items-center gap-2">
          <span className="text-sm">Image is ready to attach.</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => complete(pending.fileId)}
          >
            Retry
          </Button>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => input.current?.click()}
      >
        Upload image
      </Button>
    </ItemMediaFrame>
  )
}
function ItemMediaFrame({ children }: { children: ReactNode }) {
  return (
    <section className="876-card space-y-4 p-5">
      <h2 className="876-section-title">Images</h2>
      {children}
    </section>
  )
}

'use client'

import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@876/ui/dialog'
import { ArrowUpFromLine, CheckIcon, Pencil, Trash } from '@876/ui/icons'
import { OrgAvatar } from '@876/ui/org-avatar'

import { client } from '@/lib/client'
import { putDirectToStorage } from '@/lib/client/upload'
import type {
  ImageFile,
  ImageUploadSession,
  ImageUploadStart,
} from '@/types/storage'
import type { UploadPhase } from '@/types/upload'

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

const PHASE_LABELS: Record<Exclude<UploadPhase, 'idle'>, string> = {
  starting: 'Preparing…',
  uploading: 'Uploading…',
  verifying: 'Verifying…',
  done: 'Updated',
}

const PHASE_FLOOR: Record<Exclude<UploadPhase, 'idle'>, number> = {
  starting: 6,
  uploading: 8,
  verifying: 94,
  done: 100,
}

const UPLOADING_BAND = 84

type Target =
  | { entity: 'app'; routeKey: 'app.logo' }
  | {
      entity: 'organization'
      routeKey: 'organization.primaryLogo'
    }
  | { entity: 'user'; routeKey: 'user.avatar' }

export type ChangeImageDialogProps = Target & {
  ownerId: string
  currentImageUrl: string | null
  fallbackName: string
  imageKind: 'logo' | 'avatar'
  children: ReactNode
  compact?: boolean
}

function validateImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type))
    return 'Choose a PNG, JPEG, or WebP image.'
  if (file.size <= 0) return 'Choose a non-empty image.'
  if (file.size > MAX_IMAGE_SIZE_BYTES)
    return 'Choose an image no larger than 5 MiB.'

  return null
}

function previewUrlFor(file: File): string | null {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function')
    return null

  try {
    return URL.createObjectURL(file)
  } catch {
    return null
  }
}

function revokePreviewUrl(url: string | null): void {
  if (!url || typeof URL?.revokeObjectURL !== 'function') return

  URL.revokeObjectURL(url)
}

function describeUploadFailure(status: number, body: string): string {
  const providerCode = /<Code>([^<]+)<\/Code>/.exec(body)?.[1] ?? ''

  if (providerCode)
    console.error(`Image upload rejected: HTTP ${status} ${providerCode}`)

  if (status === 403 || providerCode === 'AccessDenied')
    return 'The upload link has expired. Try again.'
  if (status === 413 || providerCode === 'EntityTooLarge')
    return 'The image is larger than the storage service accepts.'
  if (status === 400)
    return `The storage service rejected the upload (${providerCode || 'HTTP 400'}). This is a server configuration problem, not a problem with your image.`

  return `The image could not be uploaded (HTTP ${status}). Please try again.`
}

function ProgressRing({ percent }: { percent: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className="pointer-events-none absolute inset-0 size-full"
      role="progressbar"
      aria-label="Upload progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
    >
      <rect
        x={2}
        y={2}
        width={96}
        height={96}
        rx={16}
        pathLength={100}
        fill="none"
        stroke="var(--876-blue)"
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray="100"
        strokeDashoffset={100 - Math.max(0, Math.min(100, percent))}
        className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-300 motion-safe:ease-out"
      />
    </svg>
  )
}

async function startImageUpload(
  entity: Target['entity'],
  ownerId: string,
  params: ImageUploadStart
) {
  if (entity === 'app') return client.apps.startImageUpload(ownerId, params)
  if (entity === 'organization')
    return client.organizations.startImageUpload(ownerId, params)

  return client.users.startImageUpload(ownerId, params)
}

async function completeImageUpload(
  entity: Target['entity'],
  ownerId: string,
  sessionId: string
) {
  if (entity === 'app')
    return client.apps.completeImageUpload(ownerId, { id: sessionId })
  if (entity === 'organization')
    return client.organizations.completeImageUpload(ownerId, { id: sessionId })

  return client.users.completeImageUpload(ownerId, { id: sessionId })
}

async function removeImage(entity: Target['entity'], ownerId: string) {
  if (entity === 'app') return client.apps.removeImage(ownerId)
  if (entity === 'organization')
    return client.organizations.removeImage(ownerId)

  return client.users.removeImage(ownerId)
}

export function ChangeImageDialog({
  entity,
  routeKey,
  ownerId,
  currentImageUrl,
  fallbackName,
  imageKind,
  children,
  compact = false,
}: ChangeImageDialogProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<string | null>(null)
  const [open, setOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [savedImageUrl, setSavedImageUrl] = useState(currentImageUrl)
  const [phase, setPhase] = useState<UploadPhase>('idle')
  const [sentFraction, setSentFraction] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const busy = removing || (phase !== 'idle' && phase !== 'done')
  const shownImageUrl = previewUrl ?? savedImageUrl
  const actionName = `Change ${imageKind}`
  const percent =
    phase === 'uploading'
      ? PHASE_FLOOR.uploading + sentFraction * UPLOADING_BAND
      : phase === 'idle'
        ? 0
        : PHASE_FLOOR[phase]

  useEffect(() => () => revokePreviewUrl(previewRef.current), [])

  useEffect(() => {
    if (phase !== 'done') return

    const timer = setTimeout(() => setPhase('idle'), 2200)
    return () => clearTimeout(timer)
  }, [phase])

  function clearSelection() {
    revokePreviewUrl(previewRef.current)
    previewRef.current = null
    setPreviewUrl(null)
    setSelectedFile(null)
  }

  function handleOpenChange(next: boolean) {
    if (!next && busy) return
    if (next) {
      setSavedImageUrl(currentImageUrl)
    }
    if (!next) {
      clearSelection()
      setError(null)
      setPhase('idle')
      setSentFraction(0)
    }
    setOpen(next)
  }

  function selectFile(file: File) {
    const validationError = validateImage(file)
    if (validationError) {
      clearSelection()
      setError(validationError)
      return
    }

    const preview = previewUrlFor(file)
    revokePreviewUrl(previewRef.current)
    previewRef.current = preview
    setPreviewUrl(preview)
    setSelectedFile(file)
    setError(null)
    setPhase('idle')
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    if (busy) return

    const file = event.dataTransfer.files[0]
    if (file) selectFile(file)
  }

  function fail(message: string) {
    setError(message)
    setPhase('idle')
    setSentFraction(0)
  }

  async function uploadImage() {
    if (!selectedFile || busy) return

    const validationError = validateImage(selectedFile)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setSentFraction(0)
    setPhase('starting')

    const startResult = await startImageUpload(entity, ownerId, {
      route_key: routeKey,
      file_name: selectedFile.name,
      content_type: selectedFile.type,
      size_bytes: selectedFile.size,
    })
    if (startResult.error || !startResult.data) {
      fail(startResult.error?.message ?? 'Failed to start the image upload.')
      return
    }

    const session: ImageUploadSession = startResult.data
    setPhase('uploading')

    let uploadResult
    try {
      uploadResult = await putDirectToStorage({
        url: session.upload_url,
        method: session.method,
        headers: session.headers,
        file: selectedFile,
        onProgress: setSentFraction,
      })
    } catch {
      fail(
        'The image could not be uploaded — the storage service is unreachable. Check your connection and try again.'
      )
      return
    }

    if (!uploadResult.ok) {
      fail(describeUploadFailure(uploadResult.status, uploadResult.body))
      return
    }

    setPhase('verifying')
    const completeResult = await completeImageUpload(
      entity,
      ownerId,
      session.id
    )
    if (completeResult.error || !completeResult.data) {
      fail(
        completeResult.error?.message ?? 'Failed to verify the image upload.'
      )
      return
    }

    const file: ImageFile = completeResult.data
    setSavedImageUrl(file.url)
    clearSelection()
    setPhase('done')
    router.refresh()
  }

  async function handleRemove() {
    // An image predating 876 Storage has a URL but no file id, and must still
    // be removable — gate on what is shown, not on the file reference.
    if (!savedImageUrl || busy) return

    setRemoving(true)
    setError(null)
    const result = await removeImage(entity, ownerId)
    setRemoving(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    clearSelection()
    setSavedImageUrl(null)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <button
        type="button"
        aria-label={actionName}
        onClick={() => handleOpenChange(true)}
        className={[
          'group relative inline-flex shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2',
          imageKind === 'avatar' ? 'rounded-full' : 'rounded-2xl',
        ].join(' ')}
      >
        {children}
        <span
          aria-hidden="true"
          className={[
            'pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 backdrop-blur-[1px] group-hover:opacity-100 group-focus-visible:opacity-100 motion-safe:transition-opacity',
            imageKind === 'avatar' ? 'rounded-full' : 'rounded-2xl',
          ].join(' ')}
        >
          <Pencil className={compact ? 'size-3.5' : 'size-5'} />
        </span>
      </button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{actionName}</DialogTitle>
        </DialogHeader>

        <div
          className={[
            'relative flex flex-col items-center rounded-xl border-2 border-dashed p-6 text-center',
            dragging ? 'border-blue-500 bg-blue-500/5' : 'border-border',
          ].join(' ')}
          onDragOver={(event) => {
            event.preventDefault()
            if (!busy) setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <div className="relative size-28 rounded-2xl">
            <OrgAvatar
              name={fallbackName}
              src={shownImageUrl}
              size="lg"
              className="size-full rounded-2xl"
            />
            {busy && !removing ? <ProgressRing percent={percent} /> : null}
            {phase === 'done' ? (
              <span
                aria-hidden="true"
                className="bg-876-green absolute -right-1.5 -bottom-1.5 flex size-7 items-center justify-center rounded-full text-white shadow-sm"
              >
                <CheckIcon className="size-4" />
              </span>
            ) : null}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <ArrowUpFromLine className="size-3.5" />
            Choose image
          </Button>
          <p className="text-muted-foreground mt-2 text-xs" aria-live="polite">
            {phase === 'idle'
              ? 'Drop a PNG, JPEG, or WebP up to 5 MiB.'
              : PHASE_LABELS[phase]}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label={`Select ${imageKind}`}
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) selectFile(file)
              event.target.value = ''
            }}
          />
        </div>

        {error ? (
          <p className="text-destructive text-[0.8125rem]" role="alert">
            {error}
          </p>
        ) : null}

        <DialogFooter className="sm:justify-between">
          <div>
            {savedImageUrl ? (
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() => void handleRemove()}
              >
                <Trash className="size-3.5" />
                {removing ? 'Removing…' : 'Remove'}
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="info"
              disabled={!selectedFile || busy}
              onClick={() => void uploadImage()}
            >
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

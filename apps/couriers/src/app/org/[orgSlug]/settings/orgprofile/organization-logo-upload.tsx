'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import { ArrowUpFromLine, CheckIcon } from '@876/ui/icons'
import { OrgAvatar } from '@876/ui/org-avatar'

import { request } from '@/lib/client/request'
import { putDirectToStorage } from '@/lib/client/upload'
import type {
  OrganizationLogoFile,
  OrganizationLogoUploadSession,
} from '@/types/storage'
import type { UploadPhase } from '@/types/upload'

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

const PHASE_LABELS: Record<Exclude<UploadPhase, 'idle'>, string> = {
  starting: 'Preparing…',
  uploading: 'Uploading…',
  verifying: 'Verifying…',
  done: 'Updated',
}

/**
 * Where the ring sits for each phase.
 *
 * Only `uploading` has real bytes behind it; the surrounding phases are short
 * server round-trips, so they hold the ring at a fixed point rather than
 * inventing motion. The uploading band is deliberately narrow at both ends so
 * the ring never reaches full until the file is actually verified.
 */
const PHASE_FLOOR: Record<Exclude<UploadPhase, 'idle'>, number> = {
  starting: 6,
  uploading: 8,
  verifying: 94,
  done: 100,
}
const UPLOADING_BAND = 84

/** Turns a storage-provider PUT rejection into a message that names the cause. */
function describeUploadFailure(status: number, body: string): string {
  // R2 answers with an XML error document; its code is the only detail that
  // distinguishes a misconfigured deployment from an expired session.
  const providerCode = /<Code>([^<]+)<\/Code>/.exec(body)?.[1] ?? ''

  if (providerCode)
    console.error(
      `Organization logo upload rejected: HTTP ${status} ${providerCode}`
    )

  if (status === 403 || providerCode === 'AccessDenied')
    return 'The upload link has expired. Try again.'
  if (status === 413 || providerCode === 'EntityTooLarge')
    return 'The image is larger than the storage service accepts.'
  if (status === 400)
    return `The storage service rejected the upload (${providerCode || 'HTTP 400'}). This is a server configuration problem, not a problem with your image.`

  return `The image could not be uploaded (HTTP ${status}). Please try again.`
}

function validateLogo(file: File): string | null {
  if (!ALLOWED_LOGO_TYPES.has(file.type))
    return 'Choose a PNG, JPEG, or WebP image.'
  if (file.size <= 0) return 'Choose a non-empty image.'
  if (file.size > MAX_LOGO_SIZE_BYTES)
    return 'Choose an image no larger than 5 MiB.'

  return null
}

/** A blob URL for instant preview, or null where the environment has none. */
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

/**
 * The tile border doubles as the progress track: a rounded-rect stroke whose
 * dash offset is driven by the completed percentage. `pathLength={100}` makes
 * the dash math independent of the actual perimeter.
 */
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

export function OrganizationLogoUpload({
  orgSlug,
  orgName,
  logoUrl,
  canEdit,
  featureEnabled,
}: {
  orgSlug: string
  orgName: string
  logoUrl: string | null
  canEdit: boolean
  featureEnabled: boolean
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<string | null>(null)
  const [currentLogoUrl, setCurrentLogoUrl] = useState(logoUrl)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [phase, setPhase] = useState<UploadPhase>('idle')
  const [sentFraction, setSentFraction] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploading = phase !== 'idle' && phase !== 'done'
  const disabled = !canEdit || !featureEnabled || uploading
  const shownLogoUrl = previewUrl ?? currentLogoUrl

  const percent =
    phase === 'uploading'
      ? PHASE_FLOOR.uploading + sentFraction * UPLOADING_BAND
      : phase === 'idle'
        ? 0
        : PHASE_FLOOR[phase]

  useEffect(() => () => revokePreviewUrl(previewRef.current), [])

  // The success state is a confirmation, not a resting state — it retires
  // itself so the control returns to its normal affordance.
  useEffect(() => {
    if (phase !== 'done') return

    const timer = setTimeout(() => setPhase('idle'), 2200)
    return () => clearTimeout(timer)
  }, [phase])

  function clearPreview() {
    revokePreviewUrl(previewRef.current)
    previewRef.current = null
    setPreviewUrl(null)
  }

  function fail(message: string) {
    clearPreview()
    setError(message)
    setPhase('idle')
    setSentFraction(0)
  }

  async function upload(file: File) {
    const validationError = validateLogo(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setSentFraction(0)
    setPhase('starting')

    const preview = previewUrlFor(file)
    revokePreviewUrl(previewRef.current)
    previewRef.current = preview
    setPreviewUrl(preview)

    const startResult = await request<OrganizationLogoUploadSession>(
      '/api/manage/settings/orglogo',
      {
        method: 'POST',
        body: JSON.stringify({
          orgSlug,
          file_name: file.name,
          content_type: file.type,
          size_bytes: file.size,
        }),
      }
    )
    if (startResult.error) {
      fail(startResult.error.message)
      return
    }

    setPhase('uploading')

    let uploadResult
    try {
      uploadResult = await putDirectToStorage({
        url: startResult.data.upload_url,
        method: startResult.data.method,
        headers: startResult.data.headers,
        file,
        onProgress: setSentFraction,
      })
    } catch {
      fail(
        'The image could not be uploaded — the storage service is unreachable. Check your connection and try again.'
      )
      return
    }

    if (!uploadResult.ok) {
      // The storage provider answers this PUT directly, so its status is the
      // only signal we get. Without it every failure reads identically.
      fail(describeUploadFailure(uploadResult.status, uploadResult.body))
      return
    }

    setPhase('verifying')

    const completeResult = await request<OrganizationLogoFile>(
      '/api/manage/settings/orglogo/complete',
      {
        method: 'POST',
        body: JSON.stringify({ orgSlug, id: startResult.data.id }),
      }
    )
    if (completeResult.error) {
      fail(completeResult.error.message)
      return
    }

    setCurrentLogoUrl(completeResult.data.url)
    clearPreview()
    setPhase('done')
    router.refresh()
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file || disabled) return

    void upload(file)
  }

  return (
    <div>
      <div
        className="flex items-center gap-5"
        aria-disabled={disabled}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          handleFiles(event.dataTransfer.files)
        }}
      >
        <button
          type="button"
          aria-label={
            currentLogoUrl
              ? 'Replace the organization logo'
              : 'Upload an organization logo'
          }
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={[
            'group relative size-20 shrink-0 rounded-2xl border-2 outline-none',
            'motion-safe:transition-[border-color,background-color,transform,box-shadow] motion-safe:duration-200',
            'focus-visible:ring-876-blue/40 focus-visible:ring-2 focus-visible:ring-offset-2',
            dragging
              ? 'border-876-blue bg-876-blue/8 border-dashed motion-safe:scale-[1.03]'
              : error
                ? 'border-destructive/70'
                : 'border-border-strong',
            !disabled && !dragging
              ? 'hover:border-876-blue/60 hover:shadow-876-blue/10 cursor-pointer hover:shadow-lg'
              : '',
            disabled && !uploading ? 'cursor-not-allowed' : '',
          ].join(' ')}
        >
          <OrgAvatar
            name={orgName}
            src={shownLogoUrl}
            size="lg"
            className={[
              'size-full rounded-[0.85rem]',
              'motion-safe:transition-[filter,opacity] motion-safe:duration-200',
              uploading ? 'opacity-60 blur-[1px]' : '',
            ].join(' ')}
          />

          {!disabled && !uploading ? (
            <span
              aria-hidden
              className="bg-876-blue/70 pointer-events-none absolute inset-0 flex items-center justify-center rounded-[0.85rem] text-white opacity-0 backdrop-blur-[2px] group-hover:opacity-100 group-focus-visible:opacity-100 motion-safe:transition-opacity motion-safe:duration-200"
            >
              <ArrowUpFromLine className="size-5 group-hover:-translate-y-0.5 motion-safe:transition-transform motion-safe:duration-200" />
            </span>
          ) : null}

          {uploading ? (
            <>
              <ProgressRing percent={percent} />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums"
              >
                {phase === 'uploading'
                  ? `${Math.round(sentFraction * 100)}%`
                  : null}
              </span>
            </>
          ) : null}

          {phase === 'done' ? (
            <span
              aria-hidden
              className="bg-876-green motion-safe:animate-confirm-pop absolute -right-1.5 -bottom-1.5 flex size-6 items-center justify-center rounded-full text-white shadow-sm"
            >
              <CheckIcon className="size-3.5" />
            </span>
          ) : null}
        </button>

        <div className="min-w-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <ArrowUpFromLine className="size-3.5" />
            {currentLogoUrl ? 'Replace' : 'Upload'}
          </Button>

          <p
            className="text-muted-foreground mt-1.5 text-xs"
            aria-live="polite"
          >
            {phase === 'idle'
              ? 'Drop a PNG, JPEG, or WebP up to 5 MiB.'
              : PHASE_LABELS[phase]}
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={disabled}
          className="sr-only"
          aria-label="Organization logo"
          onChange={(event) => {
            handleFiles(event.target.files)
            event.target.value = ''
          }}
        />
      </div>

      {error ? (
        <p className="text-destructive mt-2 text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

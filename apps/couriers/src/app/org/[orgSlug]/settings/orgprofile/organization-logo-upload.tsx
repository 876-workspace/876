'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import { ArrowUpFromLine } from '@876/ui/icons'
import { OrgAvatar } from '@876/ui/org-avatar'

import { request } from '@/lib/client/request'
import type {
  OrganizationLogoFile,
  OrganizationLogoUploadSession,
} from '@/types/storage'

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

type UploadPhase = 'idle' | 'starting' | 'uploading' | 'verifying'

const PHASE_PROGRESS: Record<Exclude<UploadPhase, 'idle'>, number> = {
  starting: 15,
  uploading: 55,
  verifying: 85,
}

const PHASE_LABELS: Record<Exclude<UploadPhase, 'idle'>, string> = {
  starting: 'Preparing…',
  uploading: 'Uploading…',
  verifying: 'Verifying…',
}

function validateLogo(file: File): string | null {
  if (!ALLOWED_LOGO_TYPES.has(file.type))
    return 'Choose a PNG, JPEG, or WebP image.'
  if (file.size <= 0) return 'Choose a non-empty image.'
  if (file.size > MAX_LOGO_SIZE_BYTES)
    return 'Choose an image no larger than 5 MiB.'

  return null
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
  const [currentLogoUrl, setCurrentLogoUrl] = useState(logoUrl)
  const [phase, setPhase] = useState<UploadPhase>('idle')
  const [error, setError] = useState<string | null>(null)

  const uploading = phase !== 'idle'
  const disabled = !canEdit || !featureEnabled || uploading

  async function upload(file: File) {
    const validationError = validateLogo(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setPhase('starting')

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
      setError(startResult.error.message)
      setPhase('idle')
      return
    }

    setPhase('uploading')

    let uploadResponse: Response
    try {
      uploadResponse = await fetch(startResult.data.upload_url, {
        method: startResult.data.method,
        headers: startResult.data.headers,
        body: file,
      })
    } catch {
      setError('The image could not be uploaded. Please try again.')
      setPhase('idle')
      return
    }

    if (!uploadResponse.ok) {
      setError('The image could not be uploaded. Please try again.')
      setPhase('idle')
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
      setError(completeResult.error.message)
      setPhase('idle')
      return
    }

    setCurrentLogoUrl(completeResult.data.url)
    setPhase('idle')
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
        className="border-input flex min-h-24 items-center gap-4 rounded-md border border-dashed p-3"
        aria-disabled={disabled}
        onDragOver={(event) => {
          event.preventDefault()
        }}
        onDrop={(event) => {
          event.preventDefault()
          handleFiles(event.dataTransfer.files)
        }}
      >
        <OrgAvatar
          name={orgName}
          src={currentLogoUrl}
          size="lg"
          className="size-16 rounded-lg"
        />
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
          <p className="text-muted-foreground mt-1.5 text-xs">
            Drop a PNG, JPEG, or WebP up to 5 MiB.
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

      {phase !== 'idle' ? (
        <div className="mt-2" aria-live="polite">
          <div className="text-muted-foreground mb-1 text-xs">
            {PHASE_LABELS[phase]}
          </div>
          <progress
            className="h-1.5 w-full max-w-xs accent-[var(--876-blue)]"
            max={100}
            value={PHASE_PROGRESS[phase]}
          />
        </div>
      ) : null}

      {error ? (
        <p className="text-destructive mt-2 text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

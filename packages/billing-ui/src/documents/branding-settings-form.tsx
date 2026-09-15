'use client'

import { useState, type CSSProperties, type FormEvent } from 'react'
import type { Branding } from '@876/core/branding'
import {
  BRAND_ACCENT_PRESETS,
  BRAND_APPEARANCES,
  SIDEBAR_TONES,
  brandTokens,
} from '@876/core/branding'
import { hexColorSchema } from '@876/core/document-templates'
import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { RadioGroup, RadioGroupItem } from '@876/ui/radio-group'

export interface BrandingSettingsFormProps {
  initial: Branding
  logoUrl: string | null
  /** Where the logo itself is managed; renders a link when present. */
  logoHref: string | null
  onSubmit: (value: Branding) => Promise<{ error: { message: string } | null }>
}

const APPEARANCE_LABELS: Record<Branding['appearance'], string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
}

const SIDEBAR_LABELS: Record<Branding['sidebarTone'], string> = {
  light: 'Light',
  dark: 'Dark',
}

const INVALID_HEX_MESSAGE = 'Use a six-digit hex color such as #1f6feb.'

// A real CSS property keeps the merged object a CSSProperties, so the custom
// brand properties need no cast.
const previewFrameStyle = (): CSSProperties => ({
  borderColor: 'var(--brand-accent-subtle)',
})

export function BrandingSettingsForm({
  initial,
  logoUrl,
  logoHref,
  onSubmit,
}: BrandingSettingsFormProps) {
  const [draft, setDraft] = useState<Branding>(initial)
  const [customRaw, setCustomRaw] = useState(initial.accentColor)
  const [hexError, setHexError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPreset = BRAND_ACCENT_PRESETS.some(
    (preset) => preset.color === draft.accentColor
  )

  function chooseCustom(raw: string) {
    setCustomRaw(raw)
    const result = hexColorSchema.safeParse(raw)
    if (result.success) {
      setHexError(null)
      setDraft((prev) => ({ ...prev, accentColor: result.data }))
    } else {
      setHexError(INVALID_HEX_MESSAGE)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (pending || hexError) return
    setPending(true)
    setError(null)
    try {
      const result = await onSubmit(draft)
      if (result.error) setError(result.error.message)
    } catch {
      setError('Could not save branding. Try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormRow htmlFor="branding-logo" label="Logo">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Organization logo"
              className="h-10 w-auto object-contain"
            />
          ) : (
            <span id="branding-logo" className="text-muted-foreground text-sm">
              No logo yet
            </span>
          )}
          {logoHref ? (
            <a
              href={logoHref}
              className="text-sm font-medium underline underline-offset-4"
            >
              Manage logo
            </a>
          ) : null}
        </div>
      </FormRow>
      <FormRow label="Accent color">
        <RadioGroup
          value={isPreset ? draft.accentColor : 'custom'}
          onValueChange={(value) => {
            if (value === 'custom') {
              const result = hexColorSchema.safeParse(customRaw)
              setDraft((prev) => ({
                ...prev,
                accentColor: result.success ? result.data : prev.accentColor,
              }))
              setHexError(result.success ? null : INVALID_HEX_MESSAGE)
            } else {
              setHexError(null)
              setDraft((prev) => ({ ...prev, accentColor: value }))
            }
          }}
          aria-label="Accent color"
          className="flex flex-wrap gap-2"
        >
          {BRAND_ACCENT_PRESETS.map((preset) => (
            <span key={preset.key} className="flex items-center gap-1.5">
              <RadioGroupItem
                value={preset.color}
                id={`accent-${preset.key}`}
                aria-label={preset.label}
                style={{ backgroundColor: preset.color }}
                className="size-6 rounded-full border"
              />
              <Label htmlFor={`accent-${preset.key}`} className="sr-only">
                {preset.label}
              </Label>
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <RadioGroupItem value="custom" id="accent-custom" />
            <Label htmlFor="accent-custom">Custom</Label>
          </span>
        </RadioGroup>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="color"
            aria-label="Custom accent picker"
            value={
              hexColorSchema.safeParse(customRaw).success
                ? customRaw.toLowerCase()
                : draft.accentColor
            }
            onChange={(event) => chooseCustom(event.target.value)}
            className="h-9 w-12 cursor-pointer rounded-md border"
          />
          <Input
            id="branding-custom-color"
            aria-label="Custom accent color"
            value={customRaw}
            spellCheck={false}
            onChange={(event) => chooseCustom(event.target.value)}
            className="max-w-40"
          />
        </div>
        {hexError ? (
          <p role="alert" className="text-destructive mt-1 text-sm">
            {hexError}
          </p>
        ) : null}
      </FormRow>
      <FormRow label="Appearance">
        <RadioGroup
          value={draft.appearance}
          onValueChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              appearance: value as Branding['appearance'],
            }))
          }
          aria-label="Appearance"
          className="flex gap-4"
        >
          {BRAND_APPEARANCES.map((appearance) => (
            <span key={appearance} className="flex items-center gap-2">
              <RadioGroupItem
                value={appearance}
                id={`appearance-${appearance}`}
              />
              <Label htmlFor={`appearance-${appearance}`}>
                {APPEARANCE_LABELS[appearance]}
              </Label>
            </span>
          ))}
        </RadioGroup>
      </FormRow>
      <FormRow label="Sidebar tone">
        <RadioGroup
          value={draft.sidebarTone}
          onValueChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              sidebarTone: value as Branding['sidebarTone'],
            }))
          }
          aria-label="Sidebar tone"
          className="flex gap-4"
        >
          {SIDEBAR_TONES.map((tone) => (
            <span key={tone} className="flex items-center gap-2">
              <RadioGroupItem value={tone} id={`sidebar-${tone}`} />
              <Label htmlFor={`sidebar-${tone}`}>{SIDEBAR_LABELS[tone]}</Label>
            </span>
          ))}
        </RadioGroup>
      </FormRow>
      <div
        aria-label="Brand preview"
        style={Object.assign(previewFrameStyle(), brandTokens(draft))}
        className="flex items-center gap-4 rounded-md border p-4"
      >
        <span
          style={{
            backgroundColor: 'var(--brand-accent)',
            color: 'var(--brand-accent-foreground)',
          }}
          className="rounded-md px-4 py-2 text-sm font-medium"
        >
          Save invoice
        </span>
        <span
          style={{ backgroundColor: 'var(--brand-accent)' }}
          className="h-8 flex-1 rounded-md text-white"
        >
          <span className="px-3 text-sm leading-8">Invoice header</span>
        </span>
      </div>
      {error ? (
        <AppError
          variant="form"
          title="Could not save branding"
          error={{ code: 'branding_save_failed', message: error }}
        />
      ) : null}
      <Button
        type="submit"
        variant="info"
        disabled={pending || hexError !== null}
      >
        Save changes
      </Button>
    </form>
  )
}

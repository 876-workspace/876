'use client'

import { useEffect, useState } from 'react'
import type { Branding } from '@876/core/branding'
import { BRAND_ACCENT_PRESETS } from '@876/core/branding'
import {
  DOCUMENT_TEMPLATE_FONTS,
  DOCUMENT_TEMPLATE_PLACEHOLDERS,
  IMAGE_POSITIONS,
  ORIENTATIONS,
  PAPER_SIZES,
  hexColorSchema,
} from '@876/core/document-templates'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { RadioGroup, RadioGroupItem } from '@876/ui/radio-group'
import { Switch } from '@876/ui/switch'
import { Textarea } from '@876/ui/textarea'

import type { ReportInvalid } from './types'

const INVALID_HEX_MESSAGE = 'Use a six-digit hex color such as #1f6feb.'

export const FONT_LABELS: Record<
  (typeof DOCUMENT_TEMPLATE_FONTS)[number],
  string
> = {
  inter: 'Inter',
  roboto: 'Roboto',
  'open-sans': 'Open Sans',
  lato: 'Lato',
  'noto-sans': 'Noto Sans',
  merriweather: 'Merriweather',
  'source-serif': 'Source Serif',
  'ubuntu-mono': 'Ubuntu Mono',
}

export const PAPER_LABELS: Record<(typeof PAPER_SIZES)[number], string> = {
  a4: 'A4',
  letter: 'Letter',
  'receipt-80mm': 'Receipt (80mm)',
}

export const ORIENTATION_LABELS: Record<(typeof ORIENTATIONS)[number], string> =
  {
    portrait: 'Portrait',
    landscape: 'Landscape',
  }

export const IMAGE_POSITION_LABELS: Record<
  (typeof IMAGE_POSITIONS)[number],
  string
> = {
  center: 'Center',
  'top-left': 'Top left',
  'top-right': 'Top right',
  'bottom-left': 'Bottom left',
  'bottom-right': 'Bottom right',
  tile: 'Tile',
}

export function ToggleRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <Label htmlFor={id}>{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <FormRow htmlFor={id} label={label}>
      <Input
        id={id}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          if (event.target.value.trim() === '') return
          const next = Number(event.target.value)
          if (Number.isFinite(next)) onChange(next)
        }}
      />
    </FormRow>
  )
}

export function ColorField({
  id,
  label,
  value,
  onChange,
  onInvalid,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onInvalid: ReportInvalid
}) {
  const [raw, setRaw] = useState(value)
  const [synced, setSynced] = useState(value)
  if (synced !== value) {
    setSynced(value)
    setRaw(value)
  }
  const parsed = hexColorSchema.safeParse(raw)
  const message = parsed.success ? null : INVALID_HEX_MESSAGE
  useEffect(() => {
    onInvalid(id, message)
    return () => onInvalid(id, null)
  }, [id, message, onInvalid])
  return (
    <FormRow htmlFor={`${id}-hex`} label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={parsed.success ? parsed.data : value}
          onChange={(event) => {
            const next = event.target.value
            setRaw(next)
            setSynced(next)
            onChange(next)
          }}
          className="h-9 w-12 cursor-pointer rounded-md border"
        />
        <Input
          id={`${id}-hex`}
          value={raw}
          spellCheck={false}
          onChange={(event) => {
            const next = event.target.value
            setRaw(next)
            const result = hexColorSchema.safeParse(next)
            if (result.success) {
              setSynced(result.data)
              onChange(result.data)
            }
          }}
        />
      </div>
      {message ? (
        <p role="alert" className="text-destructive mt-1 text-sm">
          {message}
        </p>
      ) : null}
    </FormRow>
  )
}

export function NullableColorField({
  id,
  label,
  value,
  onChange,
  onInvalid,
}: {
  id: string
  label: string
  value: string | null
  onChange: (value: string | null) => void
  onInvalid: ReportInvalid
}) {
  if (value === null) {
    return (
      <FormRow label={label}>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Transparent</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange('#ffffff')}
          >
            Choose color
          </Button>
        </div>
      </FormRow>
    )
  }
  return (
    <div>
      <ColorField
        id={id}
        label={label}
        value={value}
        onChange={onChange}
        onInvalid={onInvalid}
      />
      <div className="sm:pl-44">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            onInvalid(id, null)
            onChange(null)
          }}
        >
          Use transparent
        </Button>
      </div>
    </div>
  )
}

export function UploadComingSoon({ id, label }: { id: string; label: string }) {
  return (
    <FormRow htmlFor={id} label={label}>
      <Input
        id={id}
        disabled
        placeholder="Upload coming soon"
        value=""
        onChange={() => undefined}
      />
    </FormRow>
  )
}

export function PlaceholderMenu({
  onInsert,
}: {
  onInsert: (token: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        Insert placeholder
      </Button>
      {open ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {DOCUMENT_TEMPLATE_PLACEHOLDERS.map((placeholder) => (
            <Button
              key={placeholder.token}
              type="button"
              variant="outline"
              size="sm"
              title={placeholder.label}
              onClick={() => onInsert(`%${placeholder.token}%`)}
            >
              {`%${placeholder.token}%`}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function ContentField({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
}) {
  return (
    <FormRow htmlFor={id} label={label} hint={hint}>
      <Textarea
        id={id}
        value={value}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
      />
      <PlaceholderMenu
        onInsert={(token) => onChange(value ? `${value} ${token}` : token)}
      />
    </FormRow>
  )
}

export function AccentField({
  value,
  branding,
  onChange,
  onInvalid,
}: {
  value: string | null
  branding: Branding
  onChange: (value: string | null) => void
  onInvalid: ReportInvalid
}) {
  const mode = value === null ? 'brand' : 'custom'
  return (
    <FormRow label="Accent color">
      <RadioGroup
        value={mode}
        onValueChange={(next) => {
          onChange(next === 'brand' ? null : branding.accentColor)
        }}
        className="flex gap-4"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="brand" id="accent-brand" />
          <Label htmlFor="accent-brand">Brand color</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="custom" id="accent-custom" />
          <Label htmlFor="accent-custom">Custom</Label>
        </div>
      </RadioGroup>
      {mode === 'custom' ? (
        <div className="mt-2 space-y-2">
          <div
            className="flex flex-wrap gap-1"
            role="group"
            aria-label="Accent presets"
          >
            {BRAND_ACCENT_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                title={preset.label}
                aria-label={preset.label}
                aria-pressed={value === preset.color}
                onClick={() => onChange(preset.color)}
                style={{ backgroundColor: preset.color }}
                className="size-6 rounded-full border data-[pressed=true]:ring-2 data-[pressed=true]:ring-offset-2"
                data-pressed={value === preset.color}
              />
            ))}
          </div>
          <ColorField
            id="accent-custom-color"
            label="Custom accent color"
            value={value ?? branding.accentColor}
            onChange={onChange}
            onInvalid={onInvalid}
          />
        </div>
      ) : null}
    </FormRow>
  )
}

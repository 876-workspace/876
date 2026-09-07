'use client'

import { useState, useTransition } from 'react'

import type {
  TaxAuthority,
  TaxAuthorityCreateParams,
  TaxAuthorityUpdateParams,
} from '@876/billing'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { Globe2, Plus } from '@876/ui/icons'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { Textarea } from '@876/ui/textarea'

type MutationResult = { error: { message: string } | null }
export interface TaxAuthoritySettingsPanelProps {
  authorities: TaxAuthority[]
  countryCode: string
  canManage: boolean
  onCreate: (params: TaxAuthorityCreateParams) => Promise<MutationResult>
  onUpdate: (
    id: string,
    params: TaxAuthorityUpdateParams
  ) => Promise<MutationResult>
  onSuccess: () => void
}

/** Presentation-only tax authority settings surface shared by Billing and Invoice. */
export function TaxAuthoritySettingsPanel({
  authorities,
  countryCode,
  canManage,
  onCreate,
  onUpdate,
  onSuccess,
}: TaxAuthoritySettingsPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  function run(action: () => Promise<MutationResult>, done?: () => void) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.error) {
        setError(result.error.message)
        return
      }
      done?.()
      onSuccess()
    })
  }
  return (
    <section className="space-y-4" aria-label="Tax authorities">
      <div className="flex items-center justify-between gap-3">
        <h2 className="876-page-title">Tax authorities</h2>
        {canManage ? (
          <Button
            variant="info"
            disabled={isPending}
            onClick={() => setShowForm((value) => !value)}
          >
            <Plus className="size-3.5" /> Add
          </Button>
        ) : null}
      </div>
      {showForm ? (
        <AuthorityForm
          countryCode={countryCode}
          disabled={isPending}
          onCancel={() => setShowForm(false)}
          onSubmit={(params) =>
            run(
              () => onCreate(params),
              () => setShowForm(false)
            )
          }
        />
      ) : null}
      {error ? (
        <div
          role="alert"
          className="border-destructive/25 bg-destructive/5 text-destructive rounded-xl border px-4 py-3 text-sm"
        >
          {error}
        </div>
      ) : null}
      <div className="876-card overflow-hidden">
        {authorities.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Globe2 className="text-muted-foreground mx-auto size-6" />
            <p className="mt-3 text-sm font-medium">No tax authorities</p>
          </div>
        ) : (
          <div className="divide-border divide-y">
            {authorities.map((authority) => (
              <div
                key={authority.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
              >
                <div className="bg-876-accent-surface text-876-accent-fg flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <Globe2 className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{authority.name}</p>
                    {authority.isDefault ? (
                      <Badge variant="secondary">Default</Badge>
                    ) : null}
                    {!authority.isActive ? (
                      <Badge variant="outline">Archived</Badge>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {authority.countryCode}
                    {authority.subdivisionCode
                      ? ` · ${authority.subdivisionCode}`
                      : ''}
                    {authority.description ? ` · ${authority.description}` : ''}
                  </p>
                </div>
                {canManage && !authority.isDefault ? (
                  <div className="flex gap-1">
                    {authority.isActive ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() =>
                          run(() => onUpdate(authority.id, { isDefault: true }))
                        }
                      >
                        Make default
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() =>
                        run(() =>
                          onUpdate(authority.id, {
                            isActive: !authority.isActive,
                          })
                        )
                      }
                    >
                      {authority.isActive ? 'Archive' : 'Restore'}
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
function AuthorityForm({
  countryCode,
  disabled,
  onCancel,
  onSubmit,
}: {
  countryCode: string
  disabled: boolean
  onCancel: () => void
  onSubmit: (params: TaxAuthorityCreateParams) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [country, setCountry] = useState(countryCode)
  const [subdivision, setSubdivision] = useState('')
  return (
    <form
      className="876-card border-876-blue/25 grid gap-4 p-5 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({
          name,
          description: description.trim() || undefined,
          countryCode: country,
          subdivisionCode: subdivision.trim() || undefined,
        })
      }}
    >
      <p className="font-semibold sm:col-span-2">New tax authority</p>
      <Field label="Authority name" htmlFor="tax-authority-name">
        <Input
          id="tax-authority-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </Field>
      <Field label="Country code" htmlFor="tax-authority-country">
        <Input
          id="tax-authority-country"
          value={country}
          onChange={(event) => setCountry(event.target.value.toUpperCase())}
          maxLength={2}
          required
        />
      </Field>
      <Field label="Subdivision" htmlFor="tax-authority-subdivision" optional>
        <Input
          id="tax-authority-subdivision"
          value={subdivision}
          onChange={(event) => setSubdivision(event.target.value.toUpperCase())}
          maxLength={12}
        />
      </Field>
      <Field label="Description" htmlFor="tax-authority-description" optional>
        <Textarea
          id="tax-authority-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
        />
      </Field>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={disabled}>
          {disabled ? 'Saving…' : 'Create authority'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
function Field({
  label,
  htmlFor,
  optional,
  children,
}: {
  label: string
  htmlFor: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label}
        {optional ? (
          <span className="text-muted-foreground ml-1 font-normal">
            (optional)
          </span>
        ) : null}
      </Label>
      {children}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import type { AdminAppKind } from '@876/admin'
import { AppWindow, Building2 } from '@876/ui/icons'
import type { IconComponent } from '@876/ui/icons'
import type { ReactNode } from 'react'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { OrgAvatar as AppLogo } from '@876/ui/org-avatar'

import { client } from '@/lib/client'
import { UploadDropzone } from '@/lib/uploadthing'

const APP_KINDS = ['internal', 'platform', 'product', 'external'] as const
const CLIENT_TYPES = ['public', 'confidential'] as const

const createAppFormSchema = z.strictObject({
  name: z.string().trim().min(1, 'Name is required.'),
  app_kind: z.enum(APP_KINDS),
  client_type: z.enum(CLIENT_TYPES),
  organization_id: z.string(),
  homepage_url: z.string(),
  logo_url: z.string(),
})

type CreateAppFormValues = z.infer<typeof createAppFormSchema>

function FormCard({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: IconComponent
  children: ReactNode
}) {
  return (
    <section className="876-card p-5">
      <h2 className="text-foreground mb-4 flex items-center gap-2 text-sm font-medium">
        <span className="bg-876-accent-surface text-876-accent-fg flex size-6 shrink-0 items-center justify-center rounded-md">
          <Icon aria-hidden="true" className="size-3.5" />
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function FieldShell({
  id,
  label,
  optional,
  children,
  error,
}: {
  id: string
  label: string
  optional?: boolean
  children: ReactNode
  error?: string
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {optional && (
          <span className="text-muted-foreground ml-1 font-normal">
            (optional)
          </span>
        )}
      </Label>
      {children}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  )
}

function firstError(errors: unknown[]): string | undefined {
  const error = errors[0]
  if (!error) return undefined
  if (typeof error === 'string') return error
  if (typeof error === 'object' && 'message' in error) {
    const message = error.message
    if (typeof message === 'string') return message
  }
  return 'Invalid value.'
}

function toCreatePayload(value: CreateAppFormValues) {
  return {
    name: value.name.trim(),
    appKind: value.app_kind,
    clientType: value.client_type,
    organizationId: value.organization_id.trim() || null,
    homepageUrl: value.homepage_url.trim() || null,
    logoUrl: value.logo_url.trim() || null,
  }
}

export function CreateAppForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const defaultValues: CreateAppFormValues = {
    name: '',
    app_kind: 'platform',
    client_type: 'public',
    organization_id: '',
    homepage_url: '',
    logo_url: '',
  }

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: createAppFormSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null)

      const { data, error } = await client.apps.create(toCreatePayload(value))
      if (error || !data) {
        setError(error?.message ?? 'Failed to create application.')
        return
      }

      router.push(`/apps/${data.slug}`)
    },
  })

  return (
    <form
      className="max-w-2xl space-y-5"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <FormCard title="Identity" icon={Building2}>
        <div className="grid gap-4 sm:grid-cols-2">
          <form.Field name="name">
            {(field) => (
              <FieldShell
                id={field.name}
                label="Name"
                error={firstError(field.state.meta.errors)}
              >
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="876 Console"
                  required
                />
              </FieldShell>
            )}
          </form.Field>

          <form.Field name="app_kind">
            {(field) => (
              <FieldShell id={field.name} label="Kind">
                <NativeSelect
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) =>
                    field.handleChange(event.target.value as AdminAppKind)
                  }
                  className="w-full capitalize"
                >
                  {APP_KINDS.map((kind) => (
                    <NativeSelectOption
                      key={kind}
                      value={kind}
                      className="capitalize"
                    >
                      {kind}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FieldShell>
            )}
          </form.Field>

          <form.Field name="client_type">
            {(field) => (
              <FieldShell id={field.name} label="Client type">
                <NativeSelect
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) =>
                    field.handleChange(
                      event.target.value as CreateAppFormValues['client_type']
                    )
                  }
                  className="w-full capitalize"
                >
                  {CLIENT_TYPES.map((type) => (
                    <NativeSelectOption
                      key={type}
                      value={type}
                      className="capitalize"
                    >
                      {type}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FieldShell>
            )}
          </form.Field>

          <form.Field name="organization_id">
            {(field) => (
              <FieldShell id={field.name} label="Organization ID" optional>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="org_..."
                  spellCheck={false}
                  className="font-mono"
                />
              </FieldShell>
            )}
          </form.Field>

          <form.Field name="homepage_url">
            {(field) => (
              <FieldShell id={field.name} label="Homepage URL" optional>
                <Input
                  id={field.name}
                  name={field.name}
                  type="url"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="https://example.com"
                />
              </FieldShell>
            )}
          </form.Field>
        </div>
      </FormCard>

      <form.Field name="logo_url">
        {(field) => (
          <FormCard title="App icon" icon={AppWindow}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <AppLogo
                name={form.state.values.name || 'Application'}
                src={field.state.value}
                size="lg"
                className="size-16 rounded-lg"
              />
              <div className="min-w-0 flex-1 space-y-3">
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="https://..."
                />
                <UploadDropzone
                  endpoint="appIcon"
                  onClientUploadComplete={(files) => {
                    const url = files[0]?.serverData?.url
                    if (url) field.handleChange(url)
                  }}
                  onUploadError={(uploadError) => setError(uploadError.message)}
                />
                {field.state.value && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => field.handleChange('')}
                  >
                    Remove icon
                  </Button>
                )}
              </div>
            </div>
          </FormCard>
        )}
      </form.Field>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex justify-end">
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              variant="info"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create application'}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}

'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { toast } from 'sonner'

import type { AdminOrganization } from '@876/admin'
import type { OrganizationSelfUpdateParams } from '@876/sdk'
import type { IconComponent } from '@876/ui/icons'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'

import { client } from '@/lib/client'

import { ALL_KEYS, SECTIONS } from '../organization-sections'
import type { FieldKey } from '../organization-sections'

function toFormValues(org: AdminOrganization): Record<FieldKey, string> {
  const values = {} as Record<FieldKey, string>
  for (const key of ALL_KEYS) {
    values[key] = (org[key as keyof AdminOrganization] as string | null) ?? ''
  }
  return values
}

/** Titled `876-card` section matching Console's org forms. */
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
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

export function OrganizationDetailsForm({
  org,
  slug,
}: {
  org: AdminOrganization
  slug: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [initial, setInitial] = useState(() => toFormValues(org))
  const [values, setValues] = useState(initial)

  const dirtyKeys = useMemo(
    () => ALL_KEYS.filter((key) => values[key] !== initial[key]),
    [values, initial]
  )

  function setField(key: FieldKey, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (dirtyKeys.length === 0 || isPending) return

    const params: OrganizationSelfUpdateParams = {}
    for (const key of dirtyKeys) {
      const trimmed = values[key].trim()
      params[key] = trimmed === '' ? null : trimmed
    }

    startTransition(async () => {
      const { error } = await client.orgs.updateDetails(slug, params)
      if (error) {
        toast.error(error.message)
        return
      }

      setInitial(values)
      toast.success('Company details saved.')
      router.push(`/${slug}/organization`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-5">
      {SECTIONS.map((section) => (
        <FormCard key={section.title} title={section.title} icon={section.icon}>
          {section.fields.map((spec) => (
            <div key={spec.key} className="space-y-2">
              <Label htmlFor={spec.key}>{spec.label}</Label>
              <Input
                id={spec.key}
                name={spec.key}
                type={spec.type ?? 'text'}
                placeholder={spec.placeholder}
                value={values[spec.key]}
                maxLength={spec.maxLength}
                disabled={isPending}
                spellCheck={spec.code ? false : undefined}
                className={spec.code ? 'font-mono uppercase' : undefined}
                onChange={(event) =>
                  setField(
                    spec.key,
                    spec.code
                      ? event.target.value.toUpperCase()
                      : event.target.value
                  )
                }
              />
            </div>
          ))}
        </FormCard>
      ))}

      <div className="flex items-center justify-end gap-3">
        {dirtyKeys.length > 0 && !isPending && (
          <span className="text-muted-foreground text-sm">
            {dirtyKeys.length} unsaved{' '}
            {dirtyKeys.length === 1 ? 'change' : 'changes'}
          </span>
        )}
        <Button type="submit" disabled={dirtyKeys.length === 0 || isPending}>
          {isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}

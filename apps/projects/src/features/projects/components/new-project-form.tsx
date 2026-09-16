'use client'

import { LayoutRenderer } from '@876/projects-ui/layouts/layout-renderer'
import type { Layout, LayoutValues } from '@876/projects/layout-rules'
import type { ProjectCustomField } from '@876/projects/contracts'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { useRouter } from 'next/navigation'
import { useMemo, useState, type FormEvent } from 'react'

import { projectCustomFieldsClient, projectsClient } from '@/lib/client'

import { CreateResourceForm } from './create-resource-form'
import {
  customFieldInputValue,
  descriptorLabel,
  isLayoutRuleError,
  layoutRuleErrorTitle,
  layoutText,
  layoutTextOrNull,
  missingLayoutFields,
  projectLayoutDescriptors,
  projectToLayoutValues,
  readLayoutFormValues,
} from './layout-form-helpers'

export function NewProjectForm({
  layout = null,
  customFields = [],
}: {
  /** Server-resolved layout; when present the fields render through it. */
  layout?: Layout | null
  customFields?: readonly ProjectCustomField[]
}) {
  if (layout === null) {
    return (
      <CreateResourceForm
        nameLabel="Name"
        namePlaceholder="Console Revamp"
        hint="The issue key is derived from the name — CONSOL-1, CONSOL-2 — and cannot be changed once issues exist."
        submit={({ name, description }) =>
          projectsClient.create({ name, description })
        }
        redirectTo={(created) => `/projects/${created.id}`}
      />
    )
  }

  return (
    <NewProjectLayoutForm layout={layout} customFields={customFields} />
  )
}

function NewProjectLayoutForm({
  layout,
  customFields,
}: {
  layout: Layout
  customFields: readonly ProjectCustomField[]
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)
  const [ruleFields, setRuleFields] = useState<string[]>([])

  const descriptors = useMemo(
    () => projectLayoutDescriptors(customFields),
    [customFields]
  )
  const seed = useMemo<LayoutValues>(() => projectToLayoutValues(), [])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const formValues = readLayoutFormValues(event.currentTarget, layout)

    const formName = layoutText(formValues.title)
    if (!formName) {
      setRuleFields(['title'])
      setError({
        code: 'projects/layout-required-fields',
        message: `${layoutRuleErrorTitle('projects/layout-required-fields')} Missing: Name`,
      })
      return
    }
    const missing = missingLayoutFields(layout, formValues)
    if (missing.length > 0) {
      setRuleFields(missing)
      setError({
        code: 'projects/layout-required-fields',
        message: `${layoutRuleErrorTitle('projects/layout-required-fields')} Missing: ${missing.map((field) => descriptorLabel(descriptors, field)).join(', ')}`,
      })
      return
    }

    setPending(true)
    setError(null)
    setRuleFields([])

    const result = await projectsClient.create({
      name: formName,
      description: layoutTextOrNull(formValues.description),
    })

    if (result.error || !result.data) {
      setPending(false)
      if (isLayoutRuleError(result.error?.code)) {
        const serverMissing = missingLayoutFields(layout, formValues)
        setRuleFields(serverMissing)
        setError({
          code: result.error?.code ?? 'projects/layout-required-fields',
          message: `${layoutRuleErrorTitle(result.error?.code)}${serverMissing.length > 0 ? ` Missing: ${serverMissing.map((field) => descriptorLabel(descriptors, field)).join(', ')}` : ''} ${result.error?.message ?? ''}`.trim(),
        })
      } else {
        setError({
          code: result.error?.code ?? 'projects/create-failed',
          message: result.error?.message ?? 'Something went wrong.',
        })
      }
      return
    }

    const fieldByKey = new Map(
      customFields.map((field) => [`cf:${field.key}`, field])
    )
    const writes = [...fieldByKey.entries()].flatMap(([fieldKey, field]) => {
      const raw = formValues[fieldKey]
      if (
        raw === undefined ||
        raw === null ||
        raw === '' ||
        (Array.isArray(raw) && raw.length === 0)
      )
        return []
      return [
        {
          fieldId: field.id,
          value: customFieldInputValue(field.fieldType, raw),
        },
      ]
    })

    if (writes.length > 0) {
      const valuesResult = await projectCustomFieldsClient.values.set(
        result.data.id,
        writes
      )
      if (valuesResult.error) {
        setPending(false)
        setError(valuesResult.error)
        return
      }
    }

    setPending(false)
    router.push(`/projects/${result.data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      {error ? (
        <AppError title="Project not created" error={error} variant="banner" />
      ) : null}
      {ruleFields.length > 0 ? (
        <ul aria-label="Fields to complete" className="text-sm">
          {ruleFields.map((fieldKey) => (
            <li key={fieldKey}>{descriptorLabel(descriptors, fieldKey)}</li>
          ))}
        </ul>
      ) : null}
      <p className="text-muted-foreground text-sm">
        The issue key is derived from the name — CONSOL-1, CONSOL-2 — and cannot be changed once issues exist.
      </p>
      <LayoutRenderer layout={layout} fields={descriptors} values={seed} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" variant="info" disabled={pending}>
          {pending ? 'Creating…' : 'Create'}
        </Button>
      </div>
    </form>
  )
}

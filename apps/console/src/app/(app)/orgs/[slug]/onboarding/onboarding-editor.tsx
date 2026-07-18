'use client'

import { useMemo, useState, useTransition } from 'react'
import type {
  AdminJsonValue,
  AdminOnboardingCatalog,
  AdminOnboardingSession,
  AdminOnboardingValidationIssue,
} from '@876/admin'
import { Accordion } from '@876/ui/accordion'
import { Button } from '@876/ui/button'
import { Progress } from '@876/ui/progress'

import { DetailAccordionSection } from '@/components/detail/detail-accordion'
import { client } from '@/lib/client'
import { OnboardingField } from './onboarding-field'

function hasValue(value: AdminJsonValue | undefined) {
  if (value === undefined || value === null || value === '') return false
  if (Array.isArray(value)) return value.length > 0
  return true
}

export function OnboardingEditor({
  organizationId,
  catalog,
  session: initialSession,
}: {
  organizationId: string
  catalog: AdminOnboardingCatalog
  session: AdminOnboardingSession
}) {
  const [answers, setAnswers] = useState(initialSession.answers)
  const [session, setSession] = useState(initialSession)
  const [issues, setIssues] = useState<AdminOnboardingValidationIssue[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const requiredFields = useMemo(
    () =>
      catalog.sections
        .flatMap((section) => section.fields)
        .filter((field) => field.required),
    [catalog.sections]
  )
  const completedRequired = requiredFields.filter((field) =>
    hasValue(answers[field.key])
  ).length
  const completion = requiredFields.length
    ? Math.round((completedRequired / requiredFields.length) * 100)
    : 100

  const payload = { country_code: catalog.country_code, answers }

  function save() {
    setMessage(null)
    setIssues([])
    startTransition(async () => {
      const result = await client.onboarding.save(organizationId, payload)
      if (result.error || !result.data) {
        setMessage(result.error?.message ?? 'Failed to save onboarding.')
        return
      }
      setSession(result.data)
      setMessage('Draft saved.')
    })
  }

  function submit() {
    setMessage(null)
    setIssues([])
    startTransition(async () => {
      const validation = await client.onboarding.validate(
        organizationId,
        payload
      )
      if (validation.error || !validation.data) {
        setMessage(validation.error?.message ?? 'Validation failed.')
        return
      }
      if (!validation.data.valid) {
        setIssues(validation.data.issues)
        setMessage('Complete the required onboarding information.')
        return
      }
      const saved = await client.onboarding.save(organizationId, payload)
      if (saved.error || !saved.data) {
        setMessage(saved.error?.message ?? 'Failed to save onboarding.')
        return
      }
      const submitted = await client.onboarding.submit(organizationId)
      if (submitted.error || !submitted.data) {
        setMessage(submitted.error?.message ?? 'Failed to submit onboarding.')
        return
      }
      setSession(submitted.data)
      setMessage('Organization onboarding submitted.')
    })
  }

  return (
    <div className="space-y-5">
      <section className="876-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Global organization setup</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Jamaica catalog revision {catalog.catalog_revision} · schema
              version 1
            </p>
          </div>
          <span className="bg-muted rounded-md px-2.5 py-1 text-xs font-medium capitalize">
            {session.status.replace('_', ' ')}
          </span>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Progress value={completion} className="h-2 flex-1" />
          <span className="text-muted-foreground text-xs tabular-nums">
            {completion}% required fields
          </span>
        </div>
      </section>

      <Accordion
        multiple
        defaultValue={catalog.sections
          .slice(0, 1)
          .map((section) => section.key)}
        className="gap-3"
      >
        {catalog.sections.map((section) => (
          <DetailAccordionSection
            key={section.key}
            title={section.title}
            description={section.description}
            value={section.key}
          >
            <div className="grid gap-5 lg:grid-cols-2">
              {section.fields.map((field) => (
                <div
                  key={field.key}
                  className={
                    field.field_type === 'collection' ? 'lg:col-span-2' : ''
                  }
                >
                  <OnboardingField
                    field={field}
                    value={answers[field.key]}
                    onChange={(value) =>
                      setAnswers((current) => ({
                        ...current,
                        [field.key]: value,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </DetailAccordionSection>
        ))}
      </Accordion>

      {issues.length > 0 && (
        <section className="border-destructive/40 bg-destructive/5 rounded-lg border p-4">
          <p className="text-sm font-medium">Validation issues</p>
          <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-sm">
            {issues.map((issue) => (
              <li key={`${issue.path}-${issue.code}`}>{issue.message}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm" role="status">
          {message}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={save} disabled={isPending}>
            Save draft
          </Button>
          <Button onClick={submit} disabled={isPending}>
            Validate and submit
          </Button>
        </div>
      </div>
    </div>
  )
}

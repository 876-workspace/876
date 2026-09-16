'use client'

import { ACTION_LABELS } from '@876/projects-ui/automation/labels'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { useState, type FormEvent } from 'react'

import { automationRulesClient } from '@/lib/client'
import type { ServiceAutomationTest } from '@/lib/automation-mappers'

type Props = { ruleId: string }

const ACTION_LABEL_FALLBACK: Record<string, string> = ACTION_LABELS

function actionLabel(type: string): string {
  return ACTION_LABEL_FALLBACK[type] ?? type
}

export function AutomationTestPanel({ ruleId }: Props) {
  const [subjectId, setSubjectId] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)
  const [result, setResult] = useState<ServiceAutomationTest | null>(null)

  async function onTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || subjectId.trim() === '') return
    setPending(true)
    setError(null)
    setResult(null)
    const response = await automationRulesClient.test(ruleId, {
      subjectId: subjectId.trim(),
    })
    setPending(false)
    if (response.error || !response.data) {
      setError({
        code: response.error?.code ?? 'projects/automation-test-failed',
        message: response.error?.message ?? 'The dry run could not be completed.',
      })
      return
    }
    setResult(response.data)
  }

  return (
    <section aria-label="Test rule" className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">Test</h2>
      <p className="text-muted-foreground text-sm">
        Dry-run this rule against a work item identifier. Nothing is changed —
        the panel shows which conditions matched and which actions would run.
      </p>
      <form onSubmit={onTest} className="flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1">
          <Label htmlFor="automation-test-subject">Work item identifier</Label>
          <Input
            id="automation-test-subject"
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            placeholder="e.g. PROJ-123"
          />
        </div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? 'Testing…' : 'Test'}
        </Button>
      </form>
      {error ? (
        <AppError title="Dry run failed" error={error} variant="banner" />
      ) : null}
      {result ? (
        <div
          data-slot="automation-test-result"
          className="flex flex-col gap-3 rounded-md border p-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={result.matched ? 'success' : 'secondary'}>
              {result.matched ? 'Would run' : 'Would not run'}
            </Badge>
            <span className="text-muted-foreground text-xs">
              {result.subjectType} · {result.subjectId}
            </span>
          </div>
          <div>
            <h3 className="mb-1 text-sm font-medium">Matched conditions</h3>
            {result.conditions.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No conditions — the rule matches every trigger event.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {result.conditions.map((condition, index) => (
                  <li
                    key={`${condition.fieldKey}-${index}`}
                    data-slot="automation-test-condition"
                    data-matched={condition.matched ? 'true' : 'false'}
                    className="flex flex-wrap items-center gap-2 text-xs"
                  >
                    <Badge
                      variant={condition.matched ? 'success' : 'secondary'}
                    >
                      {condition.matched ? 'Matched' : 'Not matched'}
                    </Badge>
                    <span className="font-mono">{condition.fieldKey}</span>
                    <span className="text-muted-foreground">{condition.op}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-1 text-sm font-medium">Planned actions</h3>
            {result.plannedActions.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No actions planned.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {result.plannedActions.map((action, index) => (
                  <li key={`${action.type}-${index}`}>
                    <Badge variant="info">{actionLabel(action.type)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}

'use client'

import { AutomationRuleEditor } from '@876/projects-ui/automation/automation-rule-editor'
import type { AutomationRule } from '@876/projects-ui/automation/types'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button, buttonVariants } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { automationRulesClient } from '@/lib/client'
import { uiRuleToServiceInput } from '@/lib/automation-mappers'

type Props = {
  mode: 'create' | 'edit'
  ruleId?: string
  initial: AutomationRule
}

function readRule(form: HTMLFormElement): AutomationRule | null {
  const raw = new FormData(form).get('rule')
  try {
    const parsed: unknown = JSON.parse(String(raw ?? 'null'))
    if (parsed && typeof parsed === 'object' && 'actions' in parsed)
      return parsed as AutomationRule
    return null
  } catch {
    return null
  }
}

export function AutomationRuleForm({ mode, ruleId, initial }: Props) {
  const router = useRouter()
  const [projectId, setProjectId] = useState(initial.projectId ?? '')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)
  const [saved, setSaved] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const rule = readRule(event.currentTarget)
    if (!rule || rule.name.trim() === '') {
      setError({
        code: 'projects/invalid-automation-rule',
        message: 'Give the rule a name, at least one trigger, and one action.',
      })
      return
    }

    setPending(true)
    setError(null)
    setSaved(false)
    const input = uiRuleToServiceInput(rule, {
      projectId: projectId.trim() === '' ? null : projectId.trim(),
    })
    const payload =
      webhookSecret === '' ? input : { ...input, webhookSecret }
    const result =
      mode === 'create'
        ? await automationRulesClient.create(payload)
        : await automationRulesClient.update(ruleId ?? initial.id, payload)
    setPending(false)
    if (result.error || !result.data) {
      setError({
        code: result.error?.code ?? 'projects/automation-save-failed',
        message: result.error?.message ?? 'The rule could not be saved.',
      })
      return
    }
    if (mode === 'create') {
      router.push('/settings/automation')
      router.refresh()
      return
    }
    setSaved(true)
    setWebhookSecret('')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error ? (
        <AppError
          title={mode === 'create' ? 'Rule not created' : 'Rule not updated'}
          error={error}
          variant="banner"
        />
      ) : null}
      {saved ? (
        <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
          Rule saved.
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="automation-rule-project">Project ID (optional)</Label>
          <Input
            id="automation-rule-project"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            placeholder="Leave empty for the whole workspace"
          />
        </div>
        <div>
          <Label htmlFor="automation-rule-secret">Webhook secret</Label>
          <Input
            id="automation-rule-secret"
            name="webhookSecret"
            type="password"
            value={webhookSecret}
            onChange={(event) => setWebhookSecret(event.target.value)}
            placeholder={
              initial.hasWebhookSecret
                ? 'Set — leave blank to keep it'
                : 'Only needed for call-webhook actions'
            }
            autoComplete="new-password"
          />
        </div>
      </div>
      <AutomationRuleEditor initial={initial} />
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending
            ? 'Saving…'
            : mode === 'create'
              ? 'Create rule'
              : 'Save rule'}
        </Button>
        <Link
          href="/settings/automation"
          className={buttonVariants({ variant: 'outline' })}
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}

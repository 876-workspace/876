'use client'

import { AutomationRuleList } from '@876/projects-ui/automation/automation-rule-list'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { automationRulesClient } from '@/lib/client'
import {
  serviceRuleToUi,
  type ServiceAutomationRule,
} from '@/lib/automation-mappers'

type Props = {
  initial: ServiceAutomationRule[]
  hrefBase: string
}

export function AutomationRulesManager({ initial, hrefBase }: Props) {
  const router = useRouter()
  const [rules, setRules] = useState(initial)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<AppErrorValue | null>(null)

  async function toggleRule(rule: ServiceAutomationRule) {
    if (pendingId) return
    setPendingId(rule.id)
    setError(null)
    const result = await automationRulesClient.update(rule.id, {
      enabled: !rule.enabled,
    })
    setPendingId(null)
    if (result.error || !result.data) {
      setError({
        code: result.error?.code ?? 'projects/automation-toggle-failed',
        message: result.error?.message ?? 'The rule could not be updated.',
      })
      return
    }
    setRules((current) =>
      current.map((entry) =>
        entry.id === rule.id
          ? { ...entry, enabled: result.data.enabled }
          : entry
      )
    )
    router.refresh()
  }

  async function deleteRule(rule: ServiceAutomationRule) {
    if (pendingId) return
    setPendingId(rule.id)
    setError(null)
    const result = await automationRulesClient.remove(rule.id)
    setPendingId(null)
    if (result.error || !result.data) {
      setError({
        code: result.error?.code ?? 'projects/automation-delete-failed',
        message: result.error?.message ?? 'The rule could not be deleted.',
      })
      return
    }
    setRules((current) => current.filter((entry) => entry.id !== rule.id))
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <AppError
          title="Automation rule not updated"
          error={error}
          variant="banner"
        />
      ) : null}
      <AutomationRuleList
        rules={rules.map(serviceRuleToUi)}
        hrefBase={hrefBase}
      />
      {rules.length > 0 ? (
        <section aria-label="Manage automation rules" className="flex flex-col gap-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              data-slot="automation-rule-manage-row"
              className="flex flex-wrap items-center gap-2 rounded-md border px-4 py-2.5"
            >
              <Link
                href={`${hrefBase.replace(/\/$/, '')}/${encodeURIComponent(rule.id)}`}
                className="min-w-0 flex-1 truncate text-sm font-medium"
              >
                {rule.name}
              </Link>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pendingId === rule.id}
                onClick={() => void toggleRule(rule)}
              >
                {rule.enabled ? 'Disable' : 'Enable'}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={pendingId === rule.id}
                onClick={() => void deleteRule(rule)}
              >
                Delete
              </Button>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  )
}

'use client'

import { Badge } from '@876/ui/badge'
import { Checkbox } from '@876/ui/checkbox'
import { Label } from '@876/ui/label'

import type { PlanModuleOption } from '@/types/plans'

type Props = {
  modules: PlanModuleOption[]
  selectedModuleIds: string[]
  onSelectedModuleIdsChange: (moduleIds: string[]) => void
  disabled?: boolean
}

export function PlanModulePicker({
  modules,
  selectedModuleIds,
  onSelectedModuleIdsChange,
  disabled = false,
}: Props) {
  const selected = new Set(selectedModuleIds)

  if (modules.length === 0)
    return (
      <div className="876-card text-muted-foreground p-5 text-sm">
        This application has no modules yet. Create its durable capabilities
        before configuring a plan.
      </div>
    )

  return (
    <div className="876-card divide-border divide-y overflow-hidden">
      {modules.map((module) => {
        const inputId = `plan-module-${module.id}`
        const archived = module.status === 'archived'
        return (
          <div key={module.id} className="flex items-start gap-3 px-4 py-3.5">
            <Checkbox
              id={inputId}
              checked={selected.has(module.id)}
              disabled={disabled || archived}
              onCheckedChange={(checked) => {
                const next = new Set(selected)
                if (checked === true) next.add(module.id)
                else next.delete(module.id)
                onSelectedModuleIdsChange([...next])
              }}
              className="mt-0.5"
            />
            <Label
              htmlFor={inputId}
              className="flex min-w-0 flex-1 cursor-pointer items-start justify-between gap-4"
            >
              <span className="min-w-0 space-y-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{module.name}</span>
                  {module.featureSlug && (
                    <Badge variant="outline">rollout flag</Badge>
                  )}
                  {archived && <Badge variant="warning">Archived</Badge>}
                </span>
                {module.description && (
                  <span className="text-muted-foreground block text-xs leading-relaxed">
                    {module.description}
                  </span>
                )}
                {module.featureSlug && (
                  <span className="text-muted-foreground block text-[11px]">
                    Operational gate: {module.featureSlug}
                  </span>
                )}
              </span>
              <code className="bg-secondary/40 text-muted-foreground shrink-0 rounded px-1.5 py-0.5 text-[10px]">
                {module.key}
              </code>
            </Label>
          </div>
        )
      })}
    </div>
  )
}

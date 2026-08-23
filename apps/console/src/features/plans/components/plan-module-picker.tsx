'use client'

import { Badge } from '@876/ui/badge'
import { Checkbox } from '@876/ui/checkbox'
import { Label } from '@876/ui/label'
import { cn } from '@876/core/utils'

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
      <div className="876-empty-dashed">
        This application has no modules yet. Create its durable capabilities
        before configuring a plan.
      </div>
    )

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {modules.map((module) => {
        const inputId = `plan-module-${module.id}`
        const archived = module.status === 'archived'
        const checked = selected.has(module.id)

        return (
          <div
            key={module.id}
            className={cn(
              '876-card flex items-start gap-3 p-4 transition-all',
              // Selection is carried by the checkbox and a slightly raised
              // surface, not a colour wash: with every module included the
              // page was a solid block of green and nothing stood out.
              checked && !archived
                ? 'border-border-strong bg-secondary/30'
                : 'hover:border-border-strong',
              archived && 'opacity-60'
            )}
          >
            <Checkbox
              id={inputId}
              checked={checked}
              disabled={disabled || archived}
              onCheckedChange={(value) => {
                const next = new Set(selected)
                if (value === true) next.add(module.id)
                else next.delete(module.id)
                onSelectedModuleIdsChange([...next])
              }}
              className="mt-0.5"
            />
            <Label
              htmlFor={inputId}
              className="flex min-w-0 flex-1 cursor-pointer items-start justify-between gap-3"
            >
              <span className="min-w-0 space-y-1">
                <span className="text-foreground block text-[0.8125rem] font-medium">
                  {module.name}
                </span>
                {module.description && (
                  <span className="text-muted-foreground block text-xs leading-relaxed">
                    {module.description}
                  </span>
                )}
                <span className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {module.featureSlug && (
                    <Badge variant="outline">rollout flag</Badge>
                  )}
                  {archived && <Badge variant="warning">Archived</Badge>}
                </span>
                {module.featureSlug && (
                  <span className="text-muted-foreground block font-mono text-[11px]">
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

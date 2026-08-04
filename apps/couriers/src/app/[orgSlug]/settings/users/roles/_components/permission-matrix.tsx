'use client'

import { useState } from 'react'
import { Button } from '@876/ui/button'
import { Checkbox } from '@876/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import {
  modulePermissionKeys,
  PERMISSION_CATALOG,
  permissionKey,
} from '@/lib/permissions'
import type { PermissionAction, PermissionModule } from '@/types/permissions'

const ACTIONS: Array<{ key: PermissionAction; label: string }> = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
]

type Props = {
  value: string[]
  onChange: (next: string[]) => void
  readOnly?: boolean
}

export function PermissionMatrix({ value, onChange, readOnly = false }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const selected = new Set(value)

  function setKeys(keys: string[], checked: boolean) {
    const next = new Set(value)

    for (const key of keys) {
      if (checked) next.add(key)
      else next.delete(key)
    }

    onChange(Array.from(next))
  }

  function toggleExpanded(moduleKey: string) {
    setExpanded((current) => {
      const next = new Set(current)

      if (next.has(moduleKey)) next.delete(moduleKey)
      else next.add(moduleKey)

      return next
    })
  }

  return (
    <div className="876-card overflow-x-auto">
      <Table className="min-w-[760px]">
        <TableHeader className="876-header-row">
          <TableRow>
            <TableHead className="px-5 py-3.5">Module</TableHead>
            <TableHead className="px-4 py-3.5 text-center">Full</TableHead>
            {ACTIONS.map((action) => (
              <TableHead key={action.key} className="px-4 py-3.5 text-center">
                {action.label}
              </TableHead>
            ))}
            <TableHead className="px-4 py-3.5 text-center">Others</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {PERMISSION_CATALOG.map((module) => {
            const moduleKeys = modulePermissionKeys(module)
            const selectedCount = moduleKeys.filter((key) =>
              selected.has(key)
            ).length
            const allSelected = selectedCount === moduleKeys.length
            const partiallySelected = selectedCount > 0 && !allSelected
            const isExpanded = expanded.has(module.key)

            return (
              <PermissionRows
                key={module.key}
                module={module}
                selected={selected}
                allSelected={allSelected}
                partiallySelected={partiallySelected}
                expanded={isExpanded}
                readOnly={readOnly}
                onSetKeys={setKeys}
                onToggleExpanded={() => toggleExpanded(module.key)}
              />
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function PermissionRows({
  module,
  selected,
  allSelected,
  partiallySelected,
  expanded,
  readOnly,
  onSetKeys,
  onToggleExpanded,
}: {
  module: PermissionModule
  selected: Set<string>
  allSelected: boolean
  partiallySelected: boolean
  expanded: boolean
  readOnly: boolean
  onSetKeys: (keys: string[], checked: boolean) => void
  onToggleExpanded: () => void
}) {
  return (
    <>
      <TableRow>
        <TableCell className="px-5 py-4 font-medium">{module.label}</TableCell>
        <TableCell className="px-4 py-4">
          <div className="flex justify-center">
            <Checkbox
              aria-label={`Full access to ${module.label}`}
              checked={allSelected}
              indeterminate={partiallySelected}
              disabled={readOnly}
              onCheckedChange={(checked) =>
                onSetKeys(modulePermissionKeys(module), checked)
              }
            />
          </div>
        </TableCell>
        {ACTIONS.map((action) => {
          const supported = module.actions.includes(action.key)
          const key = permissionKey(module.key, action.key)

          return (
            <TableCell key={action.key} className="px-4 py-4 text-center">
              {supported ? (
                <div className="flex justify-center">
                  <Checkbox
                    aria-label={`${action.label} ${module.label}`}
                    checked={selected.has(key)}
                    disabled={readOnly}
                    onCheckedChange={(checked) => onSetKeys([key], checked)}
                  />
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
          )
        })}
        <TableCell className="px-4 py-4 text-center">
          {module.extras.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onToggleExpanded}
              aria-expanded={expanded}
            >
              +{module.extras.length} more
            </Button>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
      </TableRow>
      {expanded ? (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/30 px-5 py-4">
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {module.extras.map((extra) => {
                const key = permissionKey(module.key, extra.key)

                return (
                  <label
                    key={extra.key}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={selected.has(key)}
                      disabled={readOnly}
                      onCheckedChange={(checked) => onSetKeys([key], checked)}
                    />
                    {extra.label}
                  </label>
                )
              })}
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  )
}

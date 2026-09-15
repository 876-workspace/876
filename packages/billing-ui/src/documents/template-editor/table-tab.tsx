'use client'

import { Input } from '@876/ui/input'
import { Switch } from '@876/ui/switch'

import {
  ColorField,
  NullableColorField,
  NumberField,
  ToggleRow,
} from './fields'
import type { TemplateTabProps } from './types'

export function TableTab({ settings, patch, onInvalid }: TemplateTabProps) {
  const table = settings.table
  return (
    <div className="space-y-6">
      <section aria-label="Columns" className="space-y-4">
        <h3 className="text-sm font-semibold">Columns</h3>
        <ul className="space-y-3">
          {table.columns.map((column) => (
            <li key={column.key} className="flex items-center gap-3">
              <Switch
                aria-label={`Show ${column.key} column`}
                checked={column.show}
                onCheckedChange={(checked) =>
                  patch((draft) => {
                    const entry = draft.table.columns.find(
                      (item) => item.key === column.key
                    )
                    if (entry) entry.show = checked
                  })
                }
              />
              <span className="text-muted-foreground w-24 shrink-0 text-sm">
                {column.key}
              </span>
              <Input
                aria-label={`${column.key} label`}
                value={column.label}
                onChange={(event) =>
                  patch((draft) => {
                    const entry = draft.table.columns.find(
                      (item) => item.key === column.key
                    )
                    if (entry) entry.label = event.target.value
                  })
                }
              />
              <Input
                aria-label={`${column.key} width percent`}
                type="number"
                min={4}
                max={80}
                placeholder="Auto"
                value={column.widthPercent ?? ''}
                className="w-24"
                onChange={(event) => {
                  const raw = event.target.value
                  patch((draft) => {
                    const entry = draft.table.columns.find(
                      (item) => item.key === column.key
                    )
                    if (!entry) return
                    if (raw.trim() === '') {
                      entry.widthPercent = null
                      return
                    }
                    const next = Number.parseInt(raw, 10)
                    if (Number.isFinite(next)) entry.widthPercent = next
                  })
                }}
              />
            </li>
          ))}
        </ul>
        <ToggleRow
          id="table-show-borders"
          label="Show borders"
          checked={table.showBorders}
          onChange={(checked) =>
            patch((draft) => {
              draft.table.showBorders = checked
            })
          }
        />
        <ToggleRow
          id="table-show-item-description"
          label="Show item description"
          checked={table.showItemDescription}
          onChange={(checked) =>
            patch((draft) => {
              draft.table.showItemDescription = checked
            })
          }
        />
      </section>
      <section aria-label="Header style" className="space-y-4">
        <h3 className="text-sm font-semibold">Header style</h3>
        <NumberField
          id="table-header-font-size"
          label="Header font size"
          value={table.header.fontSize}
          min={6}
          max={36}
          onChange={(value) =>
            patch((draft) => {
              draft.table.header.fontSize = value
            })
          }
        />
        <ColorField
          id="table-header-font-color"
          label="Header font color"
          value={table.header.fontColor}
          onChange={(value) =>
            patch((draft) => {
              draft.table.header.fontColor = value
            })
          }
          onInvalid={onInvalid}
        />
        <NullableColorField
          id="table-header-background-color"
          label="Header background"
          value={table.header.backgroundColor}
          onChange={(value) =>
            patch((draft) => {
              draft.table.header.backgroundColor = value
            })
          }
          onInvalid={onInvalid}
        />
      </section>
      <section aria-label="Row style" className="space-y-4">
        <h3 className="text-sm font-semibold">Row style</h3>
        <NumberField
          id="table-row-font-size"
          label="Row font size"
          value={table.row.fontSize}
          min={6}
          max={36}
          onChange={(value) =>
            patch((draft) => {
              draft.table.row.fontSize = value
            })
          }
        />
        <ColorField
          id="table-row-font-color"
          label="Row font color"
          value={table.row.fontColor}
          onChange={(value) =>
            patch((draft) => {
              draft.table.row.fontColor = value
            })
          }
          onInvalid={onInvalid}
        />
        <NullableColorField
          id="table-row-background-color"
          label="Row background"
          value={table.row.backgroundColor}
          onChange={(value) =>
            patch((draft) => {
              draft.table.row.backgroundColor = value
            })
          }
          onInvalid={onInvalid}
        />
      </section>
      <section aria-label="Description style" className="space-y-4">
        <h3 className="text-sm font-semibold">Description style</h3>
        <NumberField
          id="table-description-font-size"
          label="Description font size"
          value={table.description.fontSize}
          min={6}
          max={36}
          onChange={(value) =>
            patch((draft) => {
              draft.table.description.fontSize = value
            })
          }
        />
        <ColorField
          id="table-description-font-color"
          label="Description font color"
          value={table.description.fontColor}
          onChange={(value) =>
            patch((draft) => {
              draft.table.description.fontColor = value
            })
          }
          onInvalid={onInvalid}
        />
      </section>
    </div>
  )
}

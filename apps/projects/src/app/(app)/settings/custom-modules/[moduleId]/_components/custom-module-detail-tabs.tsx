'use client'

import type {
  CustomModule,
  CustomModuleField,
  CustomModuleStatus,
  Layout,
} from '@876/projects/contracts'
import { useState } from 'react'

import { CustomModuleAccessForm } from './custom-module-access-form'
import { CustomModuleFieldsManager } from './custom-module-fields-manager'
import { CustomModuleLayoutSection } from './custom-module-layout-section'
import { CustomModuleStatusesForm } from './custom-module-statuses-form'

const TABS = [
  { key: 'fields', label: 'Fields' },
  { key: 'statuses', label: 'Statuses' },
  { key: 'layout', label: 'Layout' },
  { key: 'access', label: 'Access' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function CustomModuleDetailTabs({
  module,
  fields,
  statuses,
  layout,
  availableFields,
}: {
  module: CustomModule
  fields: readonly CustomModuleField[]
  statuses: readonly CustomModuleStatus[]
  layout: Layout | null
  availableFields: { fieldKey: string; label: string }[]
}) {
  const [tab, setTab] = useState<TabKey>('fields')

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Custom module settings" className="flex flex-wrap gap-2">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            role="tab"
            aria-selected={tab === entry.key}
            type="button"
            onClick={() => setTab(entry.key)}
            className={
              tab === entry.key
                ? 'rounded-full bg-sky-600 px-4 py-1.5 text-sm font-medium text-white'
                : 'rounded-full border px-4 py-1.5 text-sm font-medium'
            }
          >
            {entry.label}
          </button>
        ))}
      </div>
      {tab === 'fields' ? (
        <section aria-label="Fields">
          <CustomModuleFieldsManager moduleId={module.id} initial={fields} />
        </section>
      ) : null}
      {tab === 'statuses' ? (
        <section aria-label="Statuses">
          <CustomModuleStatusesForm moduleId={module.id} initial={statuses} />
        </section>
      ) : null}
      {tab === 'layout' ? (
        <section aria-label="Layout">
          <CustomModuleLayoutSection
            moduleKey={module.key}
            pluralName={module.pluralName}
            layout={layout}
            availableFields={availableFields}
          />
        </section>
      ) : null}
      {tab === 'access' ? (
        <section aria-label="Access">
          <CustomModuleAccessForm module={module} />
        </section>
      ) : null}
    </div>
  )
}

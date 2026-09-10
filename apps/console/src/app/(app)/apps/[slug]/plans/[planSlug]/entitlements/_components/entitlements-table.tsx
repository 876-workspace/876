'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import { toast } from 'sonner'
import { AppError } from '@876/ui/app-error'
import type { AppError as AppErrorValue } from '@876/core/types/errors'

import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

import { PlanModulePicker } from '@/features/plans/components/plan-module-picker'
import { client } from '@/lib/client'
import type { PlanModuleOption } from '@/types/plans'

type Props = {
  productId: string
  modules: PlanModuleOption[]
  initialModuleIds: string[]
  status: string
  statusOptions: StatusFilterOption[]
  loadError: AppErrorValue | null
}

export function EntitlementsTable({
  productId,
  modules,
  initialModuleIds,
  status,
  statusOptions,
  loadError,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedModuleIds, setSelectedModuleIds] = useState(initialModuleIds)
  const [saveError, setSaveError] = useState<AppErrorValue | null>(null)
  const error = loadError ?? saveError

  function save() {
    if (loadError) return
    setSaveError(null)
    startTransition(async () => {
      const { data, error } = await client.products.replaceModules(productId, {
        module_ids: selectedModuleIds,
      })
      if (error) {
        setSaveError(error)
        return
      }

      setSelectedModuleIds(data.module_ids)
      toast.success('Plan modules updated.')
      router.refresh()
    })
  }

  const changed =
    [...selectedModuleIds].sort().join(',') !==
    [...initialModuleIds].sort().join(',')

  return (
    <div className="space-y-4">
      {/* Heading, count and Save share one row: the toolbar used to own a
          full row with an empty right half, and the count/Save row sat under
          it. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <StatusFilterHeading
          label="Entitlements"
          value={status}
          options={statusOptions}
        />
        <div className="flex items-center gap-3">
          <p className="text-muted-foreground text-[0.8125rem]">
            {selectedModuleIds.length} of {modules.length}{' '}
            {modules.length === 1 ? 'module' : 'modules'} included
            {changed ? ' · Unsaved changes' : ''}
          </p>
          <Button
            size="sm"
            variant={changed ? 'info' : 'outline'}
            onClick={save}
            disabled={isPending || !changed || Boolean(loadError)}
          >
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {error ? (
        <AppError
          title={
            loadError
              ? 'Modules could not be loaded'
              : 'Modules could not be saved'
          }
          error={error}
          variant="inline"
          showCode
        />
      ) : null}
      {!loadError && (
        <PlanModulePicker
          modules={modules}
          selectedModuleIds={selectedModuleIds}
          onSelectedModuleIdsChange={setSelectedModuleIds}
          disabled={isPending}
        />
      )}
    </div>
  )
}

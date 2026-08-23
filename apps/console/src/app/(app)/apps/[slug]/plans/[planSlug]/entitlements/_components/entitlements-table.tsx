'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import { toast } from 'sonner'

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
}

export function EntitlementsTable({
  productId,
  modules,
  initialModuleIds,
  status,
  statusOptions,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedModuleIds, setSelectedModuleIds] = useState(initialModuleIds)

  function save() {
    startTransition(async () => {
      const { data, error } = await client.products.replaceModules(productId, {
        module_ids: selectedModuleIds,
      })
      if (error || !data) {
        toast.error(error?.message ?? 'Failed to update plan modules.')
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
            disabled={isPending || !changed}
          >
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <PlanModulePicker
        modules={modules}
        selectedModuleIds={selectedModuleIds}
        onSelectedModuleIdsChange={setSelectedModuleIds}
        disabled={isPending}
      />
    </div>
  )
}

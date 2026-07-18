'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import { toast } from 'sonner'

import { PlanModulePicker } from '@/components/plan-module-picker'
import { client } from '@/lib/client'
import type { PlanModuleOption } from '@/types/plans'

type Props = {
  productId: string
  modules: PlanModuleOption[]
  initialModuleIds: string[]
}

export function EntitlementsTable({
  productId,
  modules,
  initialModuleIds,
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
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground max-w-2xl text-xs leading-relaxed">
          A checked module is included in this plan. Its linked feature flag is
          still evaluated as an independent operational rollout control.
        </p>
        <Button size="sm" onClick={save} disabled={isPending || !changed}>
          {isPending ? 'Saving…' : 'Save modules'}
        </Button>
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

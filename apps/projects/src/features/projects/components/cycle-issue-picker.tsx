'use client'

import type { Issue } from '@876/projects/contracts'
import { Button } from '@876/ui/button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { cyclesClient } from '@/lib/client/cycles'

export function CycleIssuePicker({
  cycleId,
  unassignedIssues,
  onError,
}: {
  cycleId: string
  unassignedIssues: readonly Issue[]
  onError: (error: { code: string; message: string }) => void
}) {
  const router = useRouter()
  const [selected, setSelected] = useState('')
  const [pending, setPending] = useState(false)

  async function addSelected() {
    if (!selected || pending) return
    setPending(true)
    const result = await cyclesClient.assignIssues(cycleId, [selected])
    setPending(false)
    if (result.error) {
      onError(result.error)
      return
    }
    setSelected('')
    router.refresh()
  }

  return (
    <div className="876-card space-y-3 p-6">
      <h2 className="text-base font-semibold">Add work items</h2>
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Unassigned work items"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          className="876-input max-w-md flex-1"
        >
          <option value="">Select a work item</option>
          {unassignedIssues.map((issue) => (
            <option key={issue.id} value={issue.id}>
              {issue.identifier} · {issue.title}
            </option>
          ))}
        </select>
        <Button
          variant="info"
          onClick={addSelected}
          disabled={!selected || pending}
        >
          Add
        </Button>
      </div>
    </div>
  )
}

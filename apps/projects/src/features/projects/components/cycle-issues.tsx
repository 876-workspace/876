'use client'

import type { Issue } from '@876/projects/contracts'
import { Button } from '@876/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { cyclesClient } from '@/lib/client/cycles'

export function CycleIssues({
  cycleId,
  assignedIssues,
  onError,
}: {
  cycleId: string
  assignedIssues: readonly Issue[]
  onError: (error: { code: string; message: string }) => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function removeIssue(issueId: string) {
    if (pending) return
    setPending(true)
    const result = await cyclesClient.unassignIssue(cycleId, issueId)
    setPending(false)
    if (result.error) {
      onError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div className="876-card space-y-3 p-6">
      <h2 className="text-base font-semibold">Work items</h2>
      {assignedIssues.length === 0 ? (
        <div className="text-muted-foreground text-sm">
          No work items assigned.
        </div>
      ) : (
        <ul className="divide-y">
          {assignedIssues.map((issue) => (
            <li
              key={issue.id}
              className="flex items-center justify-between gap-3 py-2 text-sm"
            >
              <Link
                href={`/issues/${encodeURIComponent(issue.id)}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {issue.identifier} · {issue.title}
              </Link>
              <Button
                variant="outline"
                onClick={() => removeIssue(issue.id)}
                disabled={pending}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

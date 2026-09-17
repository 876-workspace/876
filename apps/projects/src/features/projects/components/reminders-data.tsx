import type { AppErrorValue } from '@876/ui/app-error'

import { remindersForTarget } from '@/features/projects/reminder-timing'
import { projects } from '@/lib/services/projects'
import { RemindersPanel } from './reminders-panel'
import type { ReminderTarget } from '@/types/events'

/**
 * The caller's reminders for one record.
 *
 * `reminders.list` is already scoped to the creator by the service, so this
 * only narrows the list to the record being viewed.
 */
export async function RemindersData({
  orgId,
  userId,
  target,
  title = 'Reminders',
  base = 'the due date',
}: {
  orgId: string
  userId: string
  target: ReminderTarget
  title?: string
  base?: string
}) {
  const result = await projects.reminders.list(orgId, userId)
  const loadError: AppErrorValue | null = result.error

  return (
    <section className="876-card space-y-4 p-5 sm:p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      <RemindersPanel
        target={target}
        reminders={remindersForTarget(result.data?.data ?? [], target)}
        base={base}
        loadError={loadError}
      />
    </section>
  )
}

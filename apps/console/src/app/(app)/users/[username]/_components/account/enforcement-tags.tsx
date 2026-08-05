import { cn } from '@876/core/utils'

import type { EnforcementTag } from '@/types/customer'
import { enforcementToneClass } from '../../_lib/enforcement'

/**
 * The account's standing, as one row of chips.
 *
 * All of it visible at once — banned *and* email-unverified *and* deleted read
 * together, because an agent deciding what to do about an account needs the
 * whole picture in one glance, not one badge plus three dialogs.
 */
export function EnforcementTags({
  tags,
  size = 'md',
}: {
  tags: EnforcementTag[]
  size?: 'sm' | 'md'
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag.key}
          title={tag.detail}
          className={cn(
            'inline-flex items-center gap-1 rounded-md border font-medium',
            size === 'sm'
              ? 'px-1.5 py-0.5 text-[0.6875rem]'
              : 'px-2 py-0.5 text-xs',
            enforcementToneClass(tag.tone)
          )}
        >
          {tag.label}
          {tag.detail && (
            <span className="opacity-70">· {truncate(tag.detail)}</span>
          )}
        </span>
      ))}
    </div>
  )
}

function truncate(value: string, max = 28): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

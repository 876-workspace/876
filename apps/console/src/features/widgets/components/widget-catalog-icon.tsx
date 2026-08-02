import Image from 'next/image'
import type { WidgetVisual } from '@876/widgets'
import { NotepadIcon } from '@876/widgets/react'
import { Terminal } from '@876/ui/icons'
import { cn } from '@876/ui/lib/utils'

export function WidgetCatalogIcon({
  visual,
  className,
  iconClassName,
}: {
  visual: WidgetVisual
  className?: string
  iconClassName?: string
}) {
  const icon =
    visual.kind === 'image' ? (
      <Image
        src={visual.src}
        alt={visual.alt}
        width={28}
        height={28}
        unoptimized
        className={cn('size-7 object-contain', iconClassName)}
      />
    ) : visual.icon === 'notepad' ? (
      <NotepadIcon className={cn('size-5', iconClassName)} />
    ) : (
      <Terminal className={cn('size-5', iconClassName)} />
    )

  return (
    <span
      className={cn(
        'border-876-surface-border bg-876-surface inline-flex size-10 shrink-0 items-center justify-center rounded-lg border shadow-xs',
        visual.kind === 'icon' &&
          visual.icon === 'notepad' &&
          'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300',
        className
      )}
    >
      {icon}
    </span>
  )
}

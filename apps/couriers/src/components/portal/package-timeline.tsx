import { CheckIcon } from '@876/ui/icons'

import { getPackageTimeline } from '@/lib/portal/package-status'
import type { PackageStatus } from '@/types/package'

export function PackageTimeline({ status }: { status: PackageStatus }) {
  const steps = getPackageTimeline(status)

  return (
    <ol className="space-y-0">
      {steps.map((step, index) => {
        const reached = step.state !== 'pending'
        const current = step.state === 'current'
        const last = index === steps.length - 1

        return (
          <li
            key={step.status}
            aria-current={current ? 'step' : undefined}
            className="relative flex min-h-14 gap-3"
          >
            {!last ? (
              <span
                aria-hidden="true"
                className={`absolute top-6 left-[0.4375rem] h-[calc(100%-0.25rem)] w-px ${
                  step.state === 'reached' ? 'bg-primary' : 'bg-border'
                }`}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={`relative z-10 mt-1 flex size-4 shrink-0 items-center justify-center rounded-full ${
                reached
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted ring-border ring-1'
              } ${current ? 'ring-primary/25 ring-4' : ''}`}
            >
              {step.state === 'reached' ? (
                <CheckIcon className="size-2.5" />
              ) : null}
            </span>
            <span
              className={`pb-6 text-sm ${
                current
                  ? 'text-foreground font-semibold'
                  : reached
                    ? 'text-foreground'
                    : 'text-muted-foreground'
              }`}
            >
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

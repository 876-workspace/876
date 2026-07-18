'use client'

import { cn } from '../lib/utils'
import type { WizardStep } from './types'

export function OnboardingStepper({
  steps,
  current,
  className,
}: {
  steps: WizardStep[]
  current: number
  className?: string
}) {
  return (
    <nav aria-label="Progress" className={cn('overflow-x-auto', className)}>
      <ol className="flex min-w-max items-start">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isComplete = stepNumber < current
          const isActive = stepNumber === current

          return (
            <li
              key={step.key}
              className="flex items-start"
              aria-current={isActive ? 'step' : undefined}
            >
              <div className="flex flex-col items-center gap-2">
                <span
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full text-xs font-semibold ring-2',
                    isComplete || isActive
                      ? 'bg-primary text-primary-foreground ring-primary'
                      : 'bg-background text-muted-foreground ring-border'
                  )}
                >
                  {isComplete ? (
                    <svg
                      aria-hidden="true"
                      className="size-3.5"
                      viewBox="0 0 14 14"
                      fill="none"
                    >
                      <path
                        d="M2 7l4 4 6-7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    stepNumber
                  )}
                </span>
                <span className="text-muted-foreground hidden max-w-28 text-center text-xs sm:block">
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'mx-3 mt-4 h-px w-10',
                    isComplete ? 'bg-primary' : 'bg-border'
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

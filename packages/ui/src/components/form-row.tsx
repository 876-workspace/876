'use client'

import * as React from 'react'

import { Info } from '../icons'
import { cn } from '../lib/utils'
import { Label } from './label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip'

type FormRowProps = {
  /** Points the label at its control. Omit for a row wrapping several controls. */
  htmlFor?: string
  label: string
  /** Marks the field mandatory: the label turns destructive and gains an asterisk. */
  required?: boolean
  /**
   * Guidance shown in an info tooltip beside the label.
   *
   * Deliberately a tooltip rather than a paragraph under the control — the
   * repo bans explanatory prose in the layout (see `CLAUDE.md` → UI Copy), and
   * an icon keeps the guidance available without spending a line on it.
   */
  hint?: string
  className?: string
  children: React.ReactNode
}

/**
 * One labelled row of a form: label on the left, control(s) on the right.
 *
 * The label column is fixed so every row in a form aligns on the same axis,
 * which is what lets several controls share a row without the form reading as
 * a ragged stack. Below `sm` the row collapses to label-above-control.
 */
function FormRow({
  htmlFor,
  label,
  required,
  hint,
  className,
  children,
}: FormRowProps) {
  return (
    <div
      data-slot="form-row"
      className={cn(
        'gap-1.5 sm:grid sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-start sm:gap-4',
        className
      )}
    >
      <div className="flex items-center gap-1.5 sm:mb-0 sm:pt-2">
        <Label
          htmlFor={htmlFor}
          className={cn('mb-0', required && 'text-destructive')}
        >
          {label}
        </Label>
        {/* Outside the <label> so the asterisk never becomes part of the
            control's accessible name — a screen reader should announce
            "Warehouse name", not "Warehouse name star". */}
        {required ? (
          <span aria-hidden className="text-destructive -ml-1">
            *
          </span>
        ) : null}
        {hint ? (
          // Its own provider so a form can drop in a hint without every app
          // having to mount one at the root.
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                type="button"
                aria-label={`About ${label}`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Info className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent className="max-w-64">{hint}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>

      <div className="min-w-0">{children}</div>
    </div>
  )
}

/** Sits inside a `FormRow` to place several controls on one line. */
function FormRowGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="form-row-group"
      className={cn('flex flex-wrap items-start gap-3', className)}
      {...props}
    />
  )
}

export { FormRow, FormRowGroup }

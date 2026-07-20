'use client'

import { useCallback, useId, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { cn } from '@876/core/utils'

import {
  isSizeLocked,
  sizeTooltipLabel,
  type WidgetSize,
  type WidgetSizePolicy,
} from '../types/widget-size'
import { WIDGET_SIZE_ICONS } from './widget-size-icons'

export function WidgetSizeControl({
  policy,
  value,
  onChange,
  compact = false,
  className,
}: {
  policy: WidgetSizePolicy
  value: WidgetSize
  onChange: (size: WidgetSize) => void
  /** When true, show a single fill-style button that opens the palette. */
  compact?: boolean
  className?: string
}) {
  if (isSizeLocked(policy)) return null

  if (compact) {
    return (
      <CompactSizeControl
        policy={policy}
        value={value}
        onChange={onChange}
        className={className}
      />
    )
  }

  return (
    <SizePalette
      policy={policy}
      value={value}
      onChange={onChange}
      className={className}
    />
  )
}

function SizePalette({
  policy,
  value,
  onChange,
  className,
  id,
}: {
  policy: WidgetSizePolicy
  value: WidgetSize
  onChange: (size: WidgetSize) => void
  className?: string
  id?: string
}) {
  const reduceMotion = useReducedMotion()
  const groupId = useId()
  const radiogroupId = id ?? groupId
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([])

  const allowed = policy.allowed

  const focusIndex = useCallback(
    (index: number) => {
      const clamped = (index + allowed.length) % allowed.length
      buttonRefs.current[clamped]?.focus()
    },
    [allowed.length]
  )

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = allowed.indexOf(value)
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      const next = (current + 1) % allowed.length
      onChange(allowed[next]!)
      focusIndex(next)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      const next = (current - 1 + allowed.length) % allowed.length
      onChange(allowed[next]!)
      focusIndex(next)
    } else if (event.key === 'Home') {
      event.preventDefault()
      onChange(allowed[0]!)
      focusIndex(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      const last = allowed.length - 1
      onChange(allowed[last]!)
      focusIndex(last)
    }
  }

  return (
    <div
      role="radiogroup"
      id={radiogroupId}
      aria-label="Widget size"
      onKeyDown={onKeyDown}
      className={cn(
        'flex items-center gap-0.5 rounded-xl p-0.5',
        'bg-muted/50 dark:bg-white/5',
        className
      )}
    >
      {allowed.map((size, index) => {
        const Icon = WIDGET_SIZE_ICONS[size]
        const selected = value === size
        const label = sizeTooltipLabel(size)

        return (
          <motion.button
            key={size}
            ref={(node) => {
              buttonRefs.current[index] = node
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            title={label}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(size)}
            whileTap={reduceMotion ? undefined : { scale: 0.92 }}
            animate={
              selected && !reduceMotion ? { scale: [1, 1.08, 1] } : { scale: 1 }
            }
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={cn(
              'relative flex size-7 items-center justify-center rounded-lg',
              'transition-[background-color,box-shadow,color]',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-hidden',
              selected
                ? 'bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
            )}
          >
            <Icon className="size-4" />
            {selected ? (
              <span
                aria-hidden="true"
                className="bg-foreground absolute top-0.5 right-0.5 size-1 rounded-full"
              />
            ) : null}
          </motion.button>
        )
      })}
    </div>
  )
}

function CompactSizeControl({
  policy,
  value,
  onChange,
  className,
}: {
  policy: WidgetSizePolicy
  value: WidgetSize
  onChange: (size: WidgetSize) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const Icon = WIDGET_SIZE_ICONS[value]
  const label = sizeTooltipLabel(value)
  const menuId = useId()

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        aria-label={`Widget size: ${label}`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        title={label}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'text-muted-foreground hover:bg-muted hover:text-foreground',
          'focus-visible:ring-ring flex size-8 items-center justify-center rounded-lg',
          'transition-colors focus-visible:ring-2 focus-visible:outline-hidden',
          open && 'bg-muted text-foreground'
        )}
      >
        <Icon className="size-4" />
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <button
              type="button"
              aria-label="Close size menu"
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setOpen(false)}
            />
            <motion.div
              id={menuId}
              role="dialog"
              aria-label="Choose widget size"
              initial={
                reduceMotion
                  ? { opacity: 1 }
                  : { opacity: 0, y: -4, scale: 0.96 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: -2, scale: 0.98 }
              }
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className={cn(
                'border-border/70 bg-popover absolute top-full right-0 z-50 mt-1.5',
                'rounded-xl border p-1.5 shadow-lg'
              )}
            >
              <SizePalette
                policy={policy}
                value={value}
                onChange={(size) => {
                  onChange(size)
                  setOpen(false)
                }}
              />
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

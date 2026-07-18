'use client'

import { ArrowLeft } from '@876/ui/icons'
import { useState, type ReactNode } from 'react'

import { cn } from '@876/core/utils'

type ScreenProps<TScreen extends string> = {
  initialScreen: TScreen
  children: (props: {
    screen: TScreen
    setScreen: (screen: TScreen) => void
    resetScreen: () => void
  }) => ReactNode
}

export function Screen<TScreen extends string>({
  initialScreen,
  children,
}: ScreenProps<TScreen>) {
  const [screen, setScreen] = useState<TScreen>(initialScreen)

  function resetScreen() {
    setScreen(initialScreen)
  }

  return <>{children({ screen, setScreen, resetScreen })}</>
}

type ScreenPanelProps = {
  title?: string
  onBack?: () => void
  children: ReactNode
  className?: string
}

export function ScreenPanel({
  title,
  onBack,
  children,
  className,
}: ScreenPanelProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {onBack ? <ScreenHeader title={title} onBack={onBack} /> : null}
      {children}
    </div>
  )
}

type ScreenHeaderProps = {
  title?: string
  onBack: () => void
  className?: string
}

function ScreenHeader({ title, onBack, className }: ScreenHeaderProps) {
  return (
    <button
      type="button"
      onClick={onBack}
      className={cn(
        'hover:bg-accent focus-visible:ring-ring flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-hidden',
        className
      )}
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {title}
    </button>
  )
}

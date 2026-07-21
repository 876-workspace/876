'use client'

import { memo, type ReactNode } from 'react'
import { cn } from '@876/core/utils'

import { widgetFloatingCardClass } from './widget-popout'

export interface ChatRailProps {
  className?: string
  /** Chat participant triggers (avatar buttons) — future 876 Chat surface. */
  children?: ReactNode
}

export const ChatRail = memo(function ChatRail({
  className,
  children,
}: ChatRailProps) {
  return (
    <nav
      data-slot="chat-rail"
      aria-label="876 Chat"
      className={cn(
        '876-chat-rail flex min-h-0 flex-[35] basis-0 flex-col items-center gap-1 overflow-y-auto overscroll-contain p-1',
        '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
        widgetFloatingCardClass,
        className
      )}
    >
      {children}
    </nav>
  )
})

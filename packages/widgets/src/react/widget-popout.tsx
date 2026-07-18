'use client'

import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Minus, SidebarPanelIcon, X } from '@876/ui/icons'
import { cn } from '@876/core/utils'

export type WidgetPopoutSide = 'left' | 'right'
export type WidgetTooltipSide = 'left' | 'right'
export type WidgetPopoutSize = 'sm' | 'md' | 'lg' | 'xl'
/** Floating overlay vs in-flow layout column beside main body. */
export type WidgetPanelPresentation = 'popout' | 'docked'

const SPRING_ENTER = {
  type: 'spring',
  stiffness: 320,
  damping: 32,
  mass: 1,
} as const
const SPRING_EXIT = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
  mass: 1,
} as const

const SIZE_MAP: Record<WidgetPopoutSize, number> = {
  sm: 320,
  md: 384,
  lg: 520,
  xl: 720,
}

const RAIL_WIDTH_PX = 52
const RAIL_WIDTH_REM = '3.25rem'
/** Gap between the floating popout and the icon rail / viewport edges. */
const PANEL_GUTTER_PX = 24
/** Extra top/bottom inset so the floating card is not edge-to-edge tall. */
const PANEL_VERTICAL_INSET_PX = 10
const MIN_MAIN_COLUMN_WIDTH_PX = 600

type BeforeDeactivateHandler = () => boolean | void | Promise<boolean | void>

type WidgetPopoutContextValue = {
  activeItem: string | null
  side: WidgetPopoutSide
  isMobile: boolean
  navbarHeight: number
  presentation: WidgetPanelPresentation
  availableWidth: number | null
  toggleItem: (id: string) => Promise<boolean>
  closePopout: () => Promise<boolean>
  dockPanel: () => void
  popOutPanel: () => void
  registerBeforeDeactivate: (
    id: string,
    handler: BeforeDeactivateHandler
  ) => () => void
}

const WidgetPopoutContext = createContext<WidgetPopoutContextValue | undefined>(
  undefined
)

type WidgetPanelContextValue = {
  canDock: boolean
}

type WidgetContentLifecycleContextValue = {
  registerBeforeDeactivate: (handler: BeforeDeactivateHandler) => () => void
}

const WidgetPanelContext = createContext<WidgetPanelContextValue | undefined>(
  undefined
)
const WidgetContentLifecycleContext =
  createContext<WidgetContentLifecycleContextValue | null>(null)

function useWidgetPopout(): WidgetPopoutContextValue {
  const context = useContext(WidgetPopoutContext)
  if (!context) {
    throw new Error('WidgetPopout.* must be used within <WidgetPopout.Root>')
  }
  return context
}

/** Register work that must finish before the active widget is closed or replaced. */
export function useWidgetPanelLifecycle() {
  return useContext(WidgetContentLifecycleContext)
}

function useIsMobile(breakpoint: number): boolean {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const update = () => setIsMobile(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [breakpoint])
  return isMobile
}

/**
 * Widget dock: icon rail always lives in the shell layout.
 * Panel defaults to a floating popout; user can dock it into the layout column.
 */
function Root({
  side = 'right',
  defaultOpen = null,
  defaultPresentation = 'popout',
  onOpenChange,
  mobileBreakpoint = 768,
  navbarHeight = 64,
  className,
  children,
}: {
  side?: WidgetPopoutSide
  defaultOpen?: string | null
  defaultPresentation?: WidgetPanelPresentation
  onOpenChange?: (id: string | null) => void
  mobileBreakpoint?: number
  navbarHeight?: number
  className?: string
  children: ReactNode
}) {
  const [activeItem, setActiveItem] = useState<string | null>(defaultOpen)
  const [presentation, setPresentation] =
    useState<WidgetPanelPresentation>(defaultPresentation)
  const [availableWidth, setAvailableWidth] = useState<number | null>(null)
  const isMobile = useIsMobile(mobileBreakpoint)
  const isFirstRender = useRef(true)
  const rootRef = useRef<HTMLElement>(null)
  const activeItemRef = useRef(activeItem)
  const transitionPendingRef = useRef(false)
  const beforeDeactivateHandlersRef = useRef(
    new Map<string, Set<BeforeDeactivateHandler>>()
  )
  activeItemRef.current = activeItem

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    onOpenChange?.(activeItem)
  }, [activeItem, onOpenChange])

  useLayoutEffect(() => {
    const container = rootRef.current?.parentElement
    if (!container) return

    const updateAvailableWidth = () => {
      setAvailableWidth(container.getBoundingClientRect().width)
    }

    updateAvailableWidth()
    window.addEventListener('resize', updateAvailableWidth)

    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateAvailableWidth)
    observer?.observe(container)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateAvailableWidth)
    }
  }, [])

  const registerBeforeDeactivate = useCallback(
    (id: string, handler: BeforeDeactivateHandler) => {
      const handlers = beforeDeactivateHandlersRef.current.get(id) ?? new Set()
      handlers.add(handler)
      beforeDeactivateHandlersRef.current.set(id, handlers)

      return () => {
        handlers.delete(handler)
        if (handlers.size === 0) beforeDeactivateHandlersRef.current.delete(id)
      }
    },
    []
  )

  const requestActiveItem = useCallback(async (nextItem: string | null) => {
    const currentItem = activeItemRef.current
    if (currentItem === nextItem) return true
    if (transitionPendingRef.current) return false

    transitionPendingRef.current = true

    try {
      const handlers = currentItem
        ? [...(beforeDeactivateHandlersRef.current.get(currentItem) ?? [])]
        : []
      const results = await Promise.all(
        handlers.map(async (handler) => {
          try {
            return (await handler()) !== false
          } catch {
            return false
          }
        })
      )
      if (results.some((result) => !result)) return false

      activeItemRef.current = nextItem
      setActiveItem(nextItem)
      return true
    } finally {
      transitionPendingRef.current = false
    }
  }, [])

  const toggleItem = useCallback(
    (id: string) => requestActiveItem(activeItemRef.current === id ? null : id),
    [requestActiveItem]
  )
  const closePopout = useCallback(
    () => requestActiveItem(null),
    [requestActiveItem]
  )
  const dockPanel = useCallback(() => setPresentation('docked'), [])
  const popOutPanel = useCallback(() => setPresentation('popout'), [])

  useEffect(() => {
    if (!activeItem) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') void closePopout()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [activeItem, closePopout])

  const contextValue = useMemo<WidgetPopoutContextValue>(
    () => ({
      activeItem,
      side,
      isMobile,
      navbarHeight,
      presentation,
      availableWidth,
      toggleItem,
      closePopout,
      dockPanel,
      popOutPanel,
      registerBeforeDeactivate,
    }),
    [
      activeItem,
      side,
      isMobile,
      navbarHeight,
      presentation,
      availableWidth,
      toggleItem,
      closePopout,
      dockPanel,
      popOutPanel,
      registerBeforeDeactivate,
    ]
  )

  return (
    <WidgetPopoutContext.Provider value={contextValue}>
      <aside
        ref={rootRef}
        data-slot="widget-dock"
        data-side={side}
        data-presentation={presentation}
        aria-label="Widget dock"
        className={cn(
          // Fills the body row under the navbar (host places dock inside AppShellBody).
          '876-widget-dock relative z-20 hidden h-full min-h-0 shrink-0 md:flex',
          // Docked panel | rail on the right; reverse on the left.
          side === 'right' ? 'flex-row' : 'flex-row-reverse',
          className
        )}
      >
        {children}
      </aside>
    </WidgetPopoutContext.Provider>
  )
}

const Rail = memo(function Rail({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  const { side } = useWidgetPopout()

  return (
    <nav
      aria-label="Widgets"
      className={cn(
        '876-widget-rail flex h-full shrink-0 flex-col items-center gap-0.5',
        'overflow-y-auto overscroll-contain p-1.5 pt-2',
        '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
        'border-border/80 bg-876-surface/95 supports-[backdrop-filter]:bg-876-surface/80 backdrop-blur-xl',
        'dark:bg-sidebar/95 dark:supports-[backdrop-filter]:bg-sidebar/80',
        side === 'right' ? 'border-l' : 'border-r',
        className
      )}
      style={{ width: RAIL_WIDTH_REM }}
    >
      {children}
    </nav>
  )
})

const Trigger = memo(function Trigger({
  id,
  icon,
  label,
  tooltipSide = 'left',
  className,
}: {
  id: string
  icon: ReactNode
  label: string
  tooltipSide?: WidgetTooltipSide
  className?: string
}) {
  const { activeItem, toggleItem, isMobile, side } = useWidgetPopout()
  const [showTooltip, setShowTooltip] = useState(false)
  const isActive = activeItem === id
  const buttonId = useId()
  const tipSide = tooltipSide ?? (side === 'right' ? 'left' : 'right')

  return (
    <div className="relative">
      <motion.button
        id={buttonId}
        type="button"
        onClick={() => void toggleItem(id)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-pressed={isActive}
        aria-label={label}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: 'tween', duration: 0.12 }}
        className={cn(
          'relative flex size-10 items-center justify-center rounded-[0.95rem]',
          'transition-[color,background-color,box-shadow,transform]',
          'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden',
          '[&_svg]:size-[1.125rem] [&_svg]:shrink-0',
          isActive
            ? [
                'bg-[var(--876-nav-active-bg)] text-[var(--876-nav-active-fg)]',
                'shadow-[inset_0_1px_0_color-mix(in_oklab,white_35%,transparent),0_1px_2px_color-mix(in_oklab,var(--876-nav-active-fg)_18%,transparent)]',
                'ring-1 ring-[color-mix(in_oklab,var(--876-nav-active-fg)_22%,transparent)]',
              ]
            : 'text-muted-foreground hover:bg-muted/90 hover:text-foreground dark:hover:bg-white/8',
          className
        )}
      >
        <span className={cn('relative', isActive && 'drop-shadow-sm')}>
          {icon}
        </span>
      </motion.button>

      <AnimatePresence>
        {showTooltip && !isMobile && (
          <motion.span
            role="tooltip"
            initial={{
              opacity: 0,
              x: tipSide === 'left' ? 8 : -8,
              scale: 0.96,
            }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{
              opacity: 0,
              x: tipSide === 'left' ? 4 : -4,
              scale: 0.98,
            }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className={cn(
              'pointer-events-none absolute top-1/2 z-50 -translate-y-1/2',
              'border-border/70 bg-popover rounded-lg border px-2.5 py-1.5',
              'text-popover-foreground text-xs font-medium tracking-tight whitespace-nowrap',
              'shadow-[0_4px_18px_oklch(0.23_0.02_262_/_0.12)] dark:shadow-[0_8px_28px_oklch(0_0_0_/_0.45)]',
              tipSide === 'left' ? 'right-full mr-3' : 'left-full ml-3'
            )}
          >
            {label}
            <span
              aria-hidden="true"
              className={cn(
                'bg-popover absolute top-1/2 size-1.5 -translate-y-1/2 rotate-45 border',
                tipSide === 'left'
                  ? 'border-border/70 right-0 translate-x-1/2 border-t-transparent border-l-transparent'
                  : 'border-border/70 left-0 -translate-x-1/2 border-r-transparent border-b-transparent'
              )}
            />
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
})

function resolvePanelWidth(
  activeItem: string | null,
  size: WidgetPopoutSize,
  sizeByItem: Partial<Record<string, WidgetPopoutSize>> | undefined,
  defaultWidth: number | undefined
) {
  const resolvedSize = activeItem ? (sizeByItem?.[activeItem] ?? size) : size
  return defaultWidth ?? SIZE_MAP[resolvedSize]
}

/**
 * Panel host: popout (default, floating) or docked (in-flow layout column).
 * Toggle from the panel header next to close.
 */
function Panel({
  size = 'md',
  sizeByItem,
  defaultWidth,
  className,
  children,
}: {
  size?: WidgetPopoutSize
  sizeByItem?: Partial<Record<string, WidgetPopoutSize>>
  defaultWidth?: number
  className?: string
  children: ReactNode
}) {
  const {
    activeItem,
    availableWidth,
    isMobile,
    navbarHeight,
    presentation,
    popOutPanel,
    side,
  } = useWidgetPopout()
  const reduceMotion = useReducedMotion()
  const width = resolvePanelWidth(activeItem, size, sizeByItem, defaultWidth)
  const open = Boolean(activeItem) && !isMobile
  const docked = presentation === 'docked'
  const canDock =
    availableWidth !== null &&
    availableWidth - RAIL_WIDTH_PX - width >= MIN_MAIN_COLUMN_WIDTH_PX
  const floatingOffset = isMobile ? 0 : RAIL_WIDTH_PX + PANEL_GUTTER_PX
  const slide =
    side === 'right' ? width + floatingOffset : -(width + floatingOffset)
  const floatingMaxWidth = isMobile
    ? '100%'
    : `calc(100vw - ${RAIL_WIDTH_PX + PANEL_GUTTER_PX * 2}px)`
  const panelContextValue = useMemo(() => ({ canDock }), [canDock])

  useLayoutEffect(() => {
    if (docked && availableWidth !== null && !canDock) popOutPanel()
  }, [availableWidth, canDock, docked, popOutPanel])

  return (
    <motion.div
      data-slot="widget-panel"
      data-presentation={docked ? 'docked' : 'popout'}
      data-open={open ? 'true' : 'false'}
      data-can-dock={canDock ? 'true' : 'false'}
      aria-hidden={!open}
      className={cn(
        '876-widget-panel flex min-h-0 shrink-0 flex-col overflow-hidden',
        'border-876-surface-border bg-876-surface border',
        docked
          ? [
              'relative h-full transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
              open && (side === 'right' ? 'border-l' : 'border-r'),
            ]
          : [
              'fixed z-40 shadow-[0_16px_50px_rgba(0,0,0,0.14)] dark:shadow-[0_8px_28px_rgba(0,0,0,0.28)]',
              isMobile ? 'bottom-0' : null,
              side === 'right'
                ? 'rounded-tl-2xl border-r-0 border-b-0'
                : 'rounded-tr-2xl border-b-0 border-l-0',
            ],
        !open && 'pointer-events-none',
        className
      )}
      style={{
        top: docked
          ? undefined
          : isMobile
            ? navbarHeight
            : navbarHeight + PANEL_VERTICAL_INSET_PX,
        bottom: docked || isMobile ? undefined : PANEL_VERTICAL_INSET_PX,
        width: docked ? (open ? width : 0) : isMobile ? '100%' : width,
        maxWidth: docked ? width : floatingMaxWidth,
        ...(docked
          ? undefined
          : side === 'right'
            ? { right: isMobile ? 0 : floatingOffset }
            : { left: isMobile ? 0 : floatingOffset }),
      }}
      initial={false}
      animate={{
        x: docked || open || reduceMotion ? 0 : slide,
        opacity: open ? 1 : 0,
      }}
      transition={
        open
          ? { ...SPRING_ENTER, opacity: { duration: 0.18 } }
          : { ...SPRING_EXIT, opacity: { duration: 0.18 } }
      }
    >
      <WidgetPanelContext.Provider value={panelContextValue}>
        <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
          {children}
        </div>
      </WidgetPanelContext.Provider>
    </motion.div>
  )
}

const headerIconButtonClass =
  'text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex size-8 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-hidden'

const Content = memo(function Content({
  id,
  title,
  icon,
  showClose = true,
  className,
  children,
}: {
  id: string
  title?: string
  icon?: ReactNode
  showClose?: boolean
  className?: string
  children: ReactNode
}) {
  const {
    activeItem,
    closePopout,
    presentation,
    dockPanel,
    popOutPanel,
    registerBeforeDeactivate,
  } = useWidgetPopout()
  const panelContext = useContext(WidgetPanelContext)
  if (!panelContext)
    throw new Error('WidgetPopout.Content must be used within a Panel')

  const active = activeItem === id
  const hasBeenActiveRef = useRef(active)
  if (active) hasBeenActiveRef.current = true

  const registerContentHandler = useCallback(
    (handler: BeforeDeactivateHandler) => registerBeforeDeactivate(id, handler),
    [id, registerBeforeDeactivate]
  )
  const lifecycleContextValue = useMemo(
    () => ({ registerBeforeDeactivate: registerContentHandler }),
    [registerContentHandler]
  )

  if (!hasBeenActiveRef.current) return null

  const docked = presentation === 'docked'

  return (
    <div
      role={active ? 'dialog' : undefined}
      aria-label={title}
      aria-hidden={!active}
      hidden={!active}
      inert={!active}
      className={cn(
        'bg-876-surface flex h-full min-h-0 w-full min-w-0 flex-col overflow-x-hidden overflow-y-hidden',
        className
      )}
    >
      <header className="border-border/70 bg-background/75 relative flex h-12 shrink-0 items-center border-b px-3.5 backdrop-blur-md">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 pr-2">
          {icon ? (
            <span className="flex size-6 shrink-0 items-center justify-center [&_img]:size-6 [&_svg]:size-6">
              {icon}
            </span>
          ) : null}
          {title && (
            <span className="text-foreground truncate text-sm font-medium tracking-tight">
              {title}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {docked ? (
            <button
              type="button"
              onClick={popOutPanel}
              aria-label="Pop out panel"
              title="Pop out"
              className={headerIconButtonClass}
            >
              <SidebarPanelIcon className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={dockPanel}
              disabled={!panelContext.canDock}
              aria-label="Dock panel to layout"
              title={
                panelContext.canDock
                  ? 'Dock to layout'
                  : 'Not enough room to dock this panel'
              }
              className={cn(
                headerIconButtonClass,
                'disabled:pointer-events-none disabled:opacity-40'
              )}
            >
              <Minus className="size-4" />
            </button>
          )}
          {showClose && (
            <button
              type="button"
              onClick={() => void closePopout()}
              aria-label="Close panel"
              title="Close"
              className={headerIconButtonClass}
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </header>
      <WidgetContentLifecycleContext.Provider value={lifecycleContextValue}>
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
          {children}
        </div>
      </WidgetContentLifecycleContext.Provider>
    </div>
  )
})

export const WidgetPopout = { Root, Rail, Trigger, Panel, Content }

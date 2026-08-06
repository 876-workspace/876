'use client'

import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'

import { cn } from '../lib/utils'

/** Hold off painting: a navigation that resolves faster than this never flashes. */
const SHOW_DELAY_MS = 120
/** How far the bar creeps while waiting. It must never look finished early. */
const CREEP_TO = 0.9
/** How long the creep takes to reach {@link CREEP_TO}. */
const CREEP_MS = 12000
/** Nothing should leave the bar on screen forever if a click never navigates. */
const SAFETY_MS = 20000
const FINISH_MS = 180
const FADE_MS = 260

/**
 * A GitHub-style navigation progress bar.
 *
 * Client navigation in the App Router has no router events, and `useLinkStatus`
 * reports only for the one `<Link>` it sits under — neither gives a single
 * app-wide signal. So the start is taken from a capture-phase click on any
 * same-origin anchor, which covers every link (sidebar, table row, breadcrumb,
 * tab) without each having to opt in, and the finish from `usePathname`
 * changing.
 *
 * The click is read during capture because Next's own `Link` calls
 * `preventDefault()` to take over the navigation — checking `defaultPrevented`
 * on the bubble would skip precisely the links this exists for. The cost is
 * that a click cancelled by some other handler still starts the bar, which is
 * what {@link SAFETY_MS} is for.
 *
 * A search-param-only navigation (a status filter) does not change the
 * pathname, so it finishes on the safety timer rather than on arrival. It is
 * the one case this cannot observe cheaply: reading `useSearchParams` here
 * would suspend the whole shell during prerender.
 *
 * Progress is written straight to the node's transform. Animating it through
 * state would re-render the shell on every frame of a purely decorative bar.
 */
export function NavProgress({ className }: { className?: string }) {
  const barRef = useRef<HTMLDivElement>(null)
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const running = useRef(false)
  const pathname = usePathname()

  const clearTimers = useCallback(() => {
    for (const t of [showTimer, safetyTimer, fadeTimer]) {
      if (t.current) clearTimeout(t.current)
      t.current = null
    }
  }, [])

  const paint = useCallback((scale: number, ms: number, opacity = 1) => {
    const node = barRef.current
    if (!node) return
    node.style.transition = `transform ${ms}ms cubic-bezier(0.1, 0.6, 0.3, 1), opacity ${FADE_MS}ms ease`
    node.style.transform = `scaleX(${scale})`
    node.style.opacity = String(opacity)
  }, [])

  const finish = useCallback(() => {
    clearTimers()
    if (!running.current) return
    running.current = false

    const node = barRef.current
    if (!node) return

    paint(1, FINISH_MS)
    fadeTimer.current = setTimeout(() => {
      node.style.opacity = '0'
      fadeTimer.current = setTimeout(() => {
        node.style.transition = 'none'
        node.style.transform = 'scaleX(0)'
      }, FADE_MS)
    }, FINISH_MS)
  }, [clearTimers, paint])

  const start = useCallback(() => {
    if (running.current) return
    running.current = true
    clearTimers()

    showTimer.current = setTimeout(() => {
      const node = barRef.current
      if (!node || !running.current) return

      node.style.transition = 'none'
      node.style.transform = 'scaleX(0)'
      node.style.opacity = '1'
      // Commit the reset before starting the creep, or the browser coalesces
      // both writes and the bar jumps straight to its target.
      void node.offsetWidth

      const reduced = window.matchMedia?.(
        '(prefers-reduced-motion: reduce)'
      )?.matches
      paint(reduced ? 0.35 : CREEP_TO, reduced ? 0 : CREEP_MS)
    }, SHOW_DELAY_MS)

    safetyTimer.current = setTimeout(finish, SAFETY_MS)
  }, [clearTimers, finish, paint])

  // Arrival. Also fires on mount, where `running` is false and this is a no-op.
  useEffect(() => {
    finish()
  }, [pathname, finish])

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return

      const anchor = (event.target as Element | null)?.closest?.('a')
      if (!anchor) return
      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download')) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#')) return

      let url: URL
      try {
        url = new URL(anchor.href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return
      // Same destination, or a jump within this page: no navigation to report.
      if (url.href === window.location.href) return
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search &&
        url.hash
      )
        return

      start()
    }

    document.addEventListener('click', onClick, { capture: true })
    window.addEventListener('popstate', start)
    return () => {
      document.removeEventListener('click', onClick, { capture: true })
      window.removeEventListener('popstate', start)
    }
  }, [start])

  useEffect(() => clearTimers, [clearTimers])

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5',
        className
      )}
    >
      <div
        ref={barRef}
        className="bg-primary h-full w-full origin-left shadow-[0_0_8px_var(--color-primary)]"
        style={{ transform: 'scaleX(0)', opacity: 0 }}
      />
    </div>
  )
}

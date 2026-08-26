'use client'

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'

import { THEME_STORAGE_KEY } from '../lib/theme-storage'

/** The user's explicit choice. `system` follows the OS preference. */
export type Theme = 'light' | 'dark' | 'system'
/** What `system` actually resolved to. Never `system`. */
export type ResolvedTheme = 'light' | 'dark'

export { THEME_STORAGE_KEY } from '../lib/theme-storage'

const DARK_QUERY = '(prefers-color-scheme: dark)'

type ThemeContextValue = {
  /** The user's explicit choice, including `system`. */
  theme: Theme
  /** The choice with `system` resolved to a concrete theme. */
  resolvedTheme: ResolvedTheme
  /** The OS preference, regardless of the active choice. */
  systemTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  themes: readonly Theme[]
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const FALLBACK: ThemeContextValue = {
  theme: 'system',
  resolvedTheme: 'light',
  systemTheme: 'light',
  setTheme: () => {},
  themes: ['light', 'dark', 'system'],
}

/**
 * Reads and sets the active theme.
 *
 * Safe to call outside a `ThemeProvider` — it degrades to a light, read-only
 * value rather than throwing, so a component can be rendered in isolation
 * (a test, a Storybook story) without a provider above it.
 */
export function useTheme(): ThemeContextValue {
  return use(ThemeContext) ?? FALLBACK
}

/**
 * Applies the theme to `<html>`: the `class` the CSS keys off, plus
 * `color-scheme` so browser-native UI (form controls, scrollbars) matches.
 */
function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
  root.style.colorScheme = resolved
}

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system')
      return stored
  } catch {
    // Private browsing, disabled storage — fall through to the default.
  }

  return 'system'
}

function readSystemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

/**
 * Theme state for an 876 app. Renders no markup of its own.
 *
 * The pre-paint class is applied by {@link ThemeScript}, which belongs in the
 * document `<head>`; this provider only owns the state after hydration. That
 * split is deliberate — a provider that also emitted the blocking script would
 * be rendering a `<script>` from a client component, which React never
 * executes on the client and warns about in development.
 */
export function ThemeProvider({
  children,
  forcedTheme,
}: {
  children: ReactNode
  /**
   * Pins the rendered theme, ignoring the stored choice. For a surface that
   * only has a light design (a printable document, an embedded widget). The
   * user's stored preference is left untouched, so it applies again elsewhere.
   */
  forcedTheme?: ResolvedTheme
}) {
  // Both initializers are lazy: they touch `localStorage`/`matchMedia`, which
  // do not exist during SSR. On the server the state starts at the same values
  // ThemeScript's fallback assumes, and the first effect corrects it.
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof window === 'undefined' ? 'system' : readStoredTheme()
  )
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    typeof window === 'undefined' ? 'light' : readSystemTheme()
  )

  const resolvedTheme =
    forcedTheme ?? (theme === 'system' ? systemTheme : theme)

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY)
    const onChange = () => setSystemTheme(media.matches ? 'dark' : 'light')

    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  // Keep other tabs in step — the theme is a per-browser preference, not a
  // per-tab one.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return
      setThemeState(
        event.newValue === 'light' ||
          event.newValue === 'dark' ||
          event.newValue === 'system'
          ? event.newValue
          : 'system'
      )
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Storage is unavailable; the choice still applies for this session.
    }
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: forcedTheme ?? theme,
      resolvedTheme,
      systemTheme,
      setTheme,
      themes: ['light', 'dark', 'system'],
    }),
    [theme, forcedTheme, resolvedTheme, systemTheme, setTheme]
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}

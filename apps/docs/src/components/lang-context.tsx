'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * The set of code examples the docs site surfaces today.
 */
export const LANGUAGES = [
  { id: 'node', label: 'SDK', highlight: 'ts', available: true },
  { id: 'curl', label: 'HTTP', highlight: 'bash', available: true },
] as const

export type LangId = (typeof LANGUAGES)[number]['id']

/** Languages with a real implementation today — used to render code. */
export const AVAILABLE_LANGS = LANGUAGES.filter((l) => l.available)

const STORAGE_KEY = '876-docs-lang'

interface LangContextValue {
  /** The active *available* language used to render code (`node` | `curl`). */
  lang: LangId
  setLang: (lang: LangId) => void
}

const LangContext = createContext<LangContextValue | null>(null)

function getInitialLang(): LangId {
  if (typeof window === 'undefined') return 'node'

  const stored = window.localStorage.getItem(STORAGE_KEY) as LangId | null
  if (stored && AVAILABLE_LANGS.some((l) => l.id === stored)) return stored

  return 'node'
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangId>(getInitialLang)

  const setLang = useCallback((next: LangId) => {
    // Persist only available languages so the selection stays meaningful across
    // pages. "Coming soon" tabs surface a banner but never become the active
    // rendering language.
    if (!AVAILABLE_LANGS.some((l) => l.id === next)) return
    setLangState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }, [])

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang])

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within a <LangProvider>')
  return ctx
}

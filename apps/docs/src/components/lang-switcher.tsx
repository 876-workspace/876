'use client'

import { cn } from '@/lib/cn'
import { LANGUAGES, useLang } from './lang-context'

/**
 * Tab bar rendered at the top of the code rail.
 */
export function LangSwitcher() {
  const { lang, setLang } = useLang()

  return (
    <div
      role="tablist"
      aria-label="Code example"
      className="flex flex-wrap items-center gap-1"
    >
      {LANGUAGES.map((l) => {
        const active = lang === l.id
        return (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={active}
            title={l.label}
            onClick={() => setLang(l.id)}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              active
                ? 'bg-fd-primary/15 text-fd-primary'
                : 'text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground'
            )}
          >
            {l.label}
          </button>
        )
      })}
    </div>
  )
}

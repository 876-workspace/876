'use client'

import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock'
import { LANGUAGES, useLang } from './lang-context'
import { LangSwitcher } from './lang-switcher'

export interface CodeSamples {
  /** Node.js / TypeScript SDK snippet. */
  node: string
  /** Raw HTTP request (cURL). */
  curl?: string
}

/**
 * Sticky right-hand code rail (the third Stripe-style column). Renders the
 * snippet for the active language with a switcher on top.
 */
export function CodeRail({
  samples,
  title,
}: {
  samples: CodeSamples
  title?: string
}) {
  const { lang } = useLang()
  const meta = LANGUAGES.find((l) => l.id === lang) ?? LANGUAGES[0]

  const code = lang === 'curl' ? (samples.curl ?? samples.node) : samples.node
  const highlight = lang === 'curl' && samples.curl ? 'bash' : meta.highlight

  return (
    <div className="flex flex-col gap-3">
      {title && (
        <p className="text-fd-muted-foreground text-xs font-semibold tracking-wide uppercase">
          {title}
        </p>
      )}
      <div className="border-fd-border bg-fd-card overflow-hidden rounded-xl border shadow-[var(--doc-elevation)]">
        <div className="border-fd-border/70 border-b px-3 py-2.5">
          <LangSwitcher />
        </div>
        <div className="[&_figure]:my-0 [&_figure]:rounded-none [&_figure]:border-0 [&_pre]:max-h-[70vh] [&_pre]:overflow-auto">
          <DynamicCodeBlock lang={highlight} code={code} />
        </div>
      </div>
    </div>
  )
}

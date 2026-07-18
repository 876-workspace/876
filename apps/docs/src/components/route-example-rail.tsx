'use client'

import { useState } from 'react'
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock'
import { cn } from '@/lib/cn'

export function RouteExampleRail({
  sdk,
  http,
}: {
  sdk: string | null
  http: string
}) {
  const [tab, setTab] = useState<'sdk' | 'http'>(sdk ? 'sdk' : 'http')
  const activeCode = tab === 'sdk' && sdk ? sdk : http
  const activeLang = tab === 'sdk' && sdk ? 'ts' : 'bash'

  return (
    <div className="flex flex-col gap-3">
      <p className="text-fd-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Usage
      </p>
      <div className="border-fd-border bg-fd-card overflow-hidden rounded-xl border shadow-[var(--doc-elevation)]">
        <div className="border-fd-border/70 flex gap-1 border-b px-3 py-2.5">
          <RailButton
            active={tab === 'sdk'}
            disabled={!sdk}
            onClick={() => setTab('sdk')}
          >
            SDK
          </RailButton>
          <RailButton active={tab === 'http'} onClick={() => setTab('http')}>
            HTTP
          </RailButton>
        </div>
        <div className="[&_figure]:my-0 [&_figure]:rounded-none [&_figure]:border-0 [&_pre]:max-h-[70vh] [&_pre]:overflow-auto">
          <DynamicCodeBlock lang={activeLang} code={activeCode} />
        </div>
      </div>
    </div>
  )
}

function RailButton({
  active,
  disabled = false,
  onClick,
  children,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-fd-primary/15 text-fd-primary'
          : 'text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      {children}
    </button>
  )
}

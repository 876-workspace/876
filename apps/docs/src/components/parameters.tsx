import { Children, isValidElement, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * Stripe-style parameter list. Wraps a set of {@link Param} rows in a single
 * elevated card. Use for request parameters and response fields where the
 * name · type · requiredness · description rhythm reads better than a flat
 * table, and where nested object/enum fields expand inline.
 *
 * @example
 * <Parameters>
 *   <Param name="identifier" type="string" required>The email or username.</Param>
 *   <Param name="data" type="Session | null">
 *     The session on success.
 *     <Param name="expiresAt" type="number | null">Unix seconds, or null.</Param>
 *   </Param>
 * </Parameters>
 */
export function Parameters({ children }: { children: ReactNode }) {
  return (
    <div className="border-fd-border bg-fd-card divide-fd-border/70 my-5 divide-y rounded-xl border shadow-[var(--doc-elevation)]">
      {children}
    </div>
  )
}

/**
 * A single parameter row. Non-`Param` children render as the description; any
 * nested `<Param>` children collapse into a "Show child attributes" disclosure
 * so deep shapes stay scannable.
 */
export function Param({
  name,
  type,
  required = false,
  children,
}: {
  name: string
  type?: string
  required?: boolean
  children?: ReactNode
}) {
  const kids = Children.toArray(children)
  const nested = kids.filter(
    (child) => isValidElement(child) && child.type === Param
  )
  const description = kids.filter(
    (child) => !(isValidElement(child) && child.type === Param)
  )

  return (
    <div className="px-4 py-3.5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <code className="text-fd-foreground bg-transparent p-0 font-mono text-sm font-semibold">
          {name}
        </code>
        {type ? (
          <span className="text-fd-muted-foreground font-mono text-xs">
            {type}
          </span>
        ) : null}
        <span
          className={cn(
            'ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase',
            required
              ? 'bg-fd-primary/12 text-fd-primary'
              : 'bg-fd-muted text-fd-muted-foreground'
          )}
        >
          {required ? 'Required' : 'Optional'}
        </span>
      </div>

      {description.length > 0 ? (
        <div className="text-fd-muted-foreground [&_a]:text-fd-primary mt-1.5 text-sm [&_a]:underline [&_code]:text-[0.85em] [&_p]:my-0">
          {description}
        </div>
      ) : null}

      {nested.length > 0 ? (
        <details className="group mt-2.5">
          <summary className="text-fd-primary inline-flex cursor-pointer list-none items-center gap-1 text-xs font-medium select-none">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="size-3.5 transition-transform group-open:rotate-90"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
            Show child attributes
          </summary>
          <div className="border-fd-border/70 border-fd-primary/30 divide-fd-border/60 mt-2 divide-y rounded-lg border border-l-2">
            {nested}
          </div>
        </details>
      ) : null}
    </div>
  )
}

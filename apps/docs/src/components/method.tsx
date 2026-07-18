import type { ReactNode } from 'react'
import { CodeRail, type CodeSamples } from './code-rail'

/**
 * Page-level layout for an SDK method reference: prose flows in the main column
 * while a sticky code rail (the Stripe-style third column) shows the method's
 * code sample for the active language. Sidebar is provided by the docs layout.
 *
 * Usage in MDX:
 *
 * ```mdx
 * <Method node={`...`} curl={`...`}>
 *   ## Parameters
 *   <TypeTable ... />
 *   <APIReference path="/auth/login" method="post" />
 * </Method>
 * ```
 */
export function Method({
  children,
  node,
  curl,
  railTitle = 'Request',
}: {
  children: ReactNode
  node: string
  curl?: string
  railTitle?: string
}) {
  const samples: CodeSamples = { node, curl }

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
      <div className="min-w-0">{children}</div>
      <aside className="xl:sticky xl:top-20 xl:self-start">
        <CodeRail samples={samples} title={railTitle} />
      </aside>
    </div>
  )
}

import type { ComponentProps } from 'react'
import { APIPage } from './api-page'

type HttpMethod =
  | 'get'
  | 'post'
  | 'put'
  | 'patch'
  | 'delete'
  | 'head'
  | 'options'

const METHOD_STYLES: Record<HttpMethod, string> = {
  get: 'bg-blue-500/15 text-blue-500',
  post: 'bg-green-500/15 text-green-500',
  put: 'bg-amber-500/15 text-amber-500',
  patch: 'bg-amber-500/15 text-amber-500',
  delete: 'bg-red-500/15 text-red-500',
  head: 'bg-fd-muted text-fd-muted-foreground',
  options: 'bg-fd-muted text-fd-muted-foreground',
}

/**
 * Collapsible, default-collapsed Swagger-style reference for the single API
 * operation backing an SDK method. Progressive disclosure: the SDK is the
 * primary story, the underlying HTTP contract is one click away.
 *
 * Document operations are pre-dereferenced from the committed `openapi.json`.
 */
export function APIReference({
  path,
  method,
  title = 'API Reference',
  document = './openapi.json',
  defaultOpen = false,
}: {
  path: string
  method: HttpMethod
  title?: string
  document?: string
  defaultOpen?: boolean
}) {
  const operations: ComponentProps<typeof APIPage>['operations'] = [
    { path, method },
  ]

  return (
    <details
      open={defaultOpen}
      className="group border-fd-border bg-fd-card/40 my-6 overflow-hidden rounded-xl border"
    >
      <summary className="hover:bg-fd-accent/40 flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-medium select-none">
        <svg
          className="text-fd-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-90"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
        <span className="text-fd-foreground">{title}</span>
        <span
          className={`ml-auto rounded px-1.5 py-0.5 font-mono text-xs uppercase ${METHOD_STYLES[method]}`}
        >
          {method}
        </span>
        <code className="bg-fd-muted text-fd-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs">
          {path}
        </code>
      </summary>
      <div className="border-fd-border border-t px-4 py-2">
        <APIPage
          document={document}
          operations={operations}
          showTitle={false}
          showDescription
        />
      </div>
    </details>
  )
}

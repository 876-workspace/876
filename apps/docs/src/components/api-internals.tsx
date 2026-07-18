import Link from 'next/link'
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock'
import inventory from '@/generated/api-inventory.json'
import { APIReference } from './api-reference'
import { RouteExampleRail } from './route-example-rail'

type HttpMethod = 'get' | 'post' | 'patch' | 'delete'

type ErrorInfo = {
  code: string
  message: string
  status: string
  source: string
}

type ClientCaller = {
  package: string
  method: string
  path: string
  sourceFile: string
  sourceLine: number
}

type AppCaller = {
  app: string
  file: string
  symbol: string
}

type SourceExcerpt = {
  title: string
  file: string
  line: number
  language: 'python' | 'typescript'
  code: string
}

type RouteInfo = {
  id: string
  title: string
  domain: string
  method: HttpMethod
  path: string
  sourceFile: string
  sourceLine: number
  functionName: string
  statusCode: string
  responseModel: string | null
  requestModel: string | null
  auth: string
  dependencies: string[]
  schemas: string[]
  repositories: string[]
  services: string[]
  helpers: string[]
  errors: ErrorInfo[]
  clientCallers: ClientCaller[]
  appCallers: AppCaller[]
  tests: string[]
  summary: string
  description: string
  sourceExcerpts: SourceExcerpt[]
  sdkExample: string | null
  httpExample: string
}

const routes = inventory.routes as RouteInfo[]

const methodStyles: Record<HttpMethod, string> = {
  get: 'border-blue-500/25 bg-blue-500/10 text-blue-500',
  post: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500',
  patch: 'border-amber-500/25 bg-amber-500/10 text-amber-500',
  delete: 'border-red-500/25 bg-red-500/10 text-red-500',
}

const domainLabels: Record<string, string> = {
  health: 'Health',
  auth: 'Auth',
  oauth: 'OAuth Provider',
  apps: 'Apps',
  users: 'Users',
  organizations: 'Organizations',
  memberships: 'Memberships',
  roles: 'Roles',
  features: 'Features',
}

export function RouteIndex({ domain }: { domain?: string }) {
  const filtered = domain
    ? routes.filter((route) => route.domain === domain)
    : routes
  const grouped = groupBy(filtered, (route) => route.domain)

  return (
    <div className="space-y-8">
      <SummaryGrid routes={filtered} />
      {Object.entries(grouped).map(([group, items]) => (
        <section key={group} className="space-y-3">
          {!domain && (
            <h2 className="text-xl font-semibold">
              {domainLabels[group] ?? group}
            </h2>
          )}
          <div className="grid gap-3">
            {items.map((route) => (
              <Link
                key={route.id}
                href={`/docs/${route.domain}/${route.id}`}
                className="border-fd-border bg-fd-card/40 hover:bg-fd-accent/30 block rounded-lg border p-4 transition-colors"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <MethodBadge method={route.method} />
                  <code className="text-sm">{route.path}</code>
                  <span className="text-fd-muted-foreground text-xs">
                    {route.functionName}()
                  </span>
                </div>
                <h3 className="mt-3 text-base font-semibold">{route.title}</h3>
                <p className="text-fd-muted-foreground mt-1 text-sm">
                  {route.summary}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export function RouteDoc({ routeId }: { routeId: string }) {
  const route = routes.find((item) => item.id === routeId)
  if (!route) {
    return (
      <p className="text-fd-muted-foreground">
        Route inventory entry not found for <code>{routeId}</code>.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,430px)]">
      <div className="min-w-0 space-y-8">
        <section className="border-fd-border bg-fd-card/40 rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <MethodBadge method={route.method} />
            <code>{route.path}</code>
            <span className="text-fd-muted-foreground text-sm">
              {route.functionName}()
            </span>
          </div>
          <div className="mt-3">
            <MarkdownDescription value={route.description} />
          </div>
        </section>

        <section>
          <h2>SDK And App Usage</h2>
          <UsageTable route={route} />
        </section>

        <section>
          <h2>HTTP Contract</h2>
          <KeyValueTable
            rows={[
              ['Auth', route.auth],
              ['Status', route.statusCode],
              ['Request model', route.requestModel ?? 'None'],
              ['Response model', route.responseModel ?? 'None'],
              ['Source', `${route.sourceFile}:${route.sourceLine}`],
            ]}
          />
          <APIReference
            path={route.path}
            method={route.method}
            title="OpenAPI Contract"
            defaultOpen
          />
        </section>

        <section>
          <h2>Execution Flow</h2>
          <ol className="space-y-2">
            <li>
              FastAPI enters <code>{route.functionName}()</code> in{' '}
              <code>{route.sourceFile}</code>.
            </li>
            <li>{route.auth}</li>
            {route.requestModel ? (
              <li>
                Pydantic validates the body against{' '}
                <code>{route.requestModel}</code> before route code runs.
              </li>
            ) : (
              <li>No request body model is declared for this route.</li>
            )}
            {route.repositories.length > 0 && (
              <li>
                Database work is delegated to{' '}
                <InlineList values={route.repositories} />.
              </li>
            )}
            {route.helpers.length > 0 && (
              <li>
                Route-local helpers run through{' '}
                <InlineList values={route.helpers} />.
              </li>
            )}
            <li>
              The success path serializes{' '}
              <code>{route.responseModel ?? 'the returned payload'}</code>.
            </li>
          </ol>
        </section>

        <section>
          <h2>Source Code</h2>
          <div className="space-y-3">
            {route.sourceExcerpts.map((excerpt, index) => (
              <SourceExcerptBlock
                key={`${excerpt.file}-${excerpt.line}-${index}`}
                excerpt={excerpt}
                open={index === 0}
              />
            ))}
          </div>
        </section>

        <section>
          <h2>Types And Schemas</h2>
          <TokenGrid values={route.schemas} empty="No schemas detected." />
        </section>

        <section>
          <h2>Dependencies And Calls</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <TokenPanel
              title="Dependencies"
              values={route.dependencies}
              empty="No explicit dependencies detected."
            />
            <TokenPanel
              title="Services"
              values={route.services}
              empty="No service dependency detected."
            />
            <TokenPanel
              title="Repositories"
              values={route.repositories}
              empty="No repository call detected."
            />
            <TokenPanel
              title="Helpers"
              values={route.helpers}
              empty="No helper call detected."
            />
          </div>
        </section>

        <section>
          <h2>Implemented Errors</h2>
          <ErrorTable errors={route.errors} />
        </section>

        <section>
          <h2>Tests</h2>
          <TokenGrid
            values={route.tests}
            empty="No direct API test file matched."
          />
        </section>
      </div>

      <aside className="xl:sticky xl:top-20 xl:self-start">
        <RouteExampleRail sdk={route.sdkExample} http={route.httpExample} />
      </aside>
    </div>
  )
}

export function APIClientUsageMap() {
  const callers = inventory.clientCallers as ClientCaller[]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-fd-border border-b text-left">
            <th className="py-2 pr-4">Package</th>
            <th className="py-2 pr-4">Method</th>
            <th className="py-2 pr-4">API path</th>
            <th className="py-2">Source</th>
          </tr>
        </thead>
        <tbody>
          {callers.map((caller, index) => (
            <tr key={`${caller.package}-${caller.method}-${index}`}>
              <td className="py-2 pr-4">
                <code>{caller.package}</code>
              </td>
              <td className="py-2 pr-4">
                <code>{caller.method}</code>
              </td>
              <td className="py-2 pr-4">
                <code>{caller.path}</code>
              </td>
              <td className="py-2">
                <code>
                  {caller.sourceFile}:{caller.sourceLine}
                </code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SummaryGrid({ routes: items }: { routes: RouteInfo[] }) {
  const adminCount = items.filter((route) =>
    route.auth.includes('AdminDep')
  ).length
  const publicCount = items.filter((route) =>
    route.auth.startsWith('Public')
  ).length

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Metric label="Routes" value={items.length} />
      <Metric label="Public" value={publicCount} />
      <Metric label="Admin gated" value={adminCount} />
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-fd-border bg-fd-card/40 rounded-lg border p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-fd-muted-foreground text-sm">{label}</div>
    </div>
  )
}

function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span
      className={`rounded border px-2 py-0.5 font-mono text-xs font-semibold uppercase ${methodStyles[method]}`}
    >
      {method}
    </span>
  )
}

function KeyValueTable({ rows }: { rows: [string, string][] }) {
  return (
    <table className="my-4 w-full text-sm">
      <tbody>
        {rows.map(([key, value]) => (
          <tr key={key} className="border-fd-border border-b">
            <th className="text-fd-muted-foreground w-40 py-2 pr-4 text-left font-medium">
              {key}
            </th>
            <td className="py-2">
              <code>{value}</code>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SourceExcerptBlock({
  excerpt,
  open,
}: {
  excerpt: SourceExcerpt
  open: boolean
}) {
  return (
    <details
      open={open}
      className="border-fd-border bg-fd-card/40 overflow-hidden rounded-lg border"
    >
      <summary className="hover:bg-fd-accent/40 flex cursor-pointer list-none flex-wrap items-center gap-2 px-4 py-3 text-sm font-medium">
        <span>{excerpt.title}</span>
        <code className="text-fd-muted-foreground ml-auto text-xs">
          {excerpt.file}:{excerpt.line}
        </code>
      </summary>
      <div className="[&_figure]:my-0 [&_figure]:rounded-none [&_figure]:border-0 [&_pre]:max-h-[560px] [&_pre]:overflow-auto">
        <DynamicCodeBlock
          lang={excerpt.language === 'python' ? 'python' : 'ts'}
          code={excerpt.code}
        />
      </div>
    </details>
  )
}

function MarkdownDescription({ value }: { value: string }) {
  const blocks = splitMarkdownBlocks(value)

  return (
    <div className="text-fd-muted-foreground space-y-3 text-sm leading-7">
      {blocks.map((block, index) => {
        if (block.kind === 'code') {
          return (
            <div
              key={`${block.kind}-${index}`}
              className="[&_figure]:my-0 [&_figure]:rounded-lg [&_pre]:max-h-[360px] [&_pre]:overflow-auto"
            >
              <DynamicCodeBlock lang={block.lang || 'txt'} code={block.value} />
            </div>
          )
        }

        if (block.kind === 'list') {
          return (
            <ul key={`${block.kind}-${index}`} className="list-disc pl-5">
              {block.items.map((item) => (
                <li key={item}>
                  <InlineMarkdown value={item} />
                </li>
              ))}
            </ul>
          )
        }

        return (
          <p key={`${block.kind}-${index}`}>
            <InlineMarkdown value={block.value} />
          </p>
        )
      })}
    </div>
  )
}

function InlineMarkdown({ value }: { value: string }) {
  const parts = value.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean)

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={index}>{part.slice(1, -1)}</code>
        }

        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index}>{part.slice(2, -2)}</strong>
        }

        return <span key={index}>{part}</span>
      })}
    </>
  )
}

function splitMarkdownBlocks(value: string) {
  const blocks: Array<
    | { kind: 'paragraph'; value: string }
    | { kind: 'code'; lang: string; value: string }
    | { kind: 'list'; items: string[] }
  > = []
  const lines = value.split('\n')
  let paragraph: string[] = []
  let list: string[] = []
  let code: string[] | null = null
  let codeLang = ''

  function flushParagraph() {
    if (paragraph.length === 0) return
    blocks.push({ kind: 'paragraph', value: paragraph.join(' ') })
    paragraph = []
  }

  function flushList() {
    if (list.length === 0) return
    blocks.push({ kind: 'list', items: list })
    list = []
  }

  for (const line of lines) {
    if (code) {
      if (line.startsWith('```')) {
        blocks.push({ kind: 'code', lang: codeLang, value: code.join('\n') })
        code = null
        codeLang = ''
      } else {
        code.push(line)
      }
      continue
    }

    if (line.startsWith('```')) {
      flushParagraph()
      flushList()
      code = []
      codeLang = line.slice(3).trim()
      continue
    }

    if (line.trim() === '') {
      flushParagraph()
      flushList()
      continue
    }

    if (line.startsWith('- ')) {
      flushParagraph()
      list.push(line.slice(2).trim())
      continue
    }

    if (list.length > 0 && /^\s{2,}\S/.test(line)) {
      list[list.length - 1] = `${list[list.length - 1]} ${line.trim()}`
      continue
    }

    flushList()
    paragraph.push(line.trim())
  }

  flushParagraph()
  flushList()
  if (code)
    blocks.push({ kind: 'code', lang: codeLang, value: code.join('\n') })

  return blocks
}

function TokenPanel({
  title,
  values,
  empty,
}: {
  title: string
  values: string[]
  empty: string
}) {
  return (
    <div className="border-fd-border rounded-lg border p-4">
      <h3 className="mb-3 text-base font-semibold">{title}</h3>
      <TokenGrid values={values} empty={empty} />
    </div>
  )
}

function TokenGrid({ values, empty }: { values: string[]; empty: string }) {
  if (values.length === 0)
    return <p className="text-fd-muted-foreground text-sm">{empty}</p>

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <code
          key={value}
          className="bg-fd-muted text-fd-muted-foreground rounded px-2 py-1 text-xs"
        >
          {value}
        </code>
      ))}
    </div>
  )
}

function ErrorTable({ errors }: { errors: ErrorInfo[] }) {
  if (errors.length === 0)
    return (
      <p className="text-fd-muted-foreground">
        No explicit <code>AppHTTPException</code> or OAuth helper errors were
        detected in the route body. Shared dependencies can still return
        validation, API-key, session, or internal-key errors.
      </p>
    )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-fd-border border-b text-left">
            <th className="py-2 pr-4">Code</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Message</th>
            <th className="py-2">Source</th>
          </tr>
        </thead>
        <tbody>
          {errors.map((error, index) => (
            <tr
              key={`${error.code}-${index}`}
              className="border-fd-border border-b"
            >
              <td className="py-2 pr-4">
                <code>{error.code}</code>
              </td>
              <td className="py-2 pr-4">
                <code>{error.status}</code>
              </td>
              <td className="py-2 pr-4">{error.message}</td>
              <td className="py-2">
                <code>{error.source}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function UsageTable({ route }: { route: RouteInfo }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <h3>Client methods</h3>
        <UsageList
          values={route.clientCallers.map(
            (caller) =>
              `${caller.package} ${caller.method} (${caller.sourceFile}:${caller.sourceLine})`
          )}
          empty="No SDK/admin method maps directly to this path."
        />
      </div>
      <div>
        <h3>App call sites</h3>
        <UsageList
          values={route.appCallers.map(
            (caller) => `${caller.app} ${caller.symbol} (${caller.file})`
          )}
          empty="No first-party app call site matched a client method for this path."
        />
      </div>
    </div>
  )
}

function UsageList({ values, empty }: { values: string[]; empty: string }) {
  if (values.length === 0)
    return <p className="text-fd-muted-foreground text-sm">{empty}</p>

  return (
    <ul>
      {values.map((value) => (
        <li key={value}>
          <code>{value}</code>
        </li>
      ))}
    </ul>
  )
}

function InlineList({ values }: { values: string[] }) {
  return (
    <>
      {values.map((value, index) => (
        <span key={value}>
          {index > 0 ? ', ' : null}
          <code>{value}</code>
        </span>
      ))}
    </>
  )
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    const key = getKey(item)
    groups[key] ??= []
    groups[key].push(item)

    return groups
  }, {})
}

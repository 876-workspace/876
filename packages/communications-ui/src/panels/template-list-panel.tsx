import type { EmailTemplate } from '@876/communications/contracts'
import { Badge } from '@876/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@876/ui/card'
import { Skeleton } from '@876/ui/skeleton'

export type TemplateListPanelState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; error: { code: string; message: string } }
  | { status: 'ready'; data: EmailTemplate[] }

export interface TemplateListPanelProps {
  state: TemplateListPanelState
  baseHref: string
}

function groupByCategory(templates: EmailTemplate[]) {
  const groups = new Map<string, EmailTemplate[]>()
  for (const template of templates) {
    const list = groups.get(template.category)
    if (list) list.push(template)
    else groups.set(template.category, [template])
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
}

/** Templates by category, marking system versus org-owned templates. */
export function TemplateListPanel({ state, baseHref }: TemplateListPanelProps) {
  return (
    <section aria-label="Email templates">
      <Card>
        <CardHeader>
          <CardTitle>Email templates</CardTitle>
        </CardHeader>
        <CardContent>
          {state.status === 'loading' ? (
            <div aria-label="Loading email templates" className="space-y-3">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : state.status === 'empty' ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              No email templates yet.
            </p>
          ) : state.status === 'error' ? (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/5 rounded-lg border p-4 text-sm"
            >
              <p className="font-medium">Email templates could not be loaded</p>
              <p className="text-muted-foreground mt-1">
                {state.error.message}
              </p>
              <p className="text-muted-foreground mt-2 font-mono text-xs">
                {state.error.code}
              </p>
            </div>
          ) : state.data.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              No email templates yet.
            </p>
          ) : (
            <div className="space-y-6">
              {groupByCategory(state.data).map(([category, templates]) => (
                <div key={category}>
                  <h3 className="text-sm font-medium capitalize">{category}</h3>
                  <div className="divide-border mt-3 divide-y rounded-lg border">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0 flex-1">
                          <a
                            href={`${baseHref}/templates/${template.id}`}
                            className="font-medium hover:underline"
                          >
                            {template.name}
                          </a>
                          <span className="text-muted-foreground block text-xs">
                            {template.subject}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {template.isSystem ? (
                            <Badge variant="secondary">System</Badge>
                          ) : (
                            <Badge variant="outline">Custom</Badge>
                          )}
                          {template.isDefault ? (
                            <Badge variant="secondary">Default</Badge>
                          ) : null}
                          {template.isActive ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

export function TemplateListPanelSkeleton() {
  return (
    <section aria-label="Email templates">
      <Card>
        <CardHeader>
          <CardTitle>Email templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div aria-label="Loading email templates" className="space-y-3">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

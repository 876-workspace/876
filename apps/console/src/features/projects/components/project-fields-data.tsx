import { AppError } from '@876/ui/app-error'
import { Badge } from '@876/ui/badge'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { DocumentTextIcon } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import {
  avatarTone,
  MobileList,
  MobileListCell,
  MobileListEmpty,
} from '@876/projects-ui/mobile-list'

import { projects } from '@/lib/clients/projects'

const EMPTY_TITLE = 'No project fields yet'

/**
 * The data half of the Project fields list, shared by every host. Read-only:
 * the field catalog with keys, types, and required flags. Values live on the
 * project record's Overview.
 */
export async function ProjectFieldsData({
  organizationId,
}: {
  organizationId: string
}) {
  const result = await projects.projectCustomFields.list(organizationId)
  const fields = result.data?.data ?? []

  return (
    <div className="space-y-3">
      {result.error ? (
        <AppError
          title="Project field data could not be loaded"
          error={result.error}
          variant="banner"
          showCode
        />
      ) : null}
      <MobileList>
        {fields.length === 0 ? (
          <MobileListEmpty>{EMPTY_TITLE}</MobileListEmpty>
        ) : (
          fields.map((field) => (
            <MobileListCell
              key={field.id}
              avatar={field.label.slice(0, 2).toUpperCase()}
              avatarClassName={avatarTone(field.key)}
              title={field.label}
              subtitle={`${field.key} · ${field.fieldType}${field.required ? ' · Required' : ''}`}
            />
          ))
        )}
      </MobileList>
      <div className="876-card hidden w-full overflow-hidden sm:block">
        <Table>
          <TableHeader className="876-header-row">
            <TableRow>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Field
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Key
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Type
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Required
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="p-0">
                  <Empty className="py-14">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <DocumentTextIcon className="size-6" />
                      </EmptyMedia>
                      <EmptyTitle>{EMPTY_TITLE}</EmptyTitle>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              fields.map((field) => (
                <TableRow key={field.id} className="transition-colors">
                  <TableCell className="px-5 py-4 text-[0.8125rem] font-medium">
                    {field.label}
                  </TableCell>
                  <TableCell className="text-muted-foreground px-5 py-4 font-mono text-xs">
                    {field.key}
                  </TableCell>
                  <TableCell className="text-muted-foreground px-5 py-4 text-xs">
                    {field.fieldType}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    {field.required ? (
                      <Badge variant="info">Required</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

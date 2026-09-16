import { Alert, AlertDescription, AlertTitle } from '@876/ui/alert'
import { ExclamationTriangleIcon } from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { formatDay } from '../finance/format-money'
import type { TemplatePreview } from './types'

export type TemplatePreviewTableProps = {
  preview: TemplatePreview
}

type MissingGroup = { label: string; keys: string[] }

function missingGroups(missing: TemplatePreview['missing']): MissingGroup[] {
  return [
    { label: 'Work item types', keys: missing.workItemTypes },
    { label: 'Workflow states', keys: missing.workflowStates },
    { label: 'Labels', keys: missing.labels },
  ].filter((group) => group.keys.length > 0)
}

function DateCell({ value }: { value: number | null }) {
  return (
    <TableCell className="px-5 py-4 whitespace-nowrap tabular-nums">
      {value === null ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        formatDay(value)
      )}
    </TableCell>
  )
}

export function TemplatePreviewTable({ preview }: TemplatePreviewTableProps) {
  const missing = missingGroups(preview.missing)

  return (
    <div className="space-y-5">
      {missing.length > 0 ? (
        <Alert variant="destructive">
          <ExclamationTriangleIcon />
          <AlertTitle>Some references are missing here</AlertTitle>
          <AlertDescription>
            <ul className="ml-4 flex list-disc flex-col gap-1">
              {missing.map((group) => (
                <li key={group.label}>
                  {`${group.label}: ${group.keys.join(', ')}`}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <p className="text-muted-foreground text-sm">
        {`Starts ${formatDay(preview.startDate)}`}
      </p>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Phases</h3>
        <div className="876-card w-full overflow-hidden">
          <Table>
            <TableHeader className="876-header-row">
              <TableRow>
                <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                  Phase
                </TableHead>
                <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                  Start
                </TableHead>
                <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                  End
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.phases.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-muted-foreground px-5 py-8 text-center"
                  >
                    No phases
                  </TableCell>
                </TableRow>
              ) : (
                preview.phases.map((phase) => (
                  <TableRow key={phase.ref} className="transition-colors">
                    <TableCell className="px-5 py-4 font-medium">
                      {phase.name}
                    </TableCell>
                    <DateCell value={phase.start} />
                    <DateCell value={phase.end} />
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Work items</h3>
        <div className="876-card w-full overflow-hidden">
          <Table>
            <TableHeader className="876-header-row">
              <TableRow>
                <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                  Work item
                </TableHead>
                <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                  Start
                </TableHead>
                <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                  Due
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.workItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-muted-foreground px-5 py-8 text-center"
                  >
                    No work items
                  </TableCell>
                </TableRow>
              ) : (
                preview.workItems.map((item) => (
                  <TableRow key={item.ref} className="transition-colors">
                    <TableCell className="px-5 py-4 font-medium">
                      {item.title}
                    </TableCell>
                    <DateCell value={item.start} />
                    <DateCell value={item.due} />
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}

import type { ProjectTemplateVersion } from '@876/projects/contracts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { formatDay } from '@876/projects-ui/finance/format-money'

export function TemplateVersionTable({
  versions,
}: {
  versions: readonly ProjectTemplateVersion[]
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">Versions</h3>
      <div className="876-card w-full overflow-hidden">
        <Table>
          <TableHeader className="876-header-row">
            <TableRow>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Version
              </TableHead>
              <TableHead className="px-5 py-3.5 text-[0.8125rem] font-semibold">
                Created
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-muted-foreground px-5 py-8 text-center"
                >
                  No versions
                </TableCell>
              </TableRow>
            ) : (
              versions.map((version) => (
                <TableRow key={version.id} className="transition-colors">
                  <TableCell className="px-5 py-4 tabular-nums">
                    {`v${version.version}`}
                  </TableCell>
                  <TableCell className="text-muted-foreground px-5 py-4 text-xs whitespace-nowrap">
                    {formatDay(version.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

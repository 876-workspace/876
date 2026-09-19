import { AppError } from '@876/ui/app-error'
import { Empty, EmptyHeader, EmptyTitle } from '@876/ui/empty'
import { MobileList, MobileListCell } from '@876/projects-ui/mobile-list'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { requireProjectsContext } from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/clients/projects'

export async function CapturesData({
  status,
}: {
  status?: 'inbox' | 'promoted' | 'discarded'
}) {
  const { orgId } = await requireProjectsContext()
  const result = await projects.captures.list(orgId, status ? { status } : {})
  const captures = result.data?.data ?? []

  return (
    <div className="space-y-3">
      {result.error ? (
        <AppError
          title="Some inbox data could not be loaded"
          error={result.error}
          variant="banner"
        />
      ) : null}
      <MobileList>
        {captures.length === 0 ? (
          <EmptyTitle>No captures</EmptyTitle>
        ) : (
          captures.map((capture) => (
            <MobileListCell
              key={capture.id}
              avatar={capture.title.slice(0, 1).toUpperCase()}
              title={capture.title}
              subtitle={capture.body ?? capture.status}
            />
          ))
        )}
      </MobileList>
      <div className="876-card hidden w-full overflow-hidden sm:block">
        <Table>
          <TableHeader className="876-header-row">
            <TableRow>
              <TableHead>Idea</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Project hint</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {captures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3}>
                  <Empty>
                    <EmptyHeader>
                      <EmptyTitle>No captures</EmptyTitle>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              captures.map((capture) => (
                <TableRow key={capture.id}>
                  <TableCell>{capture.title}</TableCell>
                  <TableCell>{capture.status}</TableCell>
                  <TableCell>{capture.projectId ?? '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

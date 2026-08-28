import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { WorkspaceIcon } from './workspace-icon'
import type { WorkspaceIconKey } from '../app-workspaces'

export function EmptyWorkspaceView({
  title,
  description,
  iconKey,
}: {
  title: string
  description: string
  iconKey: WorkspaceIconKey
}) {
  return (
    <div className="space-y-5">
      <h1 className="876-page-title">{title}</h1>
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WorkspaceIcon iconKey={iconKey} className="size-6" />
          </EmptyMedia>
          <EmptyTitle>No {title.toLowerCase()} yet</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}

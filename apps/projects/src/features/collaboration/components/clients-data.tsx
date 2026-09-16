import { AppError } from '@876/ui/app-error'

import { loadMemberLabels } from '@/features/projects/member-labels'
import {
  listAttachmentLinks,
} from '@/lib/attachment-links'
import { projects } from '@/lib/services/projects'

import { mapClientGrant } from '../mappers'
import { ClientGrantList } from './client-grant-list'
import { GrantInviteForm, SharedFilesForm } from './client-forms'
import { ClientVisibleToggle } from './client-visible-toggle'

export async function ProjectClientsData({
  orgId,
  projectId,
  canEdit,
}: {
  orgId: string
  projectId: string
  canEdit: boolean
}) {
  const [grantsResult, membersResult, filesResult] = await Promise.all([
    projects.clientGrants.list(orgId, projectId, {
      limit: 100,
      includeRevoked: true,
    }),
    loadMemberLabels(orgId),
    listAttachmentLinks(orgId, projectId),
  ])
  if (grantsResult.error || !grantsResult.data)
    return (
      <AppError
        title="Client grants could not be loaded"
        error={
          grantsResult.error ?? {
            code: 'projects/grants-unavailable',
            message: 'Client grants could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  const files = filesResult.data ?? []

  return (
    <div className="space-y-8">
      <section aria-label="Client grants" className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Clients</h2>
          <p className="text-muted-foreground text-xs">
            Invited members open the client portal. Revoked grants lose
            access immediately.
          </p>
        </div>
        {canEdit ? <GrantInviteForm projectId={projectId} /> : null}
        <ClientGrantList
          projectId={projectId}
          grants={grantsResult.data.data.map((grant) =>
            mapClientGrant(grant, membersResult.labels)
          )}
          canRevoke={canEdit}
        />
      </section>
      <section aria-label="Shared files" className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Shared files</h2>
          <p className="text-muted-foreground text-xs">
            Links shared here can be made client visible. Only visible links
            appear in the portal.
          </p>
        </div>
        {canEdit ? <SharedFilesForm projectId={projectId} /> : null}
        {filesResult.error ? (
          <AppError
            title="Shared files could not be loaded"
            error={filesResult.error}
            variant="banner"
          />
        ) : files.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No shared files yet
          </p>
        ) : (
          <ul data-slot="shared-files-list" className="flex flex-col gap-2">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-4 py-3"
              >
                <span className="text-sm font-medium">
                  {file.name ?? file.url}
                </span>
                {canEdit ? (
                  <ClientVisibleToggle
                    endpoint={`/api/projects/${encodeURIComponent(projectId)}/attachments/${encodeURIComponent(file.id)}/visibility`}
                    initialVisible={file.clientVisible}
                    label={file.name ?? file.url}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

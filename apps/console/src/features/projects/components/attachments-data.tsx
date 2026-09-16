import { AppError } from '@876/ui/app-error'

import { storage } from '@/lib/services/storage'

import { formatOperatorBytes } from './operator-format'

const ATTACHMENTS_LIMIT = 25

export type AttachmentResourceType = 'project' | 'issue'

/**
 * The data half of every attachment list, shared by every host: the project's
 * app links from Storage plus each file's own name and size. No download
 * proxying — Console never mints read URLs, it only shows what the Storage
 * API already returns.
 */
export async function AttachmentsData({
  organizationId,
  resourceType,
  resourceId,
  actorUserId,
}: {
  organizationId: string
  resourceType: AttachmentResourceType
  resourceId: string
  actorUserId: string | null
}) {
  const caller = {
    sourceAppId: '876-projects',
    ...(actorUserId ? { actorUserId } : {}),
    actorOrgId: organizationId,
  }

  const linksResult = await storage.resourceLinks.list(
    {
      app_id: '876-projects',
      resource_type: resourceType,
      resource_id: resourceId,
      relation: 'attachment',
    },
    caller
  )

  if (linksResult.error || !linksResult.data) {
    return (
      <div className="space-y-3">
        <AppError
          title="Attachment data could not be loaded"
          error={linksResult.error}
          variant="banner"
          showCode
        />
        <div className="876-card text-muted-foreground px-5 py-10 text-center text-sm">
          No attachments.
        </div>
      </div>
    )
  }

  const links = linksResult.data.data.slice(0, ATTACHMENTS_LIMIT)
  const files = await Promise.all(
    links.map((link) => storage.files.retrieve(link.file_id, caller))
  )
  const fileError = files.find((file) => file.error)?.error ?? null

  return (
    <div className="space-y-3">
      {fileError ? (
        <AppError
          title="Some file details could not be loaded"
          error={fileError}
          variant="banner"
          showCode
        />
      ) : null}
      {links.length === 0 ? (
        <div className="876-card text-muted-foreground px-5 py-10 text-center text-sm">
          No attachments.
        </div>
      ) : (
        <div className="876-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-left text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Size</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Added by</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {links.map((link, index) => {
                  const file = files[index]?.data ?? null
                  return (
                    <tr key={link.id}>
                      <td className="px-4 py-3 font-medium">
                        {file?.original_name ?? 'File unavailable'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                        {formatOperatorBytes(file?.size_bytes ?? null)}
                      </td>
                      <td className="px-4 py-3">
                        {file?.content_type ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {link.created_by}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

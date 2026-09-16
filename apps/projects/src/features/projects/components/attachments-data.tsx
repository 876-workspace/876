import { AppError } from '@876/ui/app-error'

import {
  AttachmentsPanel,
  type AttachmentRow,
} from '@/features/projects/components/attachments-panel'
import { loadMemberLabels } from '@/features/projects/member-labels'
import {
  ATTACHMENT_RELATION,
  attachmentCaller,
  type AttachmentResourceRef,
} from '@/lib/attachments'
import { PROJECTS_APP_SLUG } from '@/lib/projects-app'
import { storage } from '@/lib/services/storage'

/** A row whose file metadata can no longer be read still names the link. */
function unavailableRow(
  linkId: string,
  fileId: string,
  addedByLabel: string
): AttachmentRow {
  return {
    linkId,
    fileId,
    name: 'File unavailable',
    sizeBytes: null,
    contentType: null,
    addedByLabel,
    downloadUrl: null,
  }
}

/**
 * The server half of a record's attachments panel.
 *
 * Projects holds no file metadata: the links are the association, and every
 * display field is read back from Storage when the panel renders. A file whose
 * metadata read fails (a swept upload, a file this actor may no longer read)
 * still yields a row, because the link is real even when its file is not — and
 * the signed download URL is minted per request, so it never outlives the page.
 */
export async function AttachmentsData({
  orgId,
  userId,
  resourceType,
  resourceId,
  canEdit,
}: AttachmentResourceRef & {
  orgId: string
  userId: string
  canEdit: boolean
}) {
  const caller = attachmentCaller({ orgId, userId })
  const [listed, members] = await Promise.all([
    storage.resourceLinks.list(
      {
        app_id: PROJECTS_APP_SLUG,
        resource_type: resourceType,
        resource_id: resourceId,
        relation: ATTACHMENT_RELATION,
      },
      caller
    ),
    loadMemberLabels(orgId),
  ])

  if (listed.error || !listed.data)
    return (
      <AppError
        title="Attachments could not be loaded"
        error={
          listed.error ?? {
            code: 'storage/provider-error',
            message: 'The Storage response was unavailable.',
          }
        }
        variant="banner"
      />
    )

  const rows = await Promise.all(
    listed.data.data.map(async (link): Promise<AttachmentRow> => {
      const addedByLabel = members.labels[link.created_by] ?? link.created_by
      const [file, readUrl] = await Promise.all([
        storage.files.retrieve(link.file_id, caller),
        storage.files.createReadUrl(link.file_id, caller),
      ])

      if (file.error || !file.data || readUrl.error || !readUrl.data)
        return unavailableRow(link.id, link.file_id, addedByLabel)

      return {
        linkId: link.id,
        fileId: link.file_id,
        name: file.data.original_name,
        sizeBytes: file.data.size_bytes,
        contentType: file.data.content_type,
        addedByLabel,
        downloadUrl: readUrl.data.url,
      }
    })
  )

  return (
    <AttachmentsPanel
      resourceType={resourceType}
      resourceId={resourceId}
      rows={rows}
      canEdit={canEdit}
    />
  )
}

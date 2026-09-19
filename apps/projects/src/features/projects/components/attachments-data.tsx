import { AppError, type AppErrorValue } from '@876/ui/app-error'

import {
  AttachmentsPanel,
  type AttachmentCandidate,
  type AttachmentRow,
} from '@/features/projects/components/attachments-panel'
import { loadMemberLabels } from '@/features/projects/member-labels'
import { attachmentCaller } from '@/lib/attachments'
import {
  ATTACHMENT_RELATION,
  type AttachmentResourceRef,
} from '@/types/attachments'
import { PROJECTS_APP_SLUG } from '@/lib/projects-app'
import { storage } from '@/lib/clients/storage'

/** How many existing files the re-attach picker offers. */
const EXISTING_FILE_LIMIT = 25

type ExistingFiles = {
  files: AttachmentCandidate[]
  error: AppErrorValue | null
}

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
 * Reads the files the record's project already holds.
 *
 * Projects can reach a file only through its resource link, and Storage offers
 * an application no organization-wide file listing, so "existing" here is the
 * project's own attachments: one link read, then the metadata each candidate
 * row shows. No read URL is minted — linking needs the id, and the picker
 * previews nothing.
 */
async function loadExistingFiles(input: {
  orgId: string
  userId: string
  projectId: string
  excludeFileIds: ReadonlySet<string>
}): Promise<ExistingFiles> {
  const caller = attachmentCaller({ orgId: input.orgId, userId: input.userId })
  const listed = await storage.resourceLinks.list(
    {
      app_id: PROJECTS_APP_SLUG,
      resource_type: 'project',
      resource_id: input.projectId,
      relation: ATTACHMENT_RELATION,
    },
    caller
  )

  if (listed.error || !listed.data)
    return {
      files: [],
      error: listed.error ?? {
        code: 'storage/provider-error',
        message: 'The Storage response was unavailable.',
      },
    }

  const fileIds = [...new Set(listed.data.data.map((link) => link.file_id))]
    .filter((fileId) => !input.excludeFileIds.has(fileId))
    .slice(0, EXISTING_FILE_LIMIT)

  const files = await Promise.all(
    fileIds.map(async (fileId): Promise<AttachmentCandidate | null> => {
      const file = await storage.files.retrieve(fileId, caller)
      if (file.error || !file.data) return null

      return {
        fileId,
        name: file.data.original_name,
        sizeBytes: file.data.size_bytes,
      }
    })
  )

  return {
    files: files.filter((file): file is AttachmentCandidate => file !== null),
    error: null,
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
  projectId,
  resourceType,
  resourceId,
  canEdit,
}: AttachmentResourceRef & {
  orgId: string
  userId: string
  projectId: string | null
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

  // A project's own files are the rows above already, so a project record has
  // nothing of its own to re-attach. A reader has no action to fill either.
  const existing =
    canEdit && projectId !== null && resourceType !== 'project'
      ? await loadExistingFiles({
          orgId,
          userId,
          projectId,
          excludeFileIds: new Set(rows.map((row) => row.fileId)),
        })
      : { files: [], error: null }

  return (
    <>
      {existing.error ? (
        <AppError
          title="Existing files could not be loaded"
          error={existing.error}
          variant="banner"
        />
      ) : null}
      <AttachmentsPanel
        resourceType={resourceType}
        resourceId={resourceId}
        rows={rows}
        existingFiles={existing.files}
        canEdit={canEdit}
      />
    </>
  )
}

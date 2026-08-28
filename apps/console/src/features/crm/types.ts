export type {
  CrmRequest,
  CrmRequestList,
  CrmListRequestsQuery,
  RequestStatus,
  RequestPriority,
  RequestSource,
  CrmRequestCreateInput,
  CrmRequestUpdateInput,
  CrmRequestNote,
  CrmRequestNoteList,
  CrmRequestNoteCreateInput,
  CrmRequestNoteUpdateInput,
  RequestNoteKind,
  CrmRequestNoteDeleteInput,
  CrmRequestTask,
  CrmRequestTaskList,
  CrmRequestTaskCreateInput,
  CrmRequestTaskUpdateInput,
  CrmTaskStatus,
  CrmRequestReminder,
  CrmRequestReminderList,
  CrmRequestReminderCreateInput,
  CrmRequestReminderUpdateInput,
  CrmReminderStatus,
  CrmRequestCategory,
  CrmRequestCategoryList,
} from '@876/client'

export type DirectoryMember = {
  userId: string
  name: string
  email: string | null
  avatar: string | null
}

export type RequestDepartment = {
  id: string
  name: string
}

export type NoteAuthor = {
  name: string
  avatar?: string | null
}

export type {
  CrmRequest,
  RequestList as CrmRequestList,
  ListRequestsQuery as CrmListRequestsQuery,
  RequestStatus,
  RequestPriority,
  RequestChannel,
  CreateRequestInput as CrmRequestCreateInput,
  UpdateRequestInput as CrmRequestUpdateInput,
  CrmRequestNote,
  RequestNoteList as CrmRequestNoteList,
  CreateRequestNoteInput as CrmRequestNoteCreateInput,
  UpdateRequestNoteInput as CrmRequestNoteUpdateInput,
  RequestNoteKind,
  DeleteRequestNoteInput as CrmRequestNoteDeleteInput,
  RequestTask as CrmRequestTask,
  RequestTaskList as CrmRequestTaskList,
  CreateRequestTaskInput as CrmRequestTaskCreateInput,
  UpdateRequestTaskInput as CrmRequestTaskUpdateInput,
  TaskStatus as CrmTaskStatus,
  RequestReminder as CrmRequestReminder,
  RequestReminderList as CrmRequestReminderList,
  CreateRequestReminderInput as CrmRequestReminderCreateInput,
  UpdateRequestReminderInput as CrmRequestReminderUpdateInput,
  ReminderStatus as CrmReminderStatus,
  RequestCategory as CrmRequestCategory,
  RequestCategoryList as CrmRequestCategoryList,
} from '@876/crm'

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

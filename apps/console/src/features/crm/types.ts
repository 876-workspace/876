/**
 * Compatibility names for CRM contracts used throughout the application.
 *
 * The bounded CRM package exports domain names directly. Keep the former
 * application-facing aliases here so browser transports and UI code share one
 * stable, app-local contract vocabulary.
 */
export type {
  Customer as CrmCustomer,
  CreateCustomerInput as CrmCustomerCreateInput,
  CustomerList as CrmCustomerList,
  CustomerProfile as CrmCustomerProfile,
  CustomerProfileStatus as CrmCustomerProfileStatus,
  UpdateCustomerInput as CrmCustomerUpdateInput,
  CrmRequest,
  CreateRequestInput as CrmRequestCreateInput,
  ListRequestsQuery as CrmListRequestsQuery,
  RequestList as CrmRequestList,
  UpdateRequestInput as CrmRequestUpdateInput,
  RequestCategory as CrmRequestCategory,
  CreateRequestCategoryInput as CrmRequestCategoryCreateInput,
  DeleteRequestCategoryInput as CrmRequestCategoryDeleteInput,
  RequestCategoryList as CrmRequestCategoryList,
  UpdateRequestCategoryInput as CrmRequestCategoryUpdateInput,
  RequestPriority as CrmRequestPriority,
  CreateRequestPriorityInput as CrmRequestPriorityCreateInput,
  DeleteRequestPriorityInput as CrmRequestPriorityDeleteInput,
  ListRequestPrioritiesQuery as CrmListRequestPrioritiesQuery,
  RequestPriorityList as CrmRequestPriorityList,
  UpdateRequestPriorityInput as CrmRequestPriorityUpdateInput,
  RequestForm as CrmRequestForm,
  CreateRequestFormInput as CrmRequestFormCreateInput,
  ListFormCustomerRequestsQuery as CrmListFormCustomerRequestsQuery,
  ListRequestFormsQuery as CrmListRequestFormsQuery,
  RequestFormDefinition as CrmRequestFormDefinition,
  RequestFormField as CrmRequestFormField,
  RequestFormFieldMapping as CrmRequestFormFieldMapping,
  RequestFormList as CrmRequestFormList,
  RequestFormStatus as CrmRequestFormStatus,
  RequestFormSubmission as CrmRequestFormSubmission,
  RequestFormSubmissionList as CrmRequestFormSubmissionList,
  RequestFormSubmissionRecord as CrmRequestFormSubmissionRecord,
  SubmitRequestFormInput as CrmRequestFormSubmitInput,
  UpdateRequestFormInput as CrmRequestFormUpdateInput,
  CrmRequestNote,
  CreateRequestNoteInput as CrmRequestNoteCreateInput,
  DeleteRequestNoteInput as CrmRequestNoteDeleteInput,
  RequestNoteList as CrmRequestNoteList,
  ListRequestNotesInput as CrmListRequestNotesInput,
  RequestNoteVisibility as CrmRequestNoteVisibility,
  UpdateRequestNoteInput as CrmRequestNoteUpdateInput,
  RequestReminder as CrmRequestReminder,
  CreateRequestReminderInput as CrmRequestReminderCreateInput,
  DeleteNestedRequestInput as CrmRequestReminderDeleteInput,
  RequestReminderList as CrmRequestReminderList,
  UpdateRequestReminderInput as CrmRequestReminderUpdateInput,
  RequestTask as CrmRequestTask,
  CreateRequestTaskInput as CrmRequestTaskCreateInput,
  DeleteNestedRequestInput as CrmRequestTaskDeleteInput,
  RequestTaskList as CrmRequestTaskList,
  UpdateRequestTaskInput as CrmRequestTaskUpdateInput,
  RequestEvent as CrmRequestEvent,
  RequestEventList as CrmRequestEventList,
  RequestEventParticipant as CrmRequestEventParticipant,
  CreateRequestEventInput as CrmRequestEventCreateInput,
  UpdateRequestEventInput as CrmRequestEventUpdateInput,
  CreateRequestEventParticipantInput as CrmRequestEventParticipantCreateInput,
  UpdateRequestEventParticipantInput as CrmRequestEventParticipantUpdateInput,
  RequestEventStatus as CrmRequestEventStatus,
  RequestEventBusyStatus as CrmRequestEventBusyStatus,
  RequestSubcategory as CrmRequestSubcategory,
  CreateRequestSubcategoryInput as CrmRequestSubcategoryCreateInput,
  DeleteRequestCategoryInput as CrmRequestSubcategoryDeleteInput,
  UpdateRequestSubcategoryInput as CrmRequestSubcategoryUpdateInput,
  ReminderStatus as CrmReminderStatus,
  TaskStatus as CrmTaskStatus,
  Team as CrmTeam,
  TeamAutoAssign as CrmTeamAutoAssign,
  CreateTeamInput as CrmTeamCreateInput,
  DeleteTeamInput as CrmTeamDeleteInput,
  TeamList as CrmTeamList,
  ListTeamsQuery as CrmListTeamsQuery,
  TeamMember as CrmTeamMember,
  AddTeamMemberInput as CrmTeamMemberAddInput,
  TeamMemberList as CrmTeamMemberList,
  TeamMemberRole as CrmTeamMemberRole,
  UpdateTeamMemberInput as CrmTeamMemberUpdateInput,
  TeamStatus as CrmTeamStatus,
  UpdateTeamInput as CrmTeamUpdateInput,
  RequestNoteKind,
  RequestPriority,
  RequestChannel,
  RequestStatus,
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

type SubjectType = 'user' | 'organization'

/**
 * Reusable tab content views for detail pages. Intentionally blank for now —
 * they render an empty region keyed by the subject id, ready to later load and
 * display the subject's notes / activity / tickets / organization. No data
 * wiring or placeholder chrome yet.
 */

export function NotesView({
  subjectId,
}: {
  subjectType: SubjectType
  subjectId: string
}) {
  return <div data-subject-id={subjectId} />
}

export function ActivityView({
  subjectId,
}: {
  subjectType: SubjectType
  subjectId: string
}) {
  return <div data-subject-id={subjectId} />
}

export function AuditView({
  subjectId,
}: {
  subjectType: SubjectType
  subjectId: string
}) {
  return <div data-subject-id={subjectId} />
}

export function InvoicesView({
  subjectId,
}: {
  subjectType: SubjectType
  subjectId: string
}) {
  return <div data-subject-id={subjectId} />
}

export function TicketsView({ userId }: { userId: string }) {
  return <div data-subject-id={userId} />
}

export function UserOrganizationView({ userId }: { userId: string }) {
  return <div data-subject-id={userId} />
}

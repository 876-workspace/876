export type VisibilitySubject =
  | { kind: 'issue'; issueRef: string }
  | { kind: 'issue-comment'; issueRef: string; commentId: string }
  | { kind: 'phase'; phaseId: string }
  | { kind: 'phase-comment'; phaseId: string; commentId: string }
  | { kind: 'attachment-link'; projectId: string; attachmentId: string }

export type VisibilityError = {
  code: string
  message: string
  status: 400 | 404 | 502
}

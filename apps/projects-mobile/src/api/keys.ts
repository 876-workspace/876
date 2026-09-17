export const scopeKeys = {
  all: (organizationId: string) => ['org', organizationId] as const,
  projects: (organizationId: string) =>
    [...scopeKeys.all(organizationId), 'projects'] as const,
  project: (organizationId: string, projectId: string) =>
    [...scopeKeys.projects(organizationId), projectId] as const,
  issues: (organizationId: string, filters?: unknown) =>
    [...scopeKeys.all(organizationId), 'issues', filters ?? null] as const,
  issue: (organizationId: string, issueRef: string) =>
    [...scopeKeys.all(organizationId), 'issues', issueRef] as const,
  comments: (organizationId: string, issueRef: string) =>
    [...scopeKeys.issue(organizationId, issueRef), 'comments'] as const,
  notifications: (organizationId: string, userId: string) =>
    [...scopeKeys.all(organizationId), 'notifications', userId] as const,
  myWork: (organizationId: string, userId: string) =>
    [...scopeKeys.all(organizationId), 'my-work', userId] as const,
  memberships: () => ['memberships'] as const,
}

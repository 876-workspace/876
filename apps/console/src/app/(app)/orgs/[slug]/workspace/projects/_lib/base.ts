/** This organization's Projects workspace root inside Console. */
export function workspaceProjectsBase(slug: string): string {
  return `/orgs/${encodeURIComponent(slug)}/workspace/projects`
}

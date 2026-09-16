const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug.length > 0 ? slug : 'page'
}

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug)
}

export type PageLink = {
  id: string
  parentPageId: string | null
}

/**
 * Reports whether assigning `newParentId` to `pageId` would create a cycle
 * in the page tree. A page cannot be its own ancestor, so walking up from
 * the candidate parent must never reach the page itself.
 */
export function wouldCreateCycle(
  pages: PageLink[],
  pageId: string,
  newParentId: string | null
): boolean {
  if (newParentId === null) return false
  if (newParentId === pageId) return true
  const parents = new Map(pages.map((page) => [page.id, page.parentPageId]))
  let current: string | null | undefined = parents.get(newParentId)
  const visited = new Set<string>([newParentId])
  while (current !== null && current !== undefined) {
    if (current === pageId) return true
    if (visited.has(current)) return true
    visited.add(current)
    current = parents.get(current)
  }
  return false
}

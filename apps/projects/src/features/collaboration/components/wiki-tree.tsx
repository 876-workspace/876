import Link from 'next/link'

import type { UiWikiPage } from '../mappers'

type WikiNode = {
  page: UiWikiPage
  children: WikiNode[]
}

function buildTree(pages: readonly UiWikiPage[]): WikiNode[] {
  const nodes = new Map<string, WikiNode>()
  for (const page of pages) nodes.set(page.id, { page, children: [] })
  const roots: WikiNode[] = []
  const attached = new Set<string>()
  for (const page of pages) {
    if (page.parentId === null) {
      const node = nodes.get(page.id)
      if (node) {
        roots.push(node)
        attached.add(page.id)
      }
    }
  }
  let pending = pages.length - attached.size
  let guard = pages.length + 1
  while (pending > 0 && guard > 0) {
    guard -= 1
    let progressed = false
    for (const page of pages) {
      if (attached.has(page.id)) continue
      const node = nodes.get(page.id)
      const parent =
        page.parentId === null ? null : nodes.get(page.parentId)
      if (node && parent && attached.has(parent.page.id)) {
        parent.children.push(node)
        attached.add(page.id)
        pending -= 1
        progressed = true
      }
    }
    if (!progressed) {
      for (const page of pages) {
        if (attached.has(page.id)) continue
        const node = nodes.get(page.id)
        if (node) {
          roots.push(node)
          attached.add(page.id)
          pending -= 1
        }
      }
    }
  }
  return roots
}

export function WikiTree({
  pages,
  hrefBase,
  currentPageId,
}: {
  pages: readonly UiWikiPage[]
  hrefBase: string
  currentPageId: string | null
}) {
  if (pages.length === 0) {
    return (
      <p
        data-slot="wiki-tree-empty"
        className="text-muted-foreground py-12 text-center text-sm"
      >
        No wiki pages yet
      </p>
    )
  }
  return (
    <ul data-slot="wiki-tree" className="flex flex-col gap-1">
      {buildTree(pages).map((node) => (
        <WikiTreeNode
          key={node.page.id}
          node={node}
          depth={0}
          currentPageId={currentPageId}
          hrefBase={hrefBase}
        />
      ))}
    </ul>
  )
}

function WikiTreeNode({
  node,
  depth,
  currentPageId,
  hrefBase,
}: {
  node: WikiNode
  depth: number
  currentPageId: string | null
  hrefBase: string
}) {
  const current = node.page.id === currentPageId
  return (
    <li style={{ paddingLeft: depth === 0 ? 0 : depth * 16 }}>
      <Link
        href={`${hrefBase.replace(/\/+$/, '')}/${encodeURIComponent(node.page.slug)}`}
        aria-current={current ? 'page' : undefined}
        className={`text-sm hover:underline ${current ? 'font-semibold' : ''}`}
      >
        {node.page.title}
      </Link>
      {node.children.length > 0 ? (
        <ul className="mt-1 flex flex-col gap-1">
          {node.children.map((child) => (
            <WikiTreeNode
              key={child.page.id}
              node={child}
              depth={depth + 1}
              currentPageId={currentPageId}
              hrefBase={hrefBase}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

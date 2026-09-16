import Link from 'next/link'

import { formatDay } from '../finance/format-money'
import type { WikiPage } from './types'

export type WikiTreeProps = {
  pages: readonly WikiPage[]
  hrefBase: string
  currentPageId: string | null
}

type WikiNode = {
  page: WikiPage
  children: WikiNode[]
}

function buildTree(pages: readonly WikiPage[]): WikiNode[] {
  const nodes = new Map<string, WikiNode>()

  for (const page of pages) {
    nodes.set(page.id, { page, children: [] })
  }

  const roots: WikiNode[] = []
  const attached = new Set<string>()

  for (const page of pages) {
    if (page.parentId === null) {
      roots.push(nodes.get(page.id)!)
      attached.add(page.id)
    }
  }

  let pending = pages.length - roots.length

  while (pending > 0) {
    let progressed = false

    for (const page of pages) {
      if (attached.has(page.id)) continue

      const node = nodes.get(page.id)!
      const parent = page.parentId === null ? null : nodes.get(page.parentId)

      if (!parent) continue
      if (attached.has(parent.page.id)) {
        parent.children.push(node)
        attached.add(page.id)
        pending -= 1
        progressed = true
      }
    }

    if (!progressed) {
      for (const page of pages) {
        if (!attached.has(page.id)) {
          roots.push(nodes.get(page.id)!)
          attached.add(page.id)
          pending -= 1
        }
      }
    }
  }

  return roots
}

export function WikiTree({ pages, hrefBase, currentPageId }: WikiTreeProps) {
  const roots = buildTree(pages)

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
      {roots.map((node) => (
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
  const page = node.page
  const isCurrent = currentPageId === page.id
  const href = `${hrefBase.replace(/\/$/, '')}/${encodeURIComponent(page.id)}`

  return (
    <li>
      <div
        className="flex items-center justify-between gap-2"
        style={{ paddingLeft: depth * 16 }}
      >
        <Link
          href={href}
          aria-current={isCurrent ? 'page' : undefined}
          className={
            isCurrent ? 'text-sm font-semibold' : 'text-sm hover:underline'
          }
        >
          {page.title}
        </Link>
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          {formatDay(page.updatedAt)}
        </span>
      </div>
      {node.children.length > 0 ? (
        <ul className="ml-4 flex flex-col gap-1">
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

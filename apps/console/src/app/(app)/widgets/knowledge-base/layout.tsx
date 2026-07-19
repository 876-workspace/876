import type { ReactNode } from 'react'
import { knowledgeBaseWidgetMetadata } from '@876/widgets'

import { WidgetDetailHeader } from '@/components/widgets/widget-detail-header'

export default function KnowledgeBaseWidgetLayout({
  children,
}: {
  children: ReactNode
}) {
  const base = '/widgets/knowledge-base'
  return (
    <div>
      <WidgetDetailHeader
        widget={knowledgeBaseWidgetMetadata}
        tabs={[
          { label: 'Overview', href: base, exact: true },
          { label: 'Access', href: `${base}/access` },
          { label: 'Data', href: `${base}/data` },
        ]}
      />
      <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </div>
  )
}

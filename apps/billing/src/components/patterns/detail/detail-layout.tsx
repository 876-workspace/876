import type { ReactNode } from 'react'

import { Badge } from '@876/ui/badge'
import { cn } from '@876/core/utils'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardIdBar,
  DetailCardMeta,
  DetailCardRouteTabs,
} from '@876/ui/detail-card'
import type { RouteTabItem as DetailTab } from '@876/ui/route-tabs'

/**
 * The chrome for every Billing record.
 *
 * It renders the record as a `DetailCard` so the route opens **beside** its
 * list in the section's `ListDetailSection` rather than replacing it. That is
 * also why there is no back link: the list sitting next to the card is the way
 * back, and `backHref` only supplies the close button's target.
 */
export function DetailLayout({
  children,
  backHref,
  eyebrow,
  title,
  description,
  status,
  statusVariant = 'secondary',
  tabs,
  avatar,
  meta,
  actions,
  titleClassName,
  recordId,
}: {
  children: ReactNode
  /** The section index. The card's close button returns here. */
  backHref: string
  backLabel: string
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  status: string
  statusVariant?: 'secondary' | 'success' | 'info' | 'warning' | 'destructive'
  tabs: DetailTab[]
  /** Optional leading avatar/logo, rendered to the left of the title. */
  avatar?: ReactNode
  /** Optional icon-led metadata row, shown in place of the eyebrow line. */
  meta?: ReactNode
  /** Optional right-aligned actions (detail toolbar). */
  actions?: ReactNode
  titleClassName?: string
  /** Record identifier, pinned to the bottom of the card when given. */
  recordId?: string
}) {
  const subtitle = meta ? (
    <DetailCardMeta>{meta}</DetailCardMeta>
  ) : eyebrow || description ? (
    <DetailCardMeta>
      {eyebrow ? <span className="876-eyebrow">{eyebrow}</span> : null}
      {description ? <span className="truncate">{description}</span> : null}
    </DetailCardMeta>
  ) : null

  return (
    <DetailCard aria-label={typeof title === 'string' ? title : undefined}>
      <DetailCardHeader
        icon={avatar}
        title={<span className={cn(titleClassName)}>{title}</span>}
        meta={<Badge variant={statusVariant}>{status}</Badge>}
        subtitle={subtitle}
        actions={actions}
        closeHref={backHref}
        closeLabel="Close record"
      />

      {tabs.length > 0 ? <DetailCardRouteTabs tabs={tabs} /> : null}

      <DetailCardBody>{children}</DetailCardBody>

      {recordId ? (
        <DetailCardIdBar>
          <span className="truncate">{recordId}</span>
        </DetailCardIdBar>
      ) : null}
    </DetailCard>
  )
}

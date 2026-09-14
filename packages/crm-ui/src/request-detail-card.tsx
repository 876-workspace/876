import type { CrmRequest } from '@876/crm'
import type { ReactNode } from 'react'
import {
  DetailCard,
  DetailCardBody,
  DetailCardFacts,
  DetailCardFact,
  DetailCardHeader,
  DetailCardHeadline,
  DetailCardIdBar,
  DetailCardRouteTabs,
  DetailCardSection,
} from '@876/ui/detail-card'

export function RequestDetailCard({
  request,
  baseHref,
  closeHref = baseHref,
  customerHref,
  children,
}: {
  request: CrmRequest
  baseHref: string
  closeHref?: string
  customerHref?: string
  children?: ReactNode
}) {
  const related =
    request.relatedResourceType && request.relatedResourceId
      ? `${request.relatedResourceType} · ${request.relatedResourceSnapshot?.number ?? request.relatedResourceId}`
      : 'None'
  return (
    <DetailCard aria-label={`Request ${request.number}`}>
      <DetailCardHeader
        title={`Request #${request.number}`}
        closeHref={closeHref}
        closeLabel="Close request"
      />
      <DetailCardRouteTabs
        tabs={[
          { label: 'Overview', href: baseHref, exact: true },
          { label: 'Tasks', href: `${baseHref}/tasks` },
          { label: 'Activity', href: `${baseHref}/activity` },
        ]}
      />
      <DetailCardBody>
        <DetailCardHeadline value={request.subject} caption={request.status} />
        <DetailCardSection title="Details">
          <DetailCardFacts>
            <DetailCardFact label="Status" value={request.status} />
            <DetailCardFact label="Priority" value={request.priority.name} />
            <DetailCardFact
              label="Assignee"
              value={request.assigneeId ?? 'Unassigned'}
            />
            <DetailCardFact
              label="Team"
              value={request.teamId ?? 'Unassigned'}
            />
            <DetailCardFact
              label="Category"
              value={request.categoryId ?? 'Uncategorized'}
            />
            <DetailCardFact
              label="Requester"
              value={
                request.requesterUserId ??
                request.requesterContactId ??
                'Unknown'
              }
            />
            <DetailCardFact label="Related record" value={related} />
            <DetailCardFact
              label="Customer"
              value={
                customerHref ? (
                  <a href={customerHref}>View customer</a>
                ) : (
                  request.customerId
                )
              }
            />
            <DetailCardFact
              label="Created"
              value={new Date(request.createdAt * 1000).toLocaleString()}
            />
            <DetailCardFact
              label="Updated"
              value={new Date(request.updatedAt * 1000).toLocaleString()}
            />
          </DetailCardFacts>
        </DetailCardSection>
        {children}
      </DetailCardBody>
      <DetailCardIdBar>{request.id}</DetailCardIdBar>
    </DetailCard>
  )
}

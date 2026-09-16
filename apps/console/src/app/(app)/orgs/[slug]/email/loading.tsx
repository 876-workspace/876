import { DomainListPanelSkeleton } from '@876/communications-ui/panels/domain-list-panel'
import { DomainRecordsPanelSkeleton } from '@876/communications-ui/panels/domain-records-panel'
import { SenderListPanelSkeleton } from '@876/communications-ui/panels/sender-list-panel'
import { TemplateListPanelSkeleton } from '@876/communications-ui/panels/template-list-panel'

import { DeliveriesTableSkeleton } from '@/features/email/components/deliveries-table'

export default function Loading() {
  return (
    <div className="space-y-5">
      <h1 className="876-page-title">Email</h1>
      <SenderListPanelSkeleton />
      <DomainListPanelSkeleton />
      <DomainRecordsPanelSkeleton domainName="Sending domain" />
      <TemplateListPanelSkeleton />
      <DeliveriesTableSkeleton />
    </div>
  )
}

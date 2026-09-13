import {
  DetailCardFact,
  DetailCardFacts,
  DetailCardSection,
} from '@876/ui/detail-card'

function emptyValue() {
  return <span className="text-muted-foreground">&mdash;</span>
}

/**
 * The dispute overview. There is no disputes retrieve yet, so the sections
 * name the eventual shape and every value is an em dash.
 */
export default function DisputeOverviewPage() {
  return (
    <div className="space-y-6">
      <DetailCardSection title="Details">
        <DetailCardFacts>
          <DetailCardFact label="Customer" value={emptyValue()} />
          <DetailCardFact label="Payment" value={emptyValue()} />
          <DetailCardFact label="Reason" value={emptyValue()} />
          <DetailCardFact label="Status" value={emptyValue()} />
        </DetailCardFacts>
      </DetailCardSection>

      <DetailCardSection title="Activity">
        <DetailCardFacts>
          <DetailCardFact label="Events" value={emptyValue()} />
        </DetailCardFacts>
      </DetailCardSection>
    </div>
  )
}

import {
  DetailCardFact,
  DetailCardFacts,
  DetailCardSection,
} from '@876/ui/detail-card'

function emptyValue() {
  return <span className="text-muted-foreground">&mdash;</span>
}

/**
 * The delivery overview. There is no deliveries retrieve yet, so the sections
 * name the eventual shape and every value is an em dash.
 */
export default function DeliveryOverviewPage() {
  return (
    <div className="space-y-6">
      <DetailCardSection title="Details">
        <DetailCardFacts>
          <DetailCardFact label="Customer" value={emptyValue()} />
          <DetailCardFact label="Status" value={emptyValue()} />
          <DetailCardFact label="Area" value={emptyValue()} />
        </DetailCardFacts>
      </DetailCardSection>

      <DetailCardSection title="Packages">
        <DetailCardFacts>
          <DetailCardFact label="Packages" value={emptyValue()} />
        </DetailCardFacts>
      </DetailCardSection>
    </div>
  )
}

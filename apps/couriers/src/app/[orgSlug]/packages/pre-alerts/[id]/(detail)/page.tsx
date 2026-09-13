import {
  DetailCardFact,
  DetailCardFacts,
  DetailCardSection,
} from '@876/ui/detail-card'

function emptyValue() {
  return <span className="text-muted-foreground">&mdash;</span>
}

/**
 * The pre-alert overview. There is no pre-alerts retrieve yet, so the sections
 * name the eventual shape and every value is an em dash.
 */
export default function PreAlertOverviewPage() {
  return (
    <div className="space-y-6">
      <DetailCardSection title="Details">
        <DetailCardFacts>
          <DetailCardFact label="Customer" value={emptyValue()} />
          <DetailCardFact label="Status" value={emptyValue()} />
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

import {
  DetailCardFact,
  DetailCardFacts,
  DetailCardSection,
} from '@876/ui/detail-card'

function emptyValue() {
  return <span className="text-muted-foreground">&mdash;</span>
}

/**
 * The manifest overview. There is no manifest retrieve yet, so the sections
 * name the eventual shape and every value is an em dash.
 */
export default function ManifestOverviewPage() {
  return (
    <div className="space-y-6">
      <DetailCardSection title="Details">
        <DetailCardFacts>
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

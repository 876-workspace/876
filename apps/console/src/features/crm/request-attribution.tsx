import type {
  RelatedResourceSnapshot,
  RelatedResourceType,
  SourceApp,
} from '@876/crm'

const SOURCE_APP_NAMES: Record<SourceApp, string> = {
  '876-invoice': '876 Invoice',
  '876-billing': '876 Billing',
  '876-crm': '876 CRM',
  '876-console': '876 Console',
}

const RELATED_RESOURCE_LABELS: Record<RelatedResourceType, string> = {
  invoice: 'Invoice',
  payment: 'Payment',
  quote: 'Quote',
  'credit-note': 'Credit note',
}

export function sourceAppName(sourceApp: SourceApp | null | undefined) {
  return sourceApp ? SOURCE_APP_NAMES[sourceApp] : null
}

export function relatedResourceLabel({
  type,
  id,
  snapshot,
}: {
  type: RelatedResourceType | null | undefined
  id: string | null | undefined
  snapshot: RelatedResourceSnapshot | null | undefined
}) {
  if (!type || !id) return null

  return `${RELATED_RESOURCE_LABELS[type]} ${snapshot?.number ?? id}`
}

export function SourceAppMetadata({
  sourceApp,
}: {
  sourceApp: SourceApp | null | undefined
}) {
  return <span className="text-muted-foreground">{sourceAppName(sourceApp) ?? '—'}</span>
}

export function RelatedResourceMetadata({
  type,
  id,
  snapshot,
}: {
  type: RelatedResourceType | null | undefined
  id: string | null | undefined
  snapshot: RelatedResourceSnapshot | null | undefined
}) {
  return (
    <span className="text-muted-foreground">
      {relatedResourceLabel({ type, id, snapshot }) ?? '—'}
    </span>
  )
}

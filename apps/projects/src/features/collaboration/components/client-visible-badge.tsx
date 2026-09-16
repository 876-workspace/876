import { Badge } from '@876/ui/badge'

export function ClientVisibleBadge({
  clientVisible,
}: {
  clientVisible: boolean
}) {
  return clientVisible ? <Badge variant="info">Client visible</Badge> : null
}

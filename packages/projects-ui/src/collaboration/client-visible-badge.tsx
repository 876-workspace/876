import { Badge } from '@876/ui/badge'

type ClientVisibleBadgeProps = {
  clientVisible: boolean
}

export function ClientVisibleBadge({ clientVisible }: ClientVisibleBadgeProps) {
  return clientVisible ? <Badge variant="info">Client visible</Badge> : null
}

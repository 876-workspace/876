import {
  CommandLineIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  Phone,
  SparklesIcon,
} from '@876/ui/icons'

import type { RequestSource } from '@/types/crm'

/** The glyph for where a request came from. Sized by the caller. */
export function RequestSourceIcon({
  source,
  className = 'size-3.5 shrink-0',
}: {
  source: RequestSource
  className?: string
}) {
  switch (source) {
    case 'EMAIL':
      return <EnvelopeIcon className={className} aria-hidden="true" />
    case 'PHONE':
      return <Phone className={className} aria-hidden="true" />
    case 'WEB':
      return <GlobeAltIcon className={className} aria-hidden="true" />
    case 'API':
      return <CommandLineIcon className={className} aria-hidden="true" />
    default:
      return <SparklesIcon className={className} aria-hidden="true" />
  }
}

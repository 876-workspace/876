import {
  CommandLineIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  SparklesIcon,
} from '@876/ui/icons'

import type { RequestChannel } from '../types'

/** The glyph for how a request entered CRM. Sized by the caller. */
export function RequestChannelIcon({
  channel,
  className = 'size-3.5 shrink-0',
}: {
  channel: RequestChannel
  className?: string
}) {
  switch (channel) {
    case 'EMAIL':
      return <EnvelopeIcon className={className} aria-hidden="true" />
    case 'FORM':
    case 'WIDGET':
      return <GlobeAltIcon className={className} aria-hidden="true" />
    case 'API':
      return <CommandLineIcon className={className} aria-hidden="true" />
    case 'CHAT':
    case 'AGENT':
      return <SparklesIcon className={className} aria-hidden="true" />
  }
}

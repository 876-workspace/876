import type { ComponentType, SVGProps } from 'react'

import { Apple } from '../icons/apple'
import { Google } from '../icons/google'
import { Microsoft } from '../icons/microsoft'
import type { SocialProvider } from './types'

export { Apple, Google, Microsoft }

export const MicrosoftOutlook = Microsoft

/**
 * Maps a social provider to its brand glyph. Providers without a dedicated
 * icon (e.g. GitHub) are absent here and fall back to a text label.
 */
export const PROVIDER_ICONS: Partial<
  Record<SocialProvider, ComponentType<SVGProps<SVGSVGElement>>>
> = {
  google: Google,
  apple: Apple,
  microsoft: Microsoft,
}

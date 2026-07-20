/**
 * Widget panel size tokens and width resolution.
 *
 * Fixed tokens map to pixel widths. `fill` is dynamic: docked mode grows until
 * the main column hits its minimum; popout mode caps against the viewport.
 */

export type WidgetSize = 'sm' | 'md' | 'lg' | 'xl' | 'fill'

/** @deprecated Prefer `WidgetSize`. */
export type WidgetPopoutSize = WidgetSize

export type WidgetPanelPresentation = 'popout' | 'docked'

export type WidgetSizePolicy = {
  default: WidgetSize
  allowed: readonly WidgetSize[]
  /** Persist last choice per host+widget. Defaults true when multi-size. */
  remember?: boolean
  /**
   * Accent for rail active chrome — CSS color (oklch, hex, or token).
   * Applied as `--widget-accent` on the trigger.
   */
  accent?: string
}

export const WIDGET_WIDTHS = {
  sm: 320,
  md: 384,
  lg: 520,
  xl: 720,
} as const satisfies Record<Exclude<WidgetSize, 'fill'>, number>

/** Icon rail width — keep in sync with `RAIL_WIDTH_REM` in the popout chrome. */
export const RAIL_WIDTH_PX = 60

/** Gap between floating popout and the icon rail / viewport edges. */
export const PANEL_GUTTER_PX = 24

/** Extra top/bottom inset so the floating card is not edge-to-edge tall. */
export const PANEL_VERTICAL_INSET_PX = 10

/** Minimum main content column when a panel is docked. */
export const MIN_MAIN_COLUMN_WIDTH_PX = 600

/** Cap for popout/overlay fill so the card does not swallow the viewport. */
export const MAX_WIDGET_FILL_WIDTH_PX = 960

export const WIDGET_SIZES = [
  'sm',
  'md',
  'lg',
  'xl',
  'fill',
] as const satisfies readonly WidgetSize[]

export const WIDGET_SIZE_LABELS: Record<WidgetSize, string> = {
  sm: 'Small',
  md: 'Medium',
  lg: 'Large',
  xl: 'Extra large',
  fill: 'Fill',
}

export function isWidgetSize(value: unknown): value is WidgetSize {
  return (
    value === 'sm' ||
    value === 'md' ||
    value === 'lg' ||
    value === 'xl' ||
    value === 'fill'
  )
}

export function normalizeSizePolicy(
  policy: WidgetSizePolicy | undefined,
  fallbackDefault: WidgetSize = 'md'
): WidgetSizePolicy {
  if (!policy) {
    return { default: fallbackDefault, allowed: [fallbackDefault] }
  }

  const allowed =
    policy.allowed.length > 0
      ? policy.allowed
      : ([policy.default] as readonly WidgetSize[])

  const defaultSize = allowed.includes(policy.default)
    ? policy.default
    : allowed[0]!

  return {
    default: defaultSize,
    allowed,
    remember: policy.remember,
    accent: policy.accent,
  }
}

export function resolveAllowedSize(
  size: WidgetSize | undefined,
  policy: WidgetSizePolicy
): WidgetSize {
  if (size && policy.allowed.includes(size)) return size
  return policy.default
}

export function isSizeLocked(policy: WidgetSizePolicy): boolean {
  return policy.allowed.length <= 1
}

export function shouldRememberSize(policy: WidgetSizePolicy): boolean {
  if (isSizeLocked(policy)) return false
  if (policy.remember === false) return false
  return policy.remember === true || policy.allowed.length > 1
}

export type ResolveWidgetWidthArgs = {
  size: WidgetSize
  presentation: WidgetPanelPresentation
  availableWidth: number | null
  viewportWidth: number
  railWidth?: number
  minMainColumnWidth?: number
  gutter?: number
  maxFillWidth?: number
}

/**
 * Resolve panel width in pixels for a size token.
 * `fill` is presentation-aware (docked vs popout overlay).
 */
export function resolveWidgetWidth({
  size,
  presentation,
  availableWidth,
  viewportWidth,
  railWidth = RAIL_WIDTH_PX,
  minMainColumnWidth = MIN_MAIN_COLUMN_WIDTH_PX,
  gutter = PANEL_GUTTER_PX,
  maxFillWidth = MAX_WIDGET_FILL_WIDTH_PX,
}: ResolveWidgetWidthArgs): number {
  if (size !== 'fill') return WIDGET_WIDTHS[size]

  if (presentation === 'docked' && availableWidth !== null) {
    const fillDocked = availableWidth - railWidth - minMainColumnWidth
    return Math.max(WIDGET_WIDTHS.sm, fillDocked)
  }

  // Popout / overlay fill (also fallback when availableWidth is unknown)
  const fillOverlay = viewportWidth - railWidth - gutter * 2
  return Math.max(WIDGET_WIDTHS.sm, Math.min(fillOverlay, maxFillWidth))
}

export function canDockAtWidth(
  availableWidth: number | null,
  panelWidth: number,
  railWidth = RAIL_WIDTH_PX,
  minMainColumnWidth = MIN_MAIN_COLUMN_WIDTH_PX
): boolean {
  if (availableWidth === null) return false
  return availableWidth - railWidth - panelWidth >= minMainColumnWidth
}

export function sizeTooltipLabel(size: WidgetSize): string {
  if (size === 'fill') return 'Fill — workspace'
  return `${WIDGET_SIZE_LABELS[size]} — ${WIDGET_WIDTHS[size]}px`
}

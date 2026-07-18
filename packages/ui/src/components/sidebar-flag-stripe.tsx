import { cn } from '../lib/utils'

import { getFlagColors } from './flag-stripe'

/**
 * Colors too dark to read against the dark-mode sidebar (black, deep navy)
 * get a subtle white outline when rendered as dots.
 */
function isDarkColor(hex: string): boolean {
  const value = hex.replace('#', '')
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 48
}

/**
 * Sidebar variant of the identity flag stripe. Expanded, it renders the
 * continuous stripe; when the sidebar collapses to icon mode
 * (`data-collapsible="icon"` on the sidebar group) each color shrinks into a
 * small dot, popping in with a staggered overshoot bounce (`flag-dot-pop`
 * keyframes in styles.css). Expanding reverses it: the dots stretch and merge
 * back into one stripe — a liquid join driven by animating `flex-grow`,
 * `gap`, and `border-radius` with an overshoot easing.
 *
 * Colors always split the stripe evenly; `thickness` (px) sets both the
 * stripe width and the dot diameter. Decorative only.
 */
export function SidebarFlagStripe({
  countryCode,
  thickness = 4,
  className,
}: {
  countryCode?: string | null
  /** Stripe width and dot diameter in pixels. */
  thickness?: number
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      style={{ width: thickness }}
      className={cn(
        'flex shrink-0 flex-col justify-center gap-0 self-stretch overflow-hidden rounded-full shadow-sm transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] dark:ring-1 dark:ring-white/15',
        'group-data-[collapsible=icon]:gap-1 group-data-[collapsible=icon]:overflow-visible group-data-[collapsible=icon]:shadow-none group-data-[collapsible=icon]:dark:ring-0',
        className
      )}
    >
      {getFlagColors(countryCode).map((color, index) => (
        <span
          key={index}
          style={{
            backgroundColor: color,
            minHeight: thickness,
            animationDelay: `${index * 70}ms`,
          }}
          className={cn(
            'w-full flex-1 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
            'group-data-[collapsible=icon]:grow-0 group-data-[collapsible=icon]:animate-[flag-dot-pop_550ms_cubic-bezier(0.34,1.56,0.64,1)_both] group-data-[collapsible=icon]:rounded-full',
            isDarkColor(color) &&
              'group-data-[collapsible=icon]:dark:ring-1 group-data-[collapsible=icon]:dark:ring-white/30'
          )}
        />
      ))}
    </span>
  )
}

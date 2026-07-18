import { cn } from '../lib/utils'

interface LogoProps {
  className?: string
}

/**
 * Shared branding logo component.
 */
export function Logo({ className }: LogoProps) {
  return (
    <span className={cn('font-black', className)}>
      87<span className="text-[var(--palette-secondary)]">6</span>
    </span>
  )
}

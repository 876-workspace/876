import { cn } from '../lib/utils'
import { Loader2Icon } from '../icons'

function Spinner({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-flex size-4 animate-spin', className)}
      {...props}
    >
      <Loader2Icon aria-hidden="true" className="size-4" />
    </span>
  )
}

export { Spinner }

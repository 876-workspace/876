import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../lib/utils'

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-blue-700 text-white hover:bg-blue-800 focus-visible:border-blue-600/60 focus-visible:ring-blue-600/25 dark:bg-blue-900 dark:text-blue-50 dark:hover:bg-blue-800 dark:focus-visible:border-blue-700/60 dark:focus-visible:ring-blue-700/25',
        brand:
          'border-transparent bg-blue-700 bg-[image:linear-gradient(180deg,oklch(1_0_0/0.09),transparent_55%)] text-white shadow-[0_1px_2px_oklch(0_0_0/0.25)] hover:bg-blue-800 dark:bg-blue-900 dark:text-blue-50 dark:shadow-[0_1px_2px_oklch(0_0_0/0.45)] dark:hover:bg-blue-800',
        outline:
          'border-border-strong bg-background shadow-xs hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:bg-input/30 dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        ghost:
          'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40',
        info: 'bg-blue-700 text-white hover:bg-blue-800 focus-visible:border-blue-600/60 focus-visible:ring-blue-600/25 dark:bg-blue-900 dark:text-blue-50 dark:hover:bg-blue-800 dark:focus-visible:border-blue-700/60 dark:focus-visible:ring-blue-700/25',
        success:
          'bg-blue-700 text-white hover:bg-blue-800 focus-visible:border-blue-600/60 focus-visible:ring-blue-600/25 dark:bg-blue-900 dark:text-blue-50 dark:hover:bg-blue-800 dark:focus-visible:border-blue-700/60 dark:focus-visible:ring-blue-700/25',
        warning:
          'bg-warning text-warning-foreground hover:bg-warning/85 focus-visible:border-warning/60 focus-visible:ring-warning/30',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default:
          'h-9 gap-1.5 px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),8px)] px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1 rounded-[min(var(--radius-md),10px)] px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5',
        lg: 'h-10 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        icon: 'size-9',
        'icon-xs':
          "size-6 rounded-[min(var(--radius-md),8px)] in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          'size-8 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-md',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

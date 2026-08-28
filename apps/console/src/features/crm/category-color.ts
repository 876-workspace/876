const CATEGORY_COLOR_CLASSES: Record<string, string> = {
  blue: 'text-blue-600 dark:text-blue-400',
  violet: 'text-violet-600 dark:text-violet-400',
  amber: 'text-amber-600 dark:text-amber-400',
  rose: 'text-rose-600 dark:text-rose-400',
  cyan: 'text-cyan-600 dark:text-cyan-400',
  slate: 'text-slate-600 dark:text-slate-400',
}

export function categoryColorClass(color: string | null | undefined): string {
  return CATEGORY_COLOR_CLASSES[color ?? ''] ?? 'text-muted-foreground'
}

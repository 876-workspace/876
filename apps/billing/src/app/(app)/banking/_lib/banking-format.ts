export function formatAccountType(value: string): string {
  return value.toLowerCase().replaceAll('_', ' ')
}

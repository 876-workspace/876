export type CsvExportLinkProps = {
  href: string
  download?: string
  label?: string
  className?: string
}

export function CsvExportLink({
  href,
  download = '',
  label = 'Export CSV',
  className = 'text-sm font-medium underline underline-offset-4',
}: CsvExportLinkProps) {
  return (
    <a className={className} href={href} download={download}>
      {label}
    </a>
  )
}

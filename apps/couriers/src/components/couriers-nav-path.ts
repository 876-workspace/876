export function isActiveCouriersPath(pathname: string, href: string): boolean {
  if (href === '#') return false
  if (/^\/org\/[^/]+$/.test(href)) return pathname === href

  return pathname === href || pathname.startsWith(`${href}/`)
}

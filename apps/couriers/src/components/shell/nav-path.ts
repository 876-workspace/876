export function isActivePath(pathname: string, href: string): boolean {
  if (href === '#') return false
  if (/^\/[^/]+$/.test(href)) return pathname === href

  return pathname === href || pathname.startsWith(`${href}/`)
}

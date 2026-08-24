export const HOST_TEMPLATE_ENV: string
export const TUNNEL_DOMAIN_ENV: string
export const PORT_PLACEHOLDER: string

export function resolveHostTemplate(): string | null
export function previewOrigin(port: number, template: string | null): string
export function tunnelOrigin(service: string, domain: string): string
export function devResourceHosts(): string[]

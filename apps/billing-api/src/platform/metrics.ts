type Labels = Record<string, string>

const requests = new Map<string, number>()
let writerRejections = 0

function key(labels: Labels): string {
  return Object.entries(labels)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}="${value.replaceAll('"', '\\"')}"`)
    .join(',')
}

export function recordRequest(labels: Labels): void {
  const labelKey = key(labels)
  requests.set(labelKey, (requests.get(labelKey) ?? 0) + 1)
}

export function recordWriterRejection(): void {
  writerRejections += 1
}

export function metricsText(environment: string, writer: string): string {
  const lines = [
    '# TYPE billing_api_info gauge',
    `billing_api_info{environment="${environment}",writer="${writer}"} 1`,
    '# TYPE billing_api_writer_rejections_total counter',
    `billing_api_writer_rejections_total ${writerRejections}`,
    '# TYPE billing_api_http_requests_total counter',
  ]
  for (const [labels, count] of [...requests].sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    lines.push(`billing_api_http_requests_total{${labels}} ${count}`)
  }
  return `${lines.join('\n')}\n`
}

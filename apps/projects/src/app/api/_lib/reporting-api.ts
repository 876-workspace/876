/**
 * HTTP answers for the reporting and planning routes (reports, capacity).
 *
 * The Projects service returns `{ data, error }` values whose codes are stable,
 * so the mapping lives in one place rather than being restated per route — a
 * code the module grows later degrades to 400 rather than to a wrong specific.
 */
import { apiJson } from '@876/core/api'
import { z } from 'zod'

const STATUS_BY_CODE: Readonly<Record<string, number>> = {
  'projects/tenant-not-found': 404,
  'projects/project-not-found': 404,
  'projects/capacity-not-found': 404,
  'projects/capacity-overlap': 409,
  'projects/invalid-period': 422,
  'projects/invalid-request': 422,
  'projects/not-configured': 503,
}

function reportErrorStatus(code: string): number {
  return STATUS_BY_CODE[code] ?? 400
}

/** A service failure, answering with the message the service produced. */
export function serviceFailure(
  error: { code: string; message: string } | null,
  fallbackMessage: string
): Response {
  return apiJson(
    { error: error?.message ?? fallbackMessage },
    { status: error === null ? 400 : reportErrorStatus(error.code) }
  )
}

/** Streams a report the service rendered as CSV, as a download. */
export function csvDownload(body: string, filename: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  })
}

export const unixSecondsSchema = z.coerce.number().int().nonnegative()
export const reportFormatSchema = z.enum(['json', 'csv'])
export const timeReportGroupSchema = z.enum(['project', 'user', 'issue'])

/** The query string as a plain object, for route-local validation. */
export function searchParamsOf(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url).searchParams)
}

import { z } from 'zod'

export const IdSchema = z.string().trim().min(1).max(191)

export const countryCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{2}$/, 'Use a two-letter country code.')
  .transform((value) => value.toUpperCase())

export const optionalTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(2000)
  .nullable()
  .optional()

export const optionalShortTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .nullable()
  .optional()

export const unixTimestampSchema = z.number().int().nonnegative()

/** Badge variants a status may map to. Mirrors `@876/ui/badge`'s variants. */
export type StatusVariant =
  | 'secondary'
  | 'success'
  | 'info'
  | 'warning'
  | 'destructive'

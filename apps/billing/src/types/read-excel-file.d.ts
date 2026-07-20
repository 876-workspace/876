/**
 * Minimal ambient types for `read-excel-file`. The package ships types under
 * per-environment export conditions that TypeScript's `bundler` resolution does
 * not surface for the bare specifier; this declares only the default browser
 * entry we use (parsing a File/Blob into a row/column matrix).
 */
declare module 'read-excel-file' {
  type Cell = string | number | boolean | Date | null
  export default function readXlsxFile(input: File | Blob): Promise<Cell[][]>
}

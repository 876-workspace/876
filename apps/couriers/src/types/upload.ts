/** Outcome of a direct-to-provider upload, narrowed to what callers read. */
export interface DirectUploadResult {
  /** Whether the provider answered with a 2xx status. */
  ok: boolean
  /** HTTP status returned by the storage provider. */
  status: number
  /** Raw response body; providers answer failures with an XML error document. */
  body: string
}

/** Parameters for a signed, direct-to-provider file upload. */
export interface DirectUploadParams {
  /** Short-lived signed provider URL. */
  url: string
  /** HTTP method the signature was issued for. */
  method: string
  /** Exact signed headers that must be replayed. */
  headers: Record<string, string>
  /** Bytes being uploaded. */
  file: File
  /** Receives the completed fraction between 0 and 1 as bytes are sent. */
  onProgress?: (fraction: number) => void
}

/** Lifecycle of an in-flight upload, in the order the phases occur. */
export type UploadPhase =
  | 'idle'
  | 'starting'
  | 'uploading'
  | 'verifying'
  | 'done'

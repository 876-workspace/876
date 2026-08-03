export type UploadPhase =
  | 'idle'
  | 'starting'
  | 'uploading'
  | 'verifying'
  | 'done'

export type DirectUploadParams = {
  url: string
  method: 'PUT'
  headers: Record<string, string>
  file: File
  onProgress?: (fraction: number) => void
}

export type DirectUploadResult = {
  ok: boolean
  status: number
  body: string
}

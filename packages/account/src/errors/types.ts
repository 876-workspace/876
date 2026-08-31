export type SdkErrorDef = {
  message: string
}

export type SdkError<TCode extends string = string> = {
  code: TCode
  message: string
}

export type SdkErrorOptions = {
  message?: string
}

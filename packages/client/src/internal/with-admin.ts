export type WithAdmin<
  TResource extends object,
  TAdmin extends object,
> = TResource & { admin: TAdmin }

export function withAdmin<TResource extends object, TAdmin extends object>(
  resource: TResource,
  admin: TAdmin
): WithAdmin<TResource, TAdmin> {
  return {
    ...resource,
    admin,
  }
}

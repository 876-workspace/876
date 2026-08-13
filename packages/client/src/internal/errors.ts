export class MissingCapabilityError extends Error {
  constructor(resource: string) {
    super(`$876.${resource} requires a configured owning service tier`)
    this.name = 'MissingCapabilityError'
  }
}

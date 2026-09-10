export interface AppModuleDefinition {
  readonly key: string
  readonly label: string
  readonly description: string
}

export interface AppModuleRegistry<
  TApp extends string = string,
  TModules extends readonly AppModuleDefinition[] =
    readonly AppModuleDefinition[],
> {
  readonly app: TApp
  readonly modules: TModules
}

export type AppModuleKey<TRegistry extends AppModuleRegistry> =
  TRegistry['modules'][number]['key']

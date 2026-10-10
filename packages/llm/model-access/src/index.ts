/** Profile-owned model allowlist, shared by catalogs and every LLM request. */
import { Context, Service, type Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-llm'
import type {} from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-config-editor'
import type {} from '@deepseek-ai/dsh-subagent'
import { LlmError } from '@deepseek-ai/dsh-llm'

/** Disabling a provider retains its individual model choices. */
export interface ProviderAccess {
  /** Whether this route may dispatch requests without changing its saved model choices. */
  readonly enabled: boolean
  /** Explicit allowed model IDs; an empty array disables every model. */
  readonly models: readonly string[]
}

/** Explicit empty selections are distinct from a profile awaiting migration. */
export interface Config {
  /** Whether the initial existing-catalog migration has been committed. */
  initialized: Volatile<boolean>
  /** Profile-owned provider switches and allowed model IDs. Missing routes are disabled. */
  providers: Volatile<Record<string, ProviderAccess>>
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    modelAccess: ModelAccess
  }
}

/** No provider credentials are read or changed by this service. */
export class ModelAccess extends Service {
  static inject = ['llm']
  static Config = z.object({
    initialized: z.boolean().default(false).volatile(),
    providers: z.dict(z.object({
      enabled: z.boolean().default(true),
      models: z.array(z.string().min(1)).default([]),
    })).default({}).volatile(),
  })

  private initialization: Promise<void> | undefined
  private ephemeral: Record<string, ProviderAccess> | undefined

  constructor(private readonly ownerContext: Context, private readonly config: Config) {
    super(ownerContext, 'modelAccess')
    ownerContext.inject(['settings'], (child) => {
      child.effect(() => child.settings.configure({ auto: false }, ownerContext.fiber))
    })
    ownerContext.llm.registerModelAccess(this)
    ownerContext.on('subagent/pre-start', (provider) => {
      if (provider.modelRouting !== 'host') {
        throw new LlmError('This delegation backend cannot enforce the enabled model settings.', 'MODEL_ACCESS_UNSUPPORTED')
      }
    })
  }

  /** Capture the pre-existing catalog once, before applying the new policy. */
  private async initialize(): Promise<void> {
    if (this.config.initialized.get() || this.ephemeral !== undefined) return
    if (this.initialization !== undefined) return this.initialization
    const pending = this.initializeOnce()
    this.initialization = pending
    try { await pending }
    finally { this.initialization = undefined }
  }

  private async initializeOnce(): Promise<void> {
    const providers = this.ownerContext.llm.listProviders()
    const rows: readonly (readonly [string, ProviderAccess])[] = await Promise.all(providers.map(provider =>
      this.ownerContext.llm.listModelCandidates(provider.id).then(
        catalog => [provider.id, {
          enabled: true, models: catalog.filter(model => model.initiallyEnabled !== false).map(model => model.id),
        }] as const,
        () => [provider.id, { enabled: false, models: [] }] as const,
      )))
    const seed: Record<string, ProviderAccess> = { ...Object.fromEntries(rows), ...this.config.providers.get() }
    if (this.config.initialized.get()) return
    const settings = this.ownerContext.get('settings')
    const ns = this.ownerContext.fiber.entry?.options.id
    if (settings === undefined || ns === undefined) {
      // Standalone SDK compositions have no profile editor; their boot config
      // can supply an explicit allowlist, otherwise the first catalog is held.
      this.ephemeral = seed
      return
    }
    const view = settings.describe().find(row => row.ns === ns)
    if (view === undefined) throw new Error('Model settings are not available for this profile')
    await settings.mutate(ns, [
      { op: 'set', path: ['providers'], value: seed },
      { op: 'set', path: ['initialized'], value: true },
    ], view.revision)
  }

  /** Read the latest provider switch and preserved model choices on each call.
   * @param provider - registered LLM route identity.
   * @returns the detached allowed model IDs, or an empty set for a disabled route.
   */
  async allowed(provider: string): Promise<ReadonlySet<string>> {
    await this.initialize()
    const access = this.access(provider)
    return new Set(access?.enabled === true ? access.models : [])
  }

  private access(provider: string): ProviderAccess | undefined {
    const providers = this.config.initialized.get() ? this.config.providers.get() : this.ephemeral
    return providers !== undefined && Object.hasOwn(providers, provider) ? providers[provider] : undefined
  }

  /** Re-read live configuration in the same synchronous section as dispatch.
   * @param provider - registered LLM route identity.
   * @param model - exact model ID to dispatch.
   * @returns whether this provider and model are currently enabled.
   */
  isEnabled(provider: string, model: string): boolean {
    const access = this.access(provider)
    return access?.enabled === true && access.models.includes(model)
  }
}

export default ModelAccess

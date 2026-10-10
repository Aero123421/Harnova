/** One private login attempt owned by the Settings window. No browser persistence. */
import type { Context } from '@deepseek-ai/cordis'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { ProviderAuthorizationFrame } from '@deepseek-ai/dsh-api-remotes/client'
import type { ProviderRow, ModelsSettingsStore } from './store.ts'

export interface LoginSnapshot {
  provider: string | null
  phase: 'waiting' | 'authorized' | 'cancelled' | 'failed'
  notice: Extract<ProviderAuthorizationFrame, { type: 'notice' }> | null
  prompt: Extract<ProviderAuthorizationFrame, { type: 'prompt' }> | null
}

/** Private frames cannot be observed or answered by a different tab's attempt. */
export class ModelsLoginStore {
  readonly store = createSnapshotStore<LoginSnapshot>({ provider: null, phase: 'waiting', notice: null, prompt: null })
  private stream: ReturnType<Context['remote']['authorization']['login']> | undefined
  private generation = 0

  constructor(private readonly ctx: Context, private readonly models: ModelsSettingsStore) {}

  async begin(row: ProviderRow, method: string): Promise<void> {
    this.close()
    const key = row.authorization?.key
    if (key === undefined) return
    const separator = key.indexOf('/')
    if (separator < 1) return
    const generation = ++this.generation
    this.store.update((s) => { s.provider = row.entry.displayName; s.phase = 'waiting'; s.notice = null; s.prompt = null })
    const stream = this.ctx.remote.authorization.login(key.slice(0, separator), key.slice(separator + 1), method)
    this.stream = stream
    let settled = false
    try {
      for await (const frame of stream) {
        if (generation !== this.generation) return
        if (frame.type === 'result') settled = true
        this.store.update((s) => {
          if (frame.type === 'notice') s.notice = frame.url !== undefined || frame.code !== undefined ? frame : { ...s.notice, ...frame }
          if (frame.type === 'prompt') s.prompt = frame
          if (frame.type === 'withdraw' && s.prompt?.id === frame.id) s.prompt = null
          if (frame.type === 'result') { s.phase = frame.status; s.prompt = null; s.notice = null }
        })
        if (frame.type === 'result' && frame.status === 'authorized') {
          if (!row.configured) {
            const result = await this.ctx.remote.settings.mutate(row.entry.settingsNs, [
              { op: 'set', path: [...row.entry.settingsPath], value: {} },
            ], this.models.store.getSnapshot().namespaces.get(row.entry.settingsNs)?.revision)
            if (!result.ok && generation === this.generation) this.store.update((s) => { s.phase = 'failed' })
          }
          await this.models.load()
        }
      }
      if (!settled && generation === this.generation) this.store.update((s) => { s.phase = 'failed'; s.prompt = null; s.notice = null })
    } catch {
      if (generation === this.generation) this.store.update((s) => { s.phase = 'failed'; s.prompt = null; s.notice = null })
    } finally {
      stream.dispose()
      if (this.stream === stream) this.stream = undefined
    }
  }

  answer(id: number, value: string): void {
    if (this.store.getSnapshot().prompt?.id !== id) return
    try {
      this.stream?.send({ id, value })
      this.store.update((s) => { s.prompt = null })
    } catch {
      this.stream?.dispose()
      this.store.update((s) => { s.phase = 'failed'; s.prompt = null; s.notice = null })
    }
  }

  close(): void {
    this.generation++
    this.stream?.dispose()
    this.stream = undefined
    this.store.update((s) => { s.provider = null; s.prompt = null; s.notice = null })
  }
}

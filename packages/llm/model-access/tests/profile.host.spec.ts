/** The actual Loader entry persists choices and leaves credentials alone. */
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { expect, it, onTestFinished, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Timer from '@deepseek-ai/cordis-plugin-timer'
import { boot, initProfile, readProfilePatches, type ProfileContext } from '@deepseek-ai/dsh-app-boot'
import ConfigEditor from '@deepseek-ai/dsh-config-editor'
import Hmr from '@deepseek-ai/dsh-hmr'
import Settings from '@deepseek-ai/dsh-settings'
import LlmRuntime, { LlmAdapter, type GenerateOptions, type StreamChunk } from '@deepseek-ai/dsh-llm'
import { credentialKey } from '@deepseek-ai/dsh-credentials'
import { MemoryCredentials } from '../../../credentials/credentials/tests/memory.ts'
import Subagents from '@deepseek-ai/dsh-subagent'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import ModelAccess from '../src/index.ts'
import { liveConfig } from '../../../settings/settings/tests/live-config.ts'

class Adapter extends LlmAdapter {
  override async listModels() {
    return [
      { provider: 'test', id: 'original', name: 'Original' },
      { provider: 'test', id: 'new', name: 'New', initiallyEnabled: false },
    ]
  }
  async *stream(_request: GenerateOptions): AsyncIterable<StreamChunk> {
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

async function fixture(active = true, adapterFactory: () => LlmAdapter = () => new Adapter()) {
  const home = realpathSync(mkdtempSync(join(tmpdir(), 'harnova-model-access-')))
  onTestFinished(() => { rmSync(home, { recursive: true, force: true }) })
  const dir = join(home, 'profiles', 'test')
  initProfile(dir, ['test-bundle'])
  const bundle = join(dir, 'node_modules', 'test-bundle')
  mkdirSync(bundle, { recursive: true })
  writeFileSync(join(home, 'package.json'), '{"name":"test-installation"}\n')
  writeFileSync(join(bundle, 'package.json'), JSON.stringify({ name: 'test-bundle', version: '1.0.0', dsh: { bundle: { patch: 'cordis.patch.yml' } } }))
  writeFileSync(join(bundle, 'cordis.patch.yml'), JSON.stringify([{ insert: [
    { id: 'config-editor', name: 'cordis:editor' },
    { id: 'settings', name: 'cordis:settings' },
    { id: 'llm', name: 'cordis:llm' },
    { id: 'model-access', name: 'cordis:access' },
    ...active ? [{ id: 'adapter', name: 'cordis:adapter' }] : [],
  ] }]))
  writeFileSync(join(dir, 'cordis.yml'), '[]\n')
  const profile: ProfileContext = {
    name: 'test', startedBundles: ['test-bundle'], dir, patchPath: join(dir, 'cordis.patch.yml'),
    installAnchor: join(home, 'package.json'), cwd: home, home, overlays: [], telemetryDisabledEnv: undefined,
  }
  const start = async (): Promise<Context> => {
    const ctx = await boot('test', join(dir, 'cordis.yml'), readProfilePatches('test', profile), (ctx) => {
      ctx.provide('profileContext', profile)
      ctx.provide('appReady', { onReady: (listener: () => void) => { listener(); return () => {} } })
      Object.assign(ctx.loader.builtins, {
        editor: ConfigEditor, settings: Settings, llm: LlmRuntime, access: ModelAccess,
        adapter: { inject: ['llm'], apply(child: Context) { child.llm.registerAdapter(['test'], adapterFactory()) } },
      })
    })
    onTestFinished(() => ctx.fiber.dispose())
    await ctx.plugin(Timer)
    await ctx.plugin(Hmr, { root: [], ignored: [], debounce: 0 })
    await ctx.hmr.runExclusive(async () => {})
    return ctx
  }
  return { ctx: await start(), start }
}

function gatedAdapter() {
  const entered = Promise.withResolvers<undefined>()
  const catalog = Promise.withResolvers<Awaited<ReturnType<Adapter['listModels']>>>()
  let calls = 0
  class WaitingAdapter extends Adapter {
    override listModels() {
      calls++
      entered.resolve(undefined)
      return catalog.promise
    }
  }
  return { adapter: new WaitingAdapter(), entered: entered.promise, catalog, calls: () => calls }
}

it('migrates once, persists explicit all-OFF across restart, and restores saved choices', async () => {
  const { ctx, start } = await fixture()
  await ctx.plugin(MemoryCredentials)
  const key = credentialKey('llm-pi-ai', 'openai-codex')
  await ctx.credentials.modifyRecord(key, async () => ({ kind: 'grant', payload: { access: 'test-token' } }))
  expect((await ctx.llm.listModels('test')).map(model => model.id)).toEqual(['original'])
  let view = ctx.settings.describe().find(row => row.ns === 'model-access')!
  expect(view.value).toEqual({ initialized: true, providers: { test: { enabled: true, models: ['original'] } } })
  await ctx.settings.mutate(view.ns, [{ op: 'set', path: ['providers', 'test'], value: { enabled: false, models: ['original'] } }], view.revision)
  expect(await ctx.llm.listModels('test')).toEqual([])
  expect((await ctx.credentials.describeRecord(key)).configured).toBe(true)
  await expect(ctx.llm.prepareCall({ provider: 'test', model: 'original' })).rejects.toMatchObject({ code: 'MODEL_DISABLED' })
  await ctx.fiber.dispose()
  const restarted = await start()
  expect(await restarted.llm.listModels('test')).toEqual([])
  view = restarted.settings.describe().find(row => row.ns === 'model-access')!
  await restarted.settings.mutate(view.ns, [{ op: 'set', path: ['providers', 'test', 'enabled'], value: true }], view.revision)
  expect((await restarted.llm.listModels('test')).map(model => model.id)).toEqual(['original'])
  view = restarted.settings.describe().find(row => row.ns === 'model-access')!
  await restarted.settings.mutate(view.ns, [{ op: 'set', path: ['providers', 'test', 'models'], value: [] }], view.revision)
  await restarted.fiber.dispose()
  expect(await (await start()).llm.listModels('test')).toEqual([])
})

it('blocks delegation backends without host routing and releases the guard on unload', async () => {
  const { ctx } = await fixture()
  const external = { name: 'external', capabilities: { agentOptions: false, outputSchema: false, depthLimit: false, toolFilter: false, persona: false }, inheritsParentContext: false, start: async () => { throw new Error('provider started') } }
  await ctx.plugin(Subagents)
  await ctx.plugin({ inject: ['subagents'], apply(child) { child.subagents.registerProvider(external) } })
  const id = SessionId('delegation-parent')
  const parent = { id, options: {}, session: Session.create(id) } as Agent
  await expect(ctx.subagents.start('external', { parent, signal: new AbortController().signal, prompt: [{ type: 'text', text: 'test' }] })).rejects.toMatchObject({ code: 'MODEL_ACCESS_UNSUPPORTED' })
  await expect(ctx.serial('subagent/pre-start', external)).rejects.toMatchObject({ code: 'MODEL_ACCESS_UNSUPPORTED' })
  await expect(ctx.serial('subagent/pre-start', { ...external, modelRouting: 'host' })).resolves.toBeUndefined()
  await [...ctx.loader.entries()].find(entry => entry.options.id === 'model-access')!.fiber!.dispose()
  await expect(ctx.serial('subagent/pre-start', external)).resolves.toBeUndefined()
})

it('initializes an empty profile before the first connection, leaving new models OFF', async () => {
  const { ctx } = await fixture(false)
  expect(await ctx.llm.remoteConfigurableProviders()).toEqual([])
  expect(ctx.settings.describe().find(row => row.ns === 'model-access')?.value)
    .toEqual({ initialized: true, providers: {} })
  await ctx.plugin({ inject: ['llm'], apply(child) { child.llm.registerAdapter(['test'], new Adapter()) } })
  expect(await ctx.llm.listModels('test')).toEqual([])
  expect((await ctx.llm.listModelCandidates('test')).map(model => model.id)).toEqual(['original', 'new'])
})

it('shares one catalog migration across concurrent consumers', async () => {
  const gate = gatedAdapter()
  const { ctx } = await fixture(true, () => gate.adapter)
  const first = ctx.modelAccess.allowed('test')
  const second = ctx.modelAccess.allowed('test')
  try {
    await gate.entered
    expect(gate.calls()).toBe(1)
    expect(ctx.modelAccess.isEnabled('test', 'original')).toBe(false)
    gate.catalog.resolve(await new Adapter().listModels())

    expect(await Promise.all([first, second])).toEqual([new Set(['original']), new Set(['original'])])
    expect(ctx.settings.describe().find(row => row.ns === 'model-access')?.value)
      .toEqual({ initialized: true, providers: { test: { enabled: true, models: ['original'] } } })
  } finally {
    gate.catalog.resolve([])
    await Promise.allSettled([first, second])
  }
})

it('keeps an explicit selection committed while its initial catalog request was pending', async () => {
  const gate = gatedAdapter()
  const { ctx } = await fixture(true, () => gate.adapter)
  const pending = ctx.modelAccess.allowed('test')
  try {
    await gate.entered
    const view = ctx.settings.describe().find(row => row.ns === 'model-access')!
    await ctx.settings.mutate(view.ns, [
      { op: 'set', path: ['providers', 'test'], value: { enabled: true, models: ['new'] } },
      { op: 'set', path: ['initialized'], value: true },
    ], view.revision)
    const mutate = vi.spyOn(ctx.settings, 'mutate')
    try {
      gate.catalog.resolve(await new Adapter().listModels())
      expect(await pending).toEqual(new Set(['new']))
      expect(mutate).not.toHaveBeenCalled()
      expect(ctx.modelAccess.isEnabled('test', 'original')).toBe(false)
      expect(ctx.modelAccess.isEnabled('test', 'new')).toBe(true)
    } finally { mutate.mockRestore() }
  } finally {
    gate.catalog.resolve([])
    await Promise.allSettled([pending])
  }
})

it('preserves the winning settings edit after migration loses a compare-and-swap race', async () => {
  const { ctx } = await fixture()
  const commit = ctx.settings.mutate.bind(ctx.settings)
  const mutate = vi.spyOn(ctx.settings, 'mutate').mockImplementationOnce(async (ns, ops, revision) => {
    await commit(ns, [
      { op: 'set', path: ['providers', 'test'], value: { enabled: true, models: ['new'] } },
      { op: 'set', path: ['initialized'], value: true },
    ], revision)
    await commit(ns, ops, revision)
  })
  try {
    await expect(ctx.modelAccess.allowed('test')).rejects.toMatchObject({ code: 'SETTINGS_CONFLICT' })
    expect(await ctx.modelAccess.allowed('test')).toEqual(new Set(['new']))
    expect(ctx.settings.describe().find(row => row.ns === 'model-access')?.value)
      .toEqual({ initialized: true, providers: { test: { enabled: true, models: ['new'] } } })
  } finally { mutate.mockRestore() }
})

it('disables a failed catalog without preventing the profile migration', async () => {
  class BrokenAdapter extends Adapter {
    override async listModels(): Promise<never> { throw new Error('catalog unavailable') }
  }
  const { ctx } = await fixture(true, () => new BrokenAdapter())

  expect(await ctx.modelAccess.allowed('test')).toEqual(new Set())
  expect(ctx.settings.describe().find(row => row.ns === 'model-access')?.value)
    .toEqual({ initialized: true, providers: { test: { enabled: false, models: [] } } })
  expect(ctx.modelAccess.isEnabled('test', 'original')).toBe(false)
})

it('refuses a missing profile form and permits initialization after it becomes available', async () => {
  const { ctx } = await fixture()
  const describe = vi.spyOn(ctx.settings, 'describe').mockReturnValue([])
  try {
    await expect(ctx.modelAccess.allowed('test')).rejects.toThrow('Model settings are not available for this profile')
  } finally { describe.mockRestore() }

  expect(await ctx.modelAccess.allowed('test')).toEqual(new Set(['original']))
})

it('holds the first catalog in a standalone Loader composition without settings', async () => {
  const ctx = new Context()
  onTestFinished(() => ctx.fiber.dispose())
  await ctx.plugin(LlmRuntime)
  ctx.llm.registerAdapter(['test'], new Adapter())
  await liveConfig(ctx, ModelAccess)

  expect(await ctx.modelAccess.allowed('test')).toEqual(new Set(['original']))
  ctx.llm.registerAdapter(['late'], new Adapter())
  expect(await ctx.modelAccess.allowed('late')).toEqual(new Set())
  expect(ctx.modelAccess.isEnabled('test', 'new')).toBe(false)
})

it('honors explicit OFF choices without a Loader namespace even when settings is mounted', async () => {
  const { ctx } = await fixture()
  await [...ctx.loader.entries()].find(entry => entry.options.id === 'model-access')!.fiber!.dispose()
  await ctx.plugin(ModelAccess, { providers: { test: { enabled: false, models: ['original'] } } })

  expect(await ctx.modelAccess.allowed('test')).toEqual(new Set())
  expect(await ctx.modelAccess.allowed('test')).toEqual(new Set())
  expect(ctx.modelAccess.isEnabled('test', 'original')).toBe(false)
})

it('recognizes own provider keys without inheriting routes from Object.prototype', async () => {
  const ctx = new Context()
  onTestFinished(() => ctx.fiber.dispose())
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(ModelAccess, { initialized: true, providers: { constructor: { enabled: true, models: ['original'] } } })

  expect(await ctx.modelAccess.allowed('constructor')).toEqual(new Set(['original']))
  expect(ctx.modelAccess.isEnabled('constructor', 'original')).toBe(true)
  expect(await ctx.modelAccess.allowed('__proto__')).toEqual(new Set())
  expect(ctx.modelAccess.isEnabled('toString', 'original')).toBe(false)
})

import { describe, expect, it, onTestFinished } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import LlmRuntime, { LlmAdapter, type GenerateOptions, type StreamChunk } from '../src/index.ts'

/** Records actual dispatch, including calls made directly by auxiliary consumers. */
class ProbeAdapter extends LlmAdapter {
  calls = 0
  override async listModels() { return ['one', 'two'].map(id => ({ provider: 'test', id, name: id })) }
  async *stream(_options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.calls++
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

async function setup() {
  const ctx = new Context()
  onTestFinished(() => ctx.fiber.dispose())
  await ctx.plugin(LlmRuntime)
  const adapter = new ProbeAdapter()
  ctx.llm.registerAdapter(['test'], adapter)
  let enabled = new Set(['one'])
  const policy = ctx.plugin({ inject: ['llm'], apply(child) {
    child.llm.registerModelAccess({ allowed: async () => enabled, isEnabled: (_provider, model) => enabled.has(model) })
  } })
  await policy.await()
  return { ctx, adapter, policy, disable: () => { enabled = new Set() } }
}

async function collect(stream: AsyncIterable<StreamChunk>) {
  const chunks: StreamChunk[] = []
  for await (const chunk of stream) chunks.push(chunk)
  return chunks
}

describe('live model access at the LLM executor', () => {
  it('filters selection catalogs while retaining full Settings candidates', async () => {
    const { ctx } = await setup()
    expect((await ctx.llm.listModels('test')).map(model => model.id)).toEqual(['one'])
    expect((await ctx.llm.listModelCandidates('test')).map(model => model.id)).toEqual(['one', 'two'])
  })

  it('rejects disabled models through preparation, resolution and direct auxiliary streams', async () => {
    const { ctx, adapter } = await setup()
    const config = { provider: 'test', model: 'two' }
    await expect(ctx.llm.prepareCall(config)).rejects.toMatchObject({ code: 'MODEL_DISABLED' })
    await expect(ctx.llm.resolveCallConfig(config)).rejects.toMatchObject({ code: 'MODEL_DISABLED' })
    expect(await collect(ctx.llm.stream({ ...config, messages: [], purpose: 'compaction' })))
      .toMatchObject([{ type: 'finish', reason: { kind: 'error', failure: { code: 'MODEL_DISABLED' } } }])
    expect(adapter.calls).toBe(0)
  })

  it('rechecks a prepared call after the user switches its provider OFF', async () => {
    const { ctx, adapter, disable } = await setup()
    const call = await ctx.llm.prepareCall({ provider: 'test', model: 'one' })
    disable()
    expect(await collect(call.stream({ ...call.config, messages: [] })))
      .toMatchObject([{ type: 'finish', reason: { kind: 'error', failure: { code: 'MODEL_DISABLED' } } }])
    expect(adapter.calls).toBe(0)
  })

  it('blocks middleware shortcuts too and releases the policy on disposal', async () => {
    const { ctx, adapter, policy, disable } = await setup()
    disable()
    let entered = false
    const middleware = ctx.on('llm/stream', (_options, next) => { entered = true; return next() })
    await collect(ctx.llm.stream({ provider: 'test', model: 'one', messages: [] }))
    expect(entered).toBe(false)
    expect(adapter.calls).toBe(0)
    await policy.dispose()
    await collect(ctx.llm.stream({ provider: 'test', model: 'one', messages: [] }))
    expect(entered).toBe(true)
    expect(adapter.calls).toBe(1)
    middleware()
  })
})

import { expect, it, vi } from 'vitest'
import { ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import { PiAiAdapter } from '../src/adapter.ts'
import { resolveProfiles } from '../src/config.ts'
import { memoryAuth } from './auth-double.ts'

it('sends the real service tier and preserves model, effort, prompt, and tools', async () => {
  const requests: Record<string, unknown>[] = []
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const body = typeof init?.body === 'string' ? init.body : input instanceof Request ? await input.text() : undefined
    if (body === undefined) throw new Error('missing request body')
    requests.push(JSON.parse(body) as Record<string, unknown>)
    return new Response(JSON.stringify({ error: { message: 'keyless fixture' } }), { status: 401, headers: { 'content-type': 'application/json' } })
  })
  vi.stubGlobal('fetch', fetch)
  try {
    const profiles = resolveProfiles({ openai: {} })
    const adapter = new PiAiAdapter({ profiles: () => profiles, resolveApiKey: async () => 'test-key', auth: memoryAuth() })
    expect((await adapter.resolveModel('openai', 'gpt-6.1-sol')).fastMode).toBe(true)
    for (const speed of ['fast', 'standard', undefined] as const) {
      for await (const _chunk of adapter.stream({ provider: 'openai', model: 'gpt-6.1-sol', messages: [], reasoningEffort: ReasoningEffortId('high'), ...speed === undefined ? {} : { speed } })) { /* Consume the fixture response. */ }
    }
    expect(requests).toHaveLength(3)
    expect(requests[0]?.['service_tier']).toBe('priority')
    expect(requests[0]?.['reasoning']).toMatchObject({ effort: 'high' })
    expect(requests[1]?.['service_tier']).toBe('default')
    expect(requests[2]).not.toHaveProperty('service_tier')
    const withoutTier = requests.map(({ service_tier: _tier, ...request }) => request)
    expect(withoutTier[0]).toEqual(withoutTier[1])
    expect(withoutTier[1]).toEqual(withoutTier[2])
  } finally { vi.unstubAllGlobals() }
})

it('does not advertise Fast for a custom endpoint or an unsupported model', async () => {
  const profiles = resolveProfiles({ openai: { baseURL: 'https://gateway.example/v1' }, deepseek: {} })
  const adapter = new PiAiAdapter({ profiles: () => profiles, resolveApiKey: async () => 'test-key', auth: memoryAuth() })
  expect((await adapter.resolveModel('openai', 'gpt-6.1-sol')).fastMode).toBeUndefined()
  await expect(adapter.stream({ provider: 'openai', model: 'gpt-6.1-sol', messages: [], speed: 'fast' })[Symbol.asyncIterator]().next())
    .rejects.toMatchObject({ code: 'UNSUPPORTED_SPEED' })
})

it('keeps full candidates while local authentication controls available models', async () => {
  const profiles = resolveProfiles({ 'openai-codex': {} })
  const auth = memoryAuth()
  const adapter = new PiAiAdapter({ profiles: () => profiles, resolveApiKey: async () => undefined, auth })
  expect((await adapter.listModels('openai-codex')).length).toBeGreaterThan(0)
  expect((await adapter.availableModelIds('openai-codex')).size).toBe(0)
  auth.stored.set('openai-codex', { type: 'oauth', access: 'fixture-access', refresh: 'fixture-refresh', expires: Date.now() + 60_000 })
  expect((await adapter.availableModelIds('openai-codex')).size).toBeGreaterThan(0)
})

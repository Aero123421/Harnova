import { expect, it, vi } from 'vitest'
import { getBuiltinModels } from '@earendil-works/pi-ai/providers/all'
import type { Api, Model } from '@earendil-works/pi-ai'
import { ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import { PiAiAdapter } from '../src/adapter.ts'
import { resolveProfiles } from '../src/config.ts'
import { supportsFastMode } from '../src/speed.ts'
import * as modelCollections from '../src/models.ts'
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

it.each([
  ['openai', 'openai-responses', 'https://api.openai.com/v1', true],
  ['openai-codex', 'openai-codex-responses', 'https://chatgpt.com/backend-api/codex', true],
  ['openai-codex', 'openai-codex-responses', 'https://api.openai.com/v1', false],
  ['deepseek', 'openai-responses', 'https://api.openai.com/v1', false],
  ['openai', 'openai-completions', 'https://api.openai.com/v1', false],
  ['openai', 'openai-responses', 'http://api.openai.com/v1', false],
  ['openai', 'openai-responses', 'https://gateway.example/v1', false],
] as const)('only advertises Fast for the supported protocol and official HTTPS route: %s / %s / %s', (provider, api, baseUrl, supported) => {
  const profile = resolveProfiles({ [provider]: {} }).get(provider)
  const base = getBuiltinModels('openai').find(model => model.id === 'gpt-6.1-sol')
  if (profile === undefined || base === undefined) throw new Error('missing configured fixture model')
  const model: Model<Api> = { ...base, api, baseUrl }

  expect(supportsFastMode(profile, model)).toBe(supported)
})

it('withholds Fast even when the explicitly overridden protocol matches the catalog', () => {
  const profile = resolveProfiles({ openai: { api: 'openai-responses' } }).get('openai')
  const model = profile?.piProvider?.getModels().find(model => model.id === 'gpt-6.1-sol')
  if (profile === undefined || model === undefined) throw new Error('missing configured fixture model')

  expect(supportsFastMode(profile, model)).toBe(false)
})

it.each([{ payload: null }, { payload: [] }, { payload: 'unexpected payload' }])('rejects a non-object Pi payload when speed is explicitly selected: $payload', async ({ payload }) => {
  const createModels = modelCollections.createModels
  const factory = vi.spyOn(modelCollections, 'createModels').mockImplementation((options) => {
    const collection = createModels(options)
    vi.spyOn(collection, 'streamSimple').mockImplementation((model, _context, streamOptions) => {
      void streamOptions?.onPayload?.(payload, model)
      throw new Error('invalid speed payload was accepted')
    })
    return collection
  })
  try {
    const profiles = resolveProfiles({ openai: {} })
    const adapter = new PiAiAdapter({ profiles: () => profiles, resolveApiKey: async () => 'test-key', auth: memoryAuth() })
    await expect(adapter.stream({ provider: 'openai', model: 'gpt-6.1-sol', messages: [], speed: 'fast' })[Symbol.asyncIterator]().next())
      .rejects.toMatchObject({ code: 'INVALID_REQUEST', message: 'Invalid request payload for speed selection' })
  } finally { factory.mockRestore() }
})

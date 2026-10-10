import type { ProviderAuthorizationFrame } from '@deepseek-ai/dsh-api-remotes/client'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { expect, it, onTestFinished, vi } from 'vitest'
import { ModelsLoginStore } from '../src/client/login-store.ts'
import type { ProviderRow } from '../src/client/store.ts'

class LoginStream implements AsyncIterable<ProviderAuthorizationFrame> {
  private readonly queue: Array<IteratorResult<ProviderAuthorizationFrame>> = []
  private nextFrame = Promise.withResolvers<IteratorResult<ProviderAuthorizationFrame>>()
  readonly send = vi.fn()
  readonly dispose = vi.fn()
  push(frame: ProviderAuthorizationFrame): void { this.publish({ done: false, value: frame }) }
  end(): void { this.publish({ done: true, value: undefined }) }
  private publish(frame: IteratorResult<ProviderAuthorizationFrame>): void { this.queue.push(frame); this.nextFrame.resolve(frame) }
  async *[Symbol.asyncIterator](): AsyncGenerator<ProviderAuthorizationFrame> {
    while (true) {
      if (this.queue.length === 0) await this.nextFrame.promise
      const frame = this.queue.shift()!
      this.nextFrame = Promise.withResolvers()
      if (frame.done) return
      yield frame.value
    }
  }
}

function fixture(configured = true, revision?: number) {
  const streams: LoginStream[] = []
  const login = vi.fn(() => {
    const stream = new LoginStream()
    streams.push(stream)
    return stream
  })
  const mutate = vi.fn(async () => ({ ok: true as boolean }))
  const models = {
    store: createSnapshotStore({ namespaces: new Map(revision === undefined ? [] : [['llm-pi-ai', { revision }]]) }),
    load: vi.fn(async () => {}),
  }
  const controller = new ModelsLoginStore({ remote: { authorization: { login }, settings: { mutate } } } as never, models as never)
  const row: ProviderRow = {
    authorization: { key: 'llm-pi-ai/openai-codex', label: 'ChatGPT', configured: false, inFlight: false, methods: [{ id: 'oauth', label: 'Login' }] },
    entry: { provider: 'openai-codex', displayName: 'ChatGPT', settingsNs: 'llm-pi-ai', settingsPath: ['providers', 'openai-codex'], active: true },
    configured, removable: true, apiKeyEnv: undefined, credential: undefined,
  }
  const pending: Promise<void>[] = []
  const begin = (target = row): LoginStream => {
    pending.push(controller.begin(target, 'oauth'))
    return streams.at(-1)!
  }
  onTestFinished(async () => {
    controller.close()
    for (const stream of streams) stream.end()
    await Promise.all(pending)
  })
  return { controller, row, streams, login, mutate, models, pending, begin }
}

it('does not open an attempt for providers without a valid authorization key', async () => {
  const f = fixture()
  const unauthorized = { ...f.row }
  delete unauthorized.authorization
  await f.controller.begin(unauthorized, 'oauth')
  await f.controller.begin({ ...f.row, authorization: { ...f.row.authorization!, key: '/provider' } }, 'oauth')
  expect(f.login).not.toHaveBeenCalled()
  expect(f.controller.store.getSnapshot().provider).toBeNull()
})

it('keeps a browser challenge during progress, replaces a new challenge, and clears private data on completion', async () => {
  const f = fixture()
  const stream = f.begin()
  stream.push({ type: 'notice', message: 'Open browser', url: 'https://auth.example/challenge', code: 'ABCD' })
  await expect.poll(() => f.controller.store.getSnapshot().notice?.code).toBe('ABCD')
  stream.push({ type: 'notice', message: 'Waiting for approval' })
  await expect.poll(() => f.controller.store.getSnapshot().notice?.message).toBe('Waiting for approval')
  expect(f.controller.store.getSnapshot().notice).toMatchObject({ url: 'https://auth.example/challenge', code: 'ABCD' })
  stream.push({ type: 'notice', message: 'New challenge', code: 'EFGH' })
  await expect.poll(() => f.controller.store.getSnapshot().notice?.code).toBe('EFGH')
  expect(f.controller.store.getSnapshot().notice?.url).toBeUndefined()
  stream.push({ type: 'prompt', id: 1, kind: 'secret', message: 'Paste code' })
  await expect.poll(() => f.controller.store.getSnapshot().prompt?.id).toBe(1)
  stream.push({ type: 'withdraw', id: 2 })
  stream.push({ type: 'withdraw', id: 1 })
  await expect.poll(() => f.controller.store.getSnapshot().prompt).toBeNull()
  stream.push({ type: 'result', status: 'authorized' })
  stream.end()
  await f.pending[0]
  expect(f.controller.store.getSnapshot()).toEqual({ provider: 'ChatGPT', phase: 'authorized', prompt: null, notice: null })
  expect(f.models.load).toHaveBeenCalledOnce()
  expect(f.mutate).not.toHaveBeenCalled()
  expect(stream.dispose).toHaveBeenCalledOnce()
})

it.each([undefined, 4])('declares a newly connected provider using the current settings revision %s', async (revision) => {
  const f = fixture(false, revision)
  const stream = f.begin()
  stream.push({ type: 'result', status: 'authorized' })
  stream.end()
  await f.pending[0]
  expect(f.mutate).toHaveBeenCalledWith('llm-pi-ai', [{ op: 'set', path: ['providers', 'openai-codex'], value: {} }], revision)
  expect(f.models.load).toHaveBeenCalledOnce()
})

it('reports a refused profile write while still reloading the committed credential', async () => {
  const f = fixture(false)
  f.mutate.mockResolvedValue({ ok: false })
  const stream = f.begin()
  stream.push({ type: 'result', status: 'authorized' })
  stream.end()
  await f.pending[0]
  expect(f.controller.store.getSnapshot().phase).toBe('failed')
  expect(f.models.load).toHaveBeenCalledOnce()
})

it.each(['cancelled', 'failed'] as const)('shows the terminal %s result without writing provider settings', async (status) => {
  const f = fixture(false)
  const stream = f.begin()
  stream.push({ type: 'result', status })
  stream.end()
  await f.pending[0]
  expect(f.controller.store.getSnapshot().phase).toBe(status)
  expect(f.mutate).not.toHaveBeenCalled()
  expect(f.models.load).not.toHaveBeenCalled()
})

it('only sends an answer to the current prompt and clears it immediately', async () => {
  const f = fixture()
  f.controller.answer(1, 'before prompt')
  const stream = f.begin()
  stream.push({ type: 'prompt', id: 2, kind: 'text', message: 'Code' })
  await expect.poll(() => f.controller.store.getSnapshot().prompt?.id).toBe(2)
  f.controller.answer(1, 'old code')
  expect(stream.send).not.toHaveBeenCalled()
  f.controller.answer(2, 'fresh code')
  expect(stream.send).toHaveBeenCalledWith({ id: 2, value: 'fresh code' })
  expect(f.controller.store.getSnapshot().prompt).toBeNull()
})

it('a disconnected answer clears the challenge and disposes its connection', async () => {
  const f = fixture()
  const stream = f.begin()
  stream.send.mockImplementation(() => { throw new Error('Disconnected') })
  stream.push({ type: 'notice', message: 'Waiting', code: 'ABCD' })
  stream.push({ type: 'prompt', id: 1, kind: 'secret', message: 'Code' })
  await expect.poll(() => f.controller.store.getSnapshot().prompt?.id).toBe(1)
  f.controller.answer(1, 'answer')
  expect(f.controller.store.getSnapshot()).toMatchObject({ phase: 'failed', prompt: null, notice: null })
  expect(stream.dispose).toHaveBeenCalled()
})

it('an unexpected stream end does not leave a waiting prompt or browser challenge visible', async () => {
  const f = fixture()
  const stream = f.begin()
  stream.push({ type: 'notice', message: 'Waiting', code: 'ABCD' })
  stream.push({ type: 'prompt', id: 1, kind: 'text', message: 'Code' })
  stream.end()
  await f.pending[0]
  expect(f.controller.store.getSnapshot()).toMatchObject({ phase: 'failed', prompt: null, notice: null })
})

it('a transport failure reports a failed attempt and disposes its stream', async () => {
  const f = fixture()
  const stream = f.begin()
  f.models.load.mockRejectedValue(new Error('Connection closed'))
  stream.push({ type: 'result', status: 'authorized' })
  await f.pending[0]
  expect(f.controller.store.getSnapshot().phase).toBe('failed')
  expect(stream.dispose).toHaveBeenCalledOnce()
})

it('ignores old frames after switching providers and preserves the new prompt', async () => {
  const f = fixture()
  const first = f.begin()
  const second = f.begin({ ...f.row, entry: { ...f.row.entry, displayName: 'Another account' } })
  second.push({ type: 'prompt', id: 2, kind: 'text', message: 'New code' })
  await expect.poll(() => f.controller.store.getSnapshot().prompt?.id).toBe(2)
  first.push({ type: 'result', status: 'authorized' })
  await f.pending[0]
  expect(f.controller.store.getSnapshot()).toMatchObject({ provider: 'Another account', phase: 'waiting', prompt: { id: 2 } })
  expect(f.models.load).not.toHaveBeenCalled()
})

it.each(['refused', 'rejected'] as const)('a late %s profile write cannot change a replacement attempt', async (outcome) => {
  const f = fixture(false)
  const write = Promise.withResolvers<{ ok: boolean }>()
  f.mutate.mockImplementation(() => write.promise)
  const first = f.begin()
  first.push({ type: 'result', status: 'authorized' })
  await expect.poll(() => f.mutate.mock.calls.length).toBe(1)
  f.begin({ ...f.row, entry: { ...f.row.entry, displayName: 'Replacement' } })
  if (outcome === 'refused') { first.end(); write.resolve({ ok: false }) }
  else write.reject(new Error('Disconnected'))
  await f.pending[0]
  expect(f.controller.store.getSnapshot()).toMatchObject({ provider: 'Replacement', phase: 'waiting' })
})

it('closing a window clears private data and ignores a subsequent end of the disposed stream', async () => {
  const f = fixture()
  const stream = f.begin()
  stream.push({ type: 'notice', message: 'Waiting', code: 'ABCD' })
  await expect.poll(() => f.controller.store.getSnapshot().notice?.code).toBe('ABCD')
  f.controller.close()
  stream.end()
  await f.pending[0]
  expect(f.controller.store.getSnapshot()).toEqual({ provider: null, phase: 'waiting', prompt: null, notice: null })
})

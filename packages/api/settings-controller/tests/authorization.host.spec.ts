/** Real Gateway streams isolate questions and preserve old credentials on cancellation. */
import { expect, it, onTestFinished, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Authorization, { type AuthorizationSession } from '@deepseek-ai/dsh-authorization'
import { credentialKey } from '@deepseek-ai/dsh-credentials'
import Registry from '@deepseek-ai/dsh-typert-registry'
import Gateway from '@deepseek-ai/dsh-api-gateway'
import { MemoryCredentials } from '../../../credentials/credentials/tests/memory.ts'
import { AuthorizationController } from '../src/authorization.ts'

/** A live uplink whose next answer is supplied by this test's window. */
class Answers implements AsyncIterable<unknown> {
  private pending = Promise.withResolvers<IteratorResult<unknown>>()
  send(value: unknown): void { this.pending.resolve({ done: false, value }) }
  end(): void { this.pending.resolve({ done: true, value: undefined }) }
  fail(): void { this.pending.reject(new Error('Connection lost')) }
  [Symbol.asyncIterator](): AsyncIterator<unknown> {
    return {
      next: async () => {
        const current = this.pending
        const answer = await current.promise
        if (this.pending === current) this.pending = Promise.withResolvers()
        return answer
      },
      return: async () => { this.pending.resolve({ done: true, value: undefined }); return { done: true, value: undefined } },
    }
  }
}

async function setup(run: (session: AuthorizationSession) => Promise<void>) {
  const ctx = new Context()
  onTestFinished(() => ctx.fiber.dispose())
  await ctx.plugin(MemoryCredentials)
  await ctx.plugin(Authorization)
  await ctx.plugin(Registry)
  await ctx.plugin(Gateway, {})
  await ctx.plugin(AuthorizationController)
  await ctx.plugin({ inject: ['authorization'], apply(child) {
    child.authorization.registerFlow({ key: credentialKey('test', 'account'), label: 'Account', methods: [{ id: 'oauth', label: 'Login' }], run })
  } })
  const open = async (answers: Answers, signal?: AbortSignal) => {
    const iterator = (await ctx.typertGateway.stream({
      namespace: 'authorization', method: 'login', args: { scope: 'test', id: 'account', method: 'oauth' }, uplink: answers, ...signal === undefined ? {} : { signal },
    }))[Symbol.asyncIterator]()
    onTestFinished(async () => { await iterator.return?.() })
    return iterator
  }
  return { ctx, open }
}

it('sends private questions only to their initiator and accepts only the current question', async () => {
  const { ctx, open } = await setup(async (session) => {
    session.notify({ message: 'Continue', url: 'https://auth.example/private-nonce' })
    const selected = await session.prompt({ kind: 'select', message: 'Choose', options: [{ id: 'browser', label: 'Browser' }] })
    expect(selected).toBe('browser')
    const answer = await session.prompt({ kind: 'secret', message: 'Code' })
    expect(answer).toBe('private-answer')
    await session.commit({ kind: 'grant', payload: { access: answer } })
  })
  const answers = new Answers()
  const iterator = await open(answers)
  expect((await iterator.next()).value).toMatchObject({ type: 'notice', url: 'https://auth.example/private-nonce' })
  expect((await iterator.next()).value).toMatchObject({ type: 'prompt', id: 1, kind: 'select' })
  const publicView = await ctx.authorizationController.list()
  expect(JSON.stringify(publicView)).not.toMatch(/private-nonce|private-answer/)
  const other = await open(new Answers())
  expect((await other.next()).value).toEqual({ type: 'result', status: 'failed' })
  await other.return?.()
  answers.send({ id: 1, value: 'browser' })
  expect((await iterator.next()).value).toMatchObject({ type: 'prompt', id: 2, kind: 'secret' })
  answers.send({ id: 2, value: 'private-answer' })
  expect((await iterator.next()).value).toEqual({ type: 'result', status: 'authorized' })
  expect((await iterator.next()).done).toBe(true)
  expect((await ctx.authorizationController.list())[0]?.configured).toBe(true)
})

it('closing the stream cancels its prompt and leaves the previously stored credential intact', async () => {
  const { ctx, open } = await setup(async (session) => {
    const answer = await session.prompt({ kind: 'secret', message: 'Code' })
    await session.commit({ kind: 'grant', payload: { access: answer } })
  })
  const key = credentialKey('test', 'account')
  const original = { kind: 'grant' as const, payload: { access: 'original' } }
  await ctx.credentials.modifyRecord(key, async () => original)
  const iterator = await open(new Answers())
  expect((await iterator.next()).value).toMatchObject({ type: 'prompt' })
  await iterator.return?.()
  expect(ctx.authorization.list()[0]?.inFlight).toBe(false)
  expect(await ctx.credentials.readRecord(key)).toEqual(original)
})

it('withdrawing one question does not allow its late answer to answer its replacement', async () => {
  const question = new AbortController()
  const { ctx, open } = await setup(async (session) => {
    await session.prompt({ kind: 'text', message: 'Old', signal: question.signal }).catch(() => {})
    const answer = await session.prompt({ kind: 'text', message: 'New' })
    expect(answer).toBe('new-answer')
    await session.commit({ kind: 'grant', payload: { access: answer } })
  })
  const answers = new Answers()
  const iterator = await open(answers)
  expect((await iterator.next()).value).toMatchObject({ type: 'prompt', id: 1 })
  question.abort()
  expect((await iterator.next()).value).toEqual({ type: 'withdraw', id: 1 })
  expect((await iterator.next()).value).toMatchObject({ type: 'prompt', id: 2 })
  answers.send({ id: 1, value: 'old-answer' })
  await new Promise<void>((resolve) => { setTimeout(resolve, 0) })
  answers.send({ id: 2, value: 'new-answer' })
  expect((await iterator.next()).value).toEqual({ type: 'result', status: 'authorized' })
  await iterator.return?.()
  expect((await ctx.authorizationController.list())[0]?.configured).toBe(true)
})

it('does not expose flows when either authorization or credential storage is absent', async () => {
  const { ctx } = await setup(async () => {})
  const get = ctx.get.bind(ctx)
  const missing = vi.spyOn(ctx, 'get')
  onTestFinished(() => { missing.mockRestore() })
  missing.mockImplementation((name) => { const service: unknown = get(name); return name === 'authorization' ? undefined : service })
  expect(await ctx.authorizationController.list()).toEqual([])
  missing.mockImplementation((name) => { const service: unknown = get(name); return name === 'credentials' ? undefined : service })
  expect(await ctx.authorizationController.list()).toEqual([])
})

it('forgets a registered idle credential and refuses unknown, busy, or unavailable storage', async () => {
  const { ctx, open } = await setup(async (session) => {
    await session.prompt({ kind: 'text', message: 'Code' })
  })
  const key = credentialKey('test', 'account')
  await ctx.credentials.modifyRecord(key, async () => ({ kind: 'grant', payload: { access: 'original' } }))
  await expect(ctx.authorizationController.forget('test', 'unknown')).rejects.toThrow('Unknown authorization flow')
  const iterator = await open(new Answers())
  expect((await iterator.next()).value).toMatchObject({ type: 'prompt' })
  await expect(ctx.authorizationController.forget('test', 'account')).rejects.toThrow('Sign-in is still running')
  await iterator.return?.()
  expect((await ctx.credentials.describeRecord(key)).configured).toBe(true)
  const get = ctx.get.bind(ctx)
  const missing = vi.spyOn(ctx, 'get').mockImplementation((name) => { const service: unknown = get(name); return name === 'credentials' ? undefined : service })
  onTestFinished(() => { missing.mockRestore() })
  await expect(ctx.authorizationController.forget('test', 'account')).rejects.toThrow('Credential storage is unavailable')
  missing.mockRestore()
  await ctx.authorizationController.forget('test', 'account')
  expect((await ctx.credentials.describeRecord(key)).configured).toBe(false)
})

it('refuses a direct login without an initiating invocation', async () => {
  const { ctx } = await setup(async () => {})
  await expect(ctx.authorizationController.login('test', 'account', 'oauth', new AbortController().signal)[Symbol.asyncIterator]().next()).rejects.toThrow('Sign-in is unavailable')
})

it.each(['end', 'fail'] as const)('a caller input stream that %ss cancels its question and releases the credential slot', async (method) => {
  const { ctx, open } = await setup(async (session) => {
    await session.prompt({ kind: 'text', message: 'Code', placeholder: 'Paste code' })
  })
  const answers = new Answers()
  const iterator = await open(answers)
  expect((await iterator.next()).value).toMatchObject({ type: 'prompt', placeholder: 'Paste code' })
  answers[method]()
  const frames = []
  for (let next = await iterator.next(); !next.done; next = await iterator.next()) frames.push(next.value)
  expect(frames).toContainEqual({ type: 'result', status: 'cancelled' })
  expect(ctx.authorization.list()[0]?.inFlight).toBe(false)
  expect((await ctx.credentials.describeRecord(credentialKey('test', 'account'))).configured).toBe(false)
})

it('ignores unadvertised select answers instead of committing them', async () => {
  const accepted = Promise.withResolvers<string>()
  const { ctx, open } = await setup(async (session) => {
    const answer = await session.prompt({ kind: 'select', message: 'Account', options: [{ id: 'work', label: 'Work' }] })
    accepted.resolve(answer)
    await session.commit({ kind: 'grant', payload: { account: answer } })
  })
  const answers = new Answers()
  const iterator = await open(answers)
  expect((await iterator.next()).value).toMatchObject({ type: 'prompt', id: 1 })
  answers.send({ id: 1, value: 'unadvertised' })
  await expect.poll(() => ctx.authorization.list()[0]?.inFlight).toBe(true)
  // Reading a second public invocation establishes that the first remains active.
  const other = await open(new Answers())
  expect((await other.next()).value).toEqual({ type: 'result', status: 'failed' })
  await other.return?.()
  answers.send({ id: 1, value: 'work' })
  expect(await accepted.promise).toBe('work')
  expect((await iterator.next()).value).toEqual({ type: 'result', status: 'authorized' })
  await iterator.return?.()
})

it('a retired question rejects immediately without disturbing a later question', async () => {
  const retired = AbortSignal.abort(new Error('Retired'))
  const { open } = await setup(async (session) => {
    expect(() => session.prompt({ kind: 'text', message: 'Retired', signal: retired })).toThrow('Retired')
    const value = await session.prompt({ kind: 'text', message: 'Current', placeholder: 'Current code' })
    await session.commit({ kind: 'grant', payload: { access: value } })
  })
  const answers = new Answers()
  const iterator = await open(answers)
  expect((await iterator.next()).value).toMatchObject({ type: 'prompt', id: 1, message: 'Current' })
  answers.send({ id: 1, value: 'current' })
  expect((await iterator.next()).value).toEqual({ type: 'result', status: 'authorized' })
  await iterator.return?.()
})

it('retains questions while evicting ordinary progress notices at the queue limit', async () => {
  const { open } = await setup(async (session) => {
    session.notify({ message: 'Web challenge', url: 'https://auth.example/start' })
    session.notify({ message: 'Device challenge', code: 'ABCD' })
    for (let i = 0; i < 62; i++) session.notify({ message: `Progress ${i}` })
    const value = await session.prompt({ kind: 'text', message: 'Code' })
    await session.commit({ kind: 'grant', payload: { access: value } })
  })
  const answers = new Answers()
  const iterator = await open(answers)
  const frames = []
  while (true) {
    const next = await iterator.next()
    if (next.done) throw new Error('Sign-in finished before asking for its code')
    frames.push(next.value)
    if (typeof next.value === 'object' && next.value !== null && 'type' in next.value && next.value.type === 'prompt') break
  }
  expect(frames).toHaveLength(64)
  expect(frames[0]).toMatchObject({ type: 'notice', url: 'https://auth.example/start' })
  expect(frames[1]).toMatchObject({ type: 'notice', code: 'ABCD' })
  expect(frames).not.toContainEqual({ type: 'notice', message: 'Progress 0' })
  answers.send({ id: 1, value: 'current' })
  expect((await iterator.next()).value).toEqual({ type: 'result', status: 'authorized' })
  await iterator.return?.()
})

it('drops excess challenge notices and always delivers a terminal result at the queue limit', async () => {
  const { open } = await setup(async (session) => {
    for (let i = 0; i < 64; i++) session.notify({ message: 'Device challenge', code: String(i) })
    session.notify({ message: 'Excess challenge', code: 'overflow' })
    await session.commit({ kind: 'grant', payload: { access: 'authorized' } })
  })
  const iterator = await open(new Answers())
  const frames = []
  for (let next = await iterator.next(); !next.done; next = await iterator.next()) frames.push(next.value)
  expect(frames.some(frame => typeof frame === 'object' && frame !== null && 'type' in frame
    && frame.type === 'notice' && 'code' in frame && frame.code === 'overflow')).toBe(false)
  expect(frames).toContainEqual({ type: 'result', status: 'authorized' })
})

it('fails rather than retaining more than 64 unanswered questions and clears all outstanding questions', async () => {
  const rejected: Promise<unknown>[] = []
  const { ctx, open } = await setup(async (session) => {
    for (let i = 0; i < 65; i++) rejected.push(session.prompt({ kind: 'text', message: `Question ${i}` }).catch((error: unknown) => error))
    await Promise.all(rejected)
  })
  const iterator = await open(new Answers())
  const frames = []
  for (let next = await iterator.next(); !next.done; next = await iterator.next()) frames.push(next.value)
  expect(frames).toContainEqual({ type: 'result', status: 'failed' })
  expect(ctx.authorization.list()[0]?.inFlight).toBe(false)
  expect(await Promise.all(rejected)).toHaveLength(64)
})

it('settles outstanding questions when the flow commits and finishes first', async () => {
  const rejected = Promise.withResolvers<unknown>()
  const { open } = await setup(async (session) => {
    void session.prompt({ kind: 'text', message: 'Optional question' }).catch((error: unknown) => { rejected.resolve(error) })
    await session.commit({ kind: 'grant', payload: { access: 'authorized' } })
  })
  const iterator = await open(new Answers())
  const frames = []
  for (let next = await iterator.next(); !next.done; next = await iterator.next()) frames.push(next.value)
  expect(frames).toContainEqual({ type: 'result', status: 'authorized' })
  expect(await rejected.promise).toBeInstanceOf(Error)
})

it('preserves a terminal failure when a paused reader has filled its entire challenge queue', async () => {
  const resume = Promise.withResolvers<undefined>()
  const { ctx, open } = await setup(async (session) => {
    session.notify({ message: 'Started' })
    await resume.promise
    for (let i = 0; i < 64; i++) session.notify({ message: 'Device challenge', code: String(i) })
    throw new Error('Provider failed')
  })
  onTestFinished(() => { resume.resolve(undefined) })
  const iterator = await open(new Answers())
  expect((await iterator.next()).value).toEqual({ type: 'notice', message: 'Started' })
  resume.resolve(undefined)
  await expect.poll(() => ctx.authorization.list()[0]?.inFlight).toBe(false)
  expect((await iterator.next()).value).toEqual({ type: 'result', status: 'failed' })
  expect((await iterator.next()).done).toBe(true)
})

it('contains progress from a provider finishing after its window has closed', async () => {
  const resume = Promise.withResolvers<undefined>()
  const finished = Promise.withResolvers<undefined>()
  const { open } = await setup(async (session) => {
    session.notify({ message: 'Started' })
    await resume.promise
    session.notify({ message: 'Late private challenge', code: 'late-code' })
    finished.resolve(undefined)
  })
  onTestFinished(async () => { resume.resolve(undefined); await finished.promise })
  const iterator = await open(new Answers())
  expect((await iterator.next()).value).toEqual({ type: 'notice', message: 'Started' })
  await iterator.return?.()
  resume.resolve(undefined)
  await finished.promise
  expect((await iterator.next()).done).toBe(true)
})

it('surface cancellation wins when the authorization service subsequently rejects', async () => {
  const { ctx, open } = await setup(async () => {})
  const started = Promise.withResolvers<AbortSignal>()
  const failed = Promise.withResolvers<never>()
  const begin = vi.spyOn(ctx.authorization, 'begin').mockImplementation(async (request) => {
    started.resolve(request.signal!)
    return failed.promise
  })
  onTestFinished(() => { begin.mockRestore() })
  const answers = new Answers()
  const iterator = await open(answers)
  const next = iterator.next()
  const signal = await started.promise
  try {
    answers.fail()
    await expect.poll(() => signal.aborted).toBe(true)
    failed.reject(new Error('Late provider failure'))
    expect((await next).value).toEqual({ type: 'result', status: 'cancelled' })
  } finally { failed.reject(new Error('Test finished')); await iterator.return?.() }
})

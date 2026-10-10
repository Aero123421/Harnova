/** Real Gateway streams isolate questions and preserve old credentials on cancellation. */
import { expect, it, onTestFinished } from 'vitest'
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
  const open = async (answers: Answers, signal?: AbortSignal) => (await ctx.typertGateway.stream({
    namespace: 'authorization', method: 'login', args: { scope: 'test', id: 'account', method: 'oauth' }, uplink: answers, ...signal === undefined ? {} : { signal },
  }))[Symbol.asyncIterator]()
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

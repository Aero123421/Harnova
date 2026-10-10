/** Generic, initiator-owned login stream over the existing authorization seam. */
import { Context } from '@deepseek-ai/cordis'
import { credentialKey } from '@deepseek-ai/dsh-credentials'
import type {} from '@deepseek-ai/dsh-authorization'
import type { AuthorizationPrompt } from '@deepseek-ai/dsh-authorization'
import { Remote, TypertRemoteService, type RemoteStream } from '@deepseek-ai/dsh-typert-protocol'
import type { ProviderAuthorizationAnswer, ProviderAuthorizationFrame, ProviderAuthorizationView } from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context { authorizationController: AuthorizationController }
}

/** A bounded, per-invocation queue carries notices and questions to their owner only. */
class LoginFrames {
  private readonly frames: ProviderAuthorizationFrame[] = []
  private wake = Promise.withResolvers<void>()
  private done = false

  push(frame: ProviderAuthorizationFrame): void {
    if (this.done) return
    if (this.frames.length >= 64) {
      const notice = this.frames.findIndex(frame => frame.type === 'notice' && frame.url === undefined && frame.code === undefined)
      if (notice >= 0) this.frames.splice(notice, 1)
      else if (frame.type === 'result') this.frames.length = 0
      else if (frame.type === 'notice') return
      else throw new Error('Authorization produced too many pending questions')
    }
    this.frames.push(frame)
    this.wake.resolve()
  }

  end(): void { this.done = true; this.wake.resolve() }

  async *read(): AsyncGenerator<ProviderAuthorizationFrame> {
    while (true) {
      const frame = this.frames.shift()
      if (frame !== undefined) { yield frame; continue }
      if (this.done) return
      this.wake = Promise.withResolvers<void>()
      await this.wake.promise
    }
  }
}

/** No token reads, URL broadcasts, durable attempts, or provider-specific UI protocol. */
export class AuthorizationController extends TypertRemoteService {
  constructor(ctx: Context) {
    super(ctx, 'authorizationController', { namespace: 'authorization' })
  }

  /** List non-secret provider sign-in choices.
   * @returns registered flow identities, methods, and local credential presence.
   */
  @Remote
  async list(): Promise<ProviderAuthorizationView[]> {
    const authorization = this.ctx.get('authorization')
    const credentials = this.ctx.get('credentials')
    if (authorization === undefined || credentials === undefined) return []
    return Promise.all(authorization.list().map(async entry => ({
      key: String(entry.key), label: entry.label,
      methods: entry.methods.map(method => ({ id: method.id, label: method.label })),
      inFlight: entry.inFlight,
      configured: (await credentials.describeRecord(entry.key)).configured,
    })))
  }

  /** Local credential removal is distinct from provider/model OFF and server revocation.
   * @param scope - owning credential scope.
   * @param id - provider ID within that scope.
   */
  @Remote
  async forget(scope: string, id: string): Promise<void> {
    const key = credentialKey(scope, id)
    const authorization = this.ctx.get('authorization')
    if (authorization?.list().some(entry => entry.key === key) !== true) throw new Error('Unknown authorization flow')
    if (authorization.list().some(entry => entry.key === key && entry.inFlight)) {
      throw new Error('Sign-in is still running')
    }
    const credentials = this.ctx.get('credentials')
    if (credentials === undefined) throw new Error('Credential storage is unavailable')
    await credentials.deleteRecord(key)
  }

  /** Run one sign-in through the initiating invocation's private interaction stream.
   * @param scope - owning credential scope.
   * @param id - provider ID within that scope.
   * @param method - method ID advertised by the flow.
   * @param signal - invocation cancellation.
   * @returns notices, numbered questions, and the attempt's final status.
   */
  @Remote({ mode: 'stream' })
  async *login(
    scope: string, id: string, method: string, signal: AbortSignal,
  ): RemoteStream<ProviderAuthorizationFrame, ProviderAuthorizationAnswer> {
    const key = credentialKey(scope, id)
    const authorization = this.ctx.get('authorization')
    const invocation = this.ctx.invocation
    if (authorization === undefined || invocation === undefined) throw new Error('Sign-in is unavailable')
    const controller = new AbortController()
    const attemptSignal = AbortSignal.any([signal, controller.signal])
    const frames = new LoginFrames()
    const answers = invocation.uplink<ProviderAuthorizationAnswer>()[Symbol.asyncIterator]()
    const questions = new Map<number, { accept(value: string): void; reject(reason: unknown): void }>()
    let questionId = 0
    const rejectQuestions = (): void => {
      for (const question of questions.values()) question.reject(attemptSignal.reason ?? new Error('Sign-in ended'))
      questions.clear()
    }
    attemptSignal.addEventListener('abort', rejectQuestions, { once: true })
    const receive = async (): Promise<void> => {
      try {
        while (!attemptSignal.aborted) {
          const item = await answers.next()
          if (item.done) { controller.abort(new Error('Sign-in input closed')); return }
          const question = questions.get(item.value.id)
          // A withdrawn or already-answered question cannot affect a later one.
          if (question !== undefined) question.accept(item.value.value)
        }
      } catch { controller.abort(new Error('Sign-in connection closed')) }
    }
    const prompt = (request: AuthorizationPrompt): Promise<string> => {
      const promptSignal = request.signal === undefined ? attemptSignal : AbortSignal.any([attemptSignal, request.signal])
      promptSignal.throwIfAborted()
      const currentId = ++questionId
      frames.push({ type: 'prompt', id: currentId, kind: request.kind, message: request.message,
        ...request.kind === 'select'
          ? { options: request.options.map(option => ({ id: option.id, label: option.label })) }
          : request.placeholder === undefined ? {} : { placeholder: request.placeholder },
      })
      const answer = Promise.withResolvers<string>()
      const withdraw = (): void => {
        questions.delete(currentId)
        frames.push({ type: 'withdraw', id: currentId })
        answer.reject(promptSignal.reason)
      }
      questions.set(currentId, {
        accept(value) {
          if (request.kind === 'select' && !request.options.some(option => option.id === value)) return
          questions.delete(currentId)
          answer.resolve(value)
        },
        reject: (reason) =>{  answer.reject(reason) },
      })
      promptSignal.addEventListener('abort', withdraw, { once: true })
      return answer.promise.finally(() => { promptSignal.removeEventListener('abort', withdraw); questions.delete(currentId) })
    }
    const receiving = receive()
    const running = authorization.begin({
      key, method, signal: attemptSignal,
      interaction: { notify: (notice) =>{  frames.push({ type: 'notice', ...notice }) }, prompt },
    }).then((outcome) => { frames.push({ type: 'result', status: outcome.status }) })
      .catch(() => { frames.push({ type: 'result', status: attemptSignal.aborted ? 'cancelled' : 'failed' }) })
      .finally(() => { rejectQuestions(); frames.end() })
    try { yield * frames.read() }
    finally {
      controller.abort(new Error('Sign-in window closed'))
      await answers.return?.()
      await Promise.allSettled([running, receiving])
      attemptSignal.removeEventListener('abort', rejectQuestions)
    }
  }
}

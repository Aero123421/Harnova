/** The optional backend registers and leaves with its plugin fiber. */
import { Context } from '@deepseek-ai/cordis'
import { expect, it, onTestFinished, vi } from 'vitest'
import { SessionTelemetryBackend, type SessionTelemetryRecord } from '../src/index.ts'

class TestBackend extends SessionTelemetryBackend {
  readonly sharing = 'disabled' as const
  readonly emit = vi.fn<(record: SessionTelemetryRecord) => void>()
  readonly shutdown = vi.fn<() => Promise<void>>(async () => {})
}

it('requires explicit installation and removes its service on disposal', async () => {
  const ctx = new Context()
  onTestFinished(() => ctx.fiber.dispose())
  expect(ctx.get('sessionTelemetry')).toBeUndefined()
  const fiber = await ctx.plugin(TestBackend)
  const backend = ctx.get('sessionTelemetry')
  expect(backend).toBeInstanceOf(TestBackend)
  expect(backend?.sharing).toBe('disabled')
  expect(backend?.emit).not.toHaveBeenCalled()
  await fiber.dispose()
  expect(ctx.get('sessionTelemetry')).toBeUndefined()
})

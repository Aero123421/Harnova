// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { SettingsNamespaceView } from '@deepseek-ai/dsh-api-remotes/client'
import { createModelsOperations } from '../src/client/operations.ts'
import { ProviderModelControls } from '../src/client/ProviderModelControls.tsx'
import { en } from '../src/client/locales.ts'
import type { ProviderRow } from '../src/client/store.ts'

afterEach(cleanup)

function fixture(enabled = true) {
  const namespace: SettingsNamespaceView = { ns: 'model-access', revision: 4, schema: {}, value: {}, secrets: [], autoGenerate: false, applies: 'live' }
  const mutate = vi.fn(async () => ({ ok: true as const, value: namespace }))
  const credentialSet = vi.fn()
  const credentialRemove = vi.fn()
  const operations = createModelsOperations({
    remote: { settings: { mutate }, credentials: { set: credentialSet, unset: credentialRemove } },
  } as never)
  const row: ProviderRow = {
    entry: { provider: 'openai-codex', displayName: 'ChatGPT', active: true, settingsNs: 'llm-pi-ai', settingsPath: ['providers', 'openai-codex'] },
    configured: true, removable: true, apiKeyEnv: undefined, credential: undefined,
    enabled, enabledModels: ['a'], candidates: [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }],
  }
  const reload = vi.fn(async () => {})
  return { row, namespace, mutate, credentialSet, credentialRemove, operations, reload }
}

it('provider OFF keeps its saved models and performs no credential writes', async () => {
  const f = fixture()
  render(<ProviderModelControls {...f} expanded readOnly={false} t={key => en[key]} />)
  fireEvent.click(screen.getByRole('switch', { name: 'Use ChatGPT' }))
  await waitFor(() => { expect(f.reload).toHaveBeenCalledTimes(1) })
  expect(f.mutate).toHaveBeenCalledWith('model-access', [
    { op: 'set', path: ['providers', 'openai-codex'], value: { enabled: false, models: ['a'] } },
  ], 4)
  expect(f.credentialSet).not.toHaveBeenCalled()
  expect(f.credentialRemove).not.toHaveBeenCalled()
})

it('bulk changes apply only to search results and can preserve a provider OFF', async () => {
  const f = fixture(false)
  render(<ProviderModelControls {...f} expanded readOnly={false} t={key => en[key]} />)
  fireEvent.change(screen.getByRole('textbox', { name: 'Search models' }), { target: { value: 'Beta' } })
  fireEvent.click(screen.getByRole('button', { name: 'Enable shown models' }))
  await waitFor(() => { expect(f.reload).toHaveBeenCalledTimes(1) })
  expect(f.mutate).toHaveBeenCalledWith('model-access', [
    { op: 'set', path: ['providers', 'openai-codex'], value: { enabled: false, models: ['a', 'b'] } },
  ], 4)
})

it('read-only settings leave provider and model switches disabled', () => {
  const f = fixture()
  render(<ProviderModelControls {...f} expanded readOnly t={key => en[key]} />)
  for (const toggle of screen.getAllByRole('switch')) expect((toggle as HTMLButtonElement).disabled).toBe(true)
  expect(f.mutate).not.toHaveBeenCalled()
})

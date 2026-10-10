// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  expect(screen.getByRole('button', { name: en.enableVisibleModels })).toHaveProperty('disabled', true)
  expect(screen.getByRole('button', { name: en.disableVisibleModels })).toHaveProperty('disabled', true)
  expect(f.mutate).not.toHaveBeenCalled()
})


it('toggles individual models without losing saved choices and filters enabled models', async () => {
  const f = fixture()
  const view = render(<ProviderModelControls {...f} expanded readOnly={false} t={key => en[key]} />)
  fireEvent.click(screen.getByRole('switch', { name: 'Use Beta' }))
  await waitFor(() => { expect(f.reload).toHaveBeenCalledTimes(1) })
  expect(f.mutate).toHaveBeenLastCalledWith('model-access', [{ op: 'set', path: ['providers', 'openai-codex'], value: { enabled: true, models: ['a', 'b'] } }], 4)
  view.rerender(<ProviderModelControls {...f} row={{ ...f.row, enabledModels: ['a', 'b'] }} expanded readOnly={false} t={key => en[key]} />)
  fireEvent.click(screen.getByRole('switch', { name: 'Use Beta' }))
  await waitFor(() => { expect(f.reload).toHaveBeenCalledTimes(2) })
  expect(f.mutate).toHaveBeenLastCalledWith('model-access', [{ op: 'set', path: ['providers', 'openai-codex'], value: { enabled: true, models: ['a'] } }], 4)
  view.rerender(<ProviderModelControls {...f} expanded readOnly={false} t={key => en[key]} />)
  fireEvent.click(screen.getByRole('checkbox', { name: en.modelsEnabledOnly }))
  expect(screen.queryByRole('switch', { name: 'Use Beta' })).toBeNull()
  expect(screen.getByRole('switch', { name: 'Use Alpha' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: en.disableVisibleModels }))
  await waitFor(() => { expect(f.reload).toHaveBeenCalledTimes(3) })
  expect(f.mutate).toHaveBeenLastCalledWith('model-access', [{ op: 'set', path: ['providers', 'openai-codex'], value: { enabled: true, models: [] } }], 4)
})

it('removes only visible model choices and preserves hidden or temporarily absent catalog ids', async () => {
  const f = fixture()
  f.row.enabledModels = ['a', 'b', 'private-model']
  render(<ProviderModelControls {...f} expanded readOnly={false} t={key => en[key]} />)
  fireEvent.change(screen.getByRole('textbox', { name: en.modelSearch }), { target: { value: ' beta ' } })
  fireEvent.click(screen.getByRole('button', { name: en.disableVisibleModels }))
  await waitFor(() => { expect(f.reload).toHaveBeenCalledTimes(1) })
  expect(f.mutate).toHaveBeenCalledWith('model-access', [{ op: 'set', path: ['providers', 'openai-codex'], value: { enabled: true, models: ['a', 'private-model'] } }], 4)
})

it('renders an unavailable candidate catalog while keeping the connection switch usable', () => {
  const f = fixture(false)
  const { enabledModels: _models, candidates: _candidates, ...row } = f.row
  render(<ProviderModelControls {...f} row={{ ...row, candidateError: 'provider offline' }} expanded readOnly={false} t={key => en[key]} />)
  expect(screen.getByText(en.modelCandidatesFailed)).toBeTruthy()
  expect(screen.getByText(en.noModelCandidates)).toBeTruthy()
  expect(screen.getByText(en.providerDisabledHint)).toBeTruthy()
  expect(screen.getByText(en.modelsSavedCount.replace('{count}', '0'))).toBeTruthy()
  expect(screen.getByRole('button', { name: en.enableVisibleModels })).toHaveProperty('disabled', true)
  expect(screen.getByRole('switch', { name: 'Use ChatGPT' })).toHaveProperty('disabled', false)
})

it('fences duplicate writes until the confirmed settings revision has reloaded', async () => {
  const f = fixture()
  let release!: () => void
  const gate = new Promise<void>((resolve) => { release = resolve })
  f.reload.mockImplementation(() => gate)
  render(<ProviderModelControls {...f} expanded readOnly={false} t={key => en[key]} />)
  const toggle = screen.getByRole('switch', { name: 'Use ChatGPT' })
  act(() => { toggle.click(); toggle.click() })
  expect(f.mutate).toHaveBeenCalledTimes(1)
  await waitFor(() => { expect(f.reload).toHaveBeenCalledTimes(1) })
  expect(toggle).toHaveProperty('disabled', true)
  fireEvent.click(screen.getByRole('switch', { name: 'Use Beta' }))
  expect(f.mutate).toHaveBeenCalledTimes(1)
  await act(async () => { release(); await gate })
  expect(toggle).toHaveProperty('disabled', false)
})

it('reports a rejected write without reloading and permits a successful retry', async () => {
  const f = fixture()
  const write = vi.spyOn(f.operations, 'writeSettings')
  write.mockResolvedValueOnce({ kind: 'conflict', message: 'settings revision moved' })
  write.mockResolvedValueOnce({ kind: 'refused', message: 'settings are locked' })
  render(<ProviderModelControls {...f} expanded readOnly={false} t={key => en[key]} />)
  fireEvent.click(screen.getByRole('switch', { name: 'Use ChatGPT' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'settings revision moved')
  expect(f.reload).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('switch', { name: 'Use ChatGPT' }))
  await waitFor(() => { expect(screen.getByRole('alert').textContent).toBe('settings are locked') })
  expect(f.reload).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('switch', { name: 'Use ChatGPT' }))
  await waitFor(() => { expect(f.reload).toHaveBeenCalledTimes(1) })
  expect(screen.getByRole('alert').textContent).toBe(en.modelAccessSaved)
})

it('contains transport failures and removes the failure banner after its display interval', async () => {
  const f = fixture()
  vi.spyOn(f.operations, 'writeSettings').mockRejectedValue(new Error('connection lost'))
  render(<ProviderModelControls {...f} expanded readOnly={false} t={key => en[key]} />)
  fireEvent.click(screen.getByRole('switch', { name: 'Use ChatGPT' }))
  await screen.findByRole('alert')
  expect(screen.getByRole('alert').textContent).toBe(en.modelAccessFailed)
  // The timer is the behavior under test, so advance it deterministically after the async write settles.
  vi.useFakeTimers()
  try {
    fireEvent.click(screen.getByRole('switch', { name: 'Use ChatGPT' }))
    await act(async () => {})
    act(() => { vi.advanceTimersByTime(4000) })
    expect(screen.queryByRole('alert')).toBeNull()
  } finally { vi.useRealTimers() }
})

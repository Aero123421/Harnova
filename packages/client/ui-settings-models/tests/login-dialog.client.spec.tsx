// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ModelsLoginDialog } from '../src/client/ModelsLoginDialog.tsx'
import type { LoginSnapshot } from '../src/client/login-store.ts'
import { en, ja } from '../src/client/locales.ts'

afterEach(cleanup)

function fixture(state: Partial<LoginSnapshot> = {}, copy = en) {
  const answer = vi.fn()
  const close = vi.fn()
  const snapshot: LoginSnapshot = { provider: 'ChatGPT', phase: 'waiting', notice: null, prompt: null, ...state }
  const props = { state: snapshot, answer, close, t: (key: keyof typeof en) => copy[key] }
  return { ...render(<ModelsLoginDialog {...props} />), props, answer, close }
}

it.each([en, ja])('opens a localized waiting dialog and lets the user cancel', (copy) => {
  const f = fixture({}, copy)
  const dialog = screen.getByRole('dialog', { name: copy.providerLoginTitle.replace('{provider}', 'ChatGPT') })
  expect(within(dialog).getByRole('status').textContent).toBe(copy.providerLoginWaiting)
  fireEvent.click(within(dialog).getByRole('button', { name: copy.cancel }))
  expect(f.close).toHaveBeenCalledOnce()
  f.rerender(<ModelsLoginDialog {...f.props} state={{ ...f.props.state, provider: null }} />)
  expect(screen.queryByRole('dialog')).toBeNull()
})

it.each(['authorized', 'failed', 'cancelled'] as const)('shows a %s result with a Close action', (phase) => {
  fixture({ phase })
  const key = phase === 'authorized' ? 'providerLoginSuccess' : phase === 'failed' ? 'providerLoginFailed' : 'providerLoginCancelled'
  expect(screen.getByRole('status').textContent).toBe(en[key])
  expect(screen.queryByText(en.providerLoginWaiting)).toBeNull()
  expect(screen.queryByRole('button', { name: en.cancel })).toBeNull()
  expect(screen.getAllByRole('button', { name: en.close })).toHaveLength(2)
})

it.each(['https://auth.example/start', 'HTTP://auth.example/start'])('renders a browser challenge %s as an isolated external link', (url) => {
  fixture({ notice: { type: 'notice', message: 'Approve in your browser', url, code: 'ABCD-EFGH' } })
  expect(screen.getByRole('status').textContent).toBe('Approve in your browser')
  const link = screen.getByRole('link', { name: en.providerLoginOpenBrowser })
  expect(link.getAttribute('href')).toBe(url)
  expect(link.getAttribute('target')).toBe('_blank')
  expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  expect(screen.getByText('ABCD-EFGH').tagName).toBe('CODE')
})

it.each(['javascript:alert(1)', 'file:///private/account', undefined])('does not turn an unsafe or absent URL %s into a browser link', (url) => {
  fixture({ notice: { type: 'notice', message: 'Continue', ...url === undefined ? {} : { url } } })
  expect(screen.queryByRole('link')).toBeNull()
  expect(screen.getByRole('status').textContent).toBe('Continue')
})

it.each(['text', 'secret'] as const)('answers a %s prompt only after nonempty input and clears the submitted code', (kind) => {
  const f = fixture({ prompt: { type: 'prompt', id: 4, kind, message: 'Verification code', placeholder: 'Paste here' } })
  const field = screen.getByLabelText<HTMLInputElement>('Verification code')
  expect(field.type).toBe(kind === 'secret' ? 'password' : 'text')
  expect(field.autocomplete).toBe('off')
  expect(field.getAttribute('spellcheck')).toBe('false')
  expect(field.placeholder).toBe('Paste here')
  expect(screen.getByRole<HTMLButtonElement>('button', { name: en.providerLoginContinue }).disabled).toBe(true)
  fireEvent.submit(field.closest('form')!)
  expect(f.answer).not.toHaveBeenCalled()
  fireEvent.change(field, { target: { value: 'one-time-code' } })
  fireEvent.click(screen.getByRole('button', { name: en.providerLoginContinue }))
  expect(f.answer).toHaveBeenCalledWith(4, 'one-time-code')
  expect(field.value).toBe('')
})

it('selects a registered option by ID and resets drafts when a question or provider changes', () => {
  const f = fixture({ prompt: { type: 'prompt', id: 1, kind: 'select', message: 'Account', options: [{ id: 'work', label: 'Work account' }] } })
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'work' } })
  fireEvent.click(screen.getByRole('button', { name: en.providerLoginContinue }))
  expect(f.answer).toHaveBeenCalledWith(1, 'work')
  expect(screen.getByRole<HTMLSelectElement>('combobox').value).toBe('')
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'work' } })
  const next: LoginSnapshot = { ...f.props.state, prompt: { type: 'prompt', id: 2, kind: 'text', message: 'New code' } }
  f.rerender(<ModelsLoginDialog {...f.props} state={next} />)
  expect(screen.getByLabelText<HTMLInputElement>('New code').value).toBe('')
  fireEvent.change(screen.getByLabelText('New code'), { target: { value: 'private draft' } })
  f.rerender(<ModelsLoginDialog {...f.props} state={{ ...next, provider: 'Other account' }} />)
  expect(screen.getByLabelText<HTMLInputElement>('New code').value).toBe('')
})

it('keeps a select prompt with no advertised options unanswerable', () => {
  fixture({ prompt: { type: 'prompt', id: 1, kind: 'select', message: 'Account' } })
  expect(screen.getAllByRole('option')).toHaveLength(1)
  expect(screen.getByRole<HTMLButtonElement>('button', { name: en.providerLoginContinue }).disabled).toBe(true)
})

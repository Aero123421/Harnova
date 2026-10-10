// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { EffortSlider } from '../src/client/EffortSlider.tsx'

const reasoning = {
  efforts: [{ id: 'low', name: 'Low' }, { id: 'high', name: 'High' }, { id: 'max', name: 'Max' }],
  defaultEffort: 'high',
}
const labels = { label: 'Effort', defaultLabel: 'Provider default' }
afterEach(cleanup)

it('commits one changed level on blur, but does not resend unchanged or cancelled input', () => {
  const commit = vi.fn()
  render(<EffortSlider reasoning={reasoning} value={undefined} disabled={false} {...labels} commit={commit} />)
  const slider = screen.getByRole('slider')
  fireEvent.blur(slider)
  expect(commit).not.toHaveBeenCalled()
  fireEvent.change(slider, { target: { value: '2' } })
  expect(slider.getAttribute('aria-valuetext')).toBe('Max')
  expect(commit).not.toHaveBeenCalled()
  fireEvent.blur(slider)
  expect(commit).toHaveBeenCalledExactlyOnceWith('max')
  fireEvent.change(slider, { target: { value: '1' } })
  fireEvent.keyUp(slider, { key: 'ArrowLeft' })
  expect(commit).toHaveBeenCalledTimes(1)
  fireEvent.change(slider, { target: { value: '0' } })
  fireEvent.pointerCancel(slider)
  expect(slider.getAttribute('aria-valuetext')).toBe('High')
  fireEvent.pointerUp(slider)
  expect(commit).toHaveBeenCalledTimes(1)
  fireEvent.keyUp(slider, { key: 'Escape' })
  expect(commit).toHaveBeenCalledTimes(1)
})

it('renders a provider default with no concrete level and resets an explicit level', () => {
  const commit = vi.fn()
  const view = render(
    <EffortSlider reasoning={{ efforts: reasoning.efforts }} value={undefined} disabled={false} {...labels} commit={commit} />,
  )
  expect(screen.getByRole('slider').getAttribute('aria-valuetext')).toBe(labels.defaultLabel)
  expect(screen.queryByRole('button', { name: labels.defaultLabel })).toBeNull()
  view.rerender(<EffortSlider reasoning={reasoning} value="max" disabled={false} {...labels} commit={commit} />)
  fireEvent.click(screen.getByRole('button', { name: labels.defaultLabel }))
  expect(commit).toHaveBeenCalledExactlyOnceWith(undefined)
})

it('offers the single supported level as a button and leaves empty metadata without a control', () => {
  const commit = vi.fn()
  const view = render(<EffortSlider reasoning={{ efforts: [{ id: 'high', name: 'High' }] }} value={undefined} disabled={false} {...labels} commit={commit} />)
  fireEvent.click(screen.getByRole('button', { name: 'High' }))
  expect(commit).toHaveBeenCalledExactlyOnceWith('high')
  view.rerender(<EffortSlider reasoning={{ efforts: [] }} value={undefined} disabled={false} {...labels} commit={commit} />)
  expect(screen.queryByRole('button')).toBeNull()
  expect(screen.queryByRole('slider')).toBeNull()
})

it('prevents single-level and default reset actions while a selection is locked', () => {
  const commit = vi.fn()
  render(<EffortSlider reasoning={{ efforts: [{ id: 'high', name: 'High' }] }} value="high" disabled {...labels} commit={commit} />)
  for (const button of screen.getAllByRole('button')) {
    expect(button).toHaveProperty('disabled', true)
    fireEvent.click(button)
  }
  expect(commit).not.toHaveBeenCalled()
})

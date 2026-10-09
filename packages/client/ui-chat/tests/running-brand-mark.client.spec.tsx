// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { RunningBrandMark } from '../src/client/chat/RunningBrandMark.tsx'

afterEach(cleanup)

it('renders the currentColor vector mark without a raster mask or inline animation', () => {
  const view = render(<RunningBrandMark />)
  const icon = view.container.firstElementChild!
  expect(icon.getAttribute('aria-hidden')).toBe('true')
  expect(icon.children).toHaveLength(1)
  const svg = icon.querySelector('svg')!
  expect(svg.getAttribute('viewBox')).toBe('32 32 192 192')
  expect(svg.getAttribute('fill')).toBe('currentColor')
  expect(svg.querySelectorAll('path')).toHaveLength(2)
  expect(view.container.querySelector('animate')).toBeNull()
  expect(view.container.querySelector('[style]')).toBeNull()
})

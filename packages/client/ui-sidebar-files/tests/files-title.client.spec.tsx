// @vitest-environment jsdom
/** The chip title: the folder sheet, then the type's label. */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { FilesTitle } from '../src/client/FilesTitle.tsx'

afterEach(cleanup)

describe('FilesTitle', () => {
  it('draws the folder sheet before the title text, sized to the chip line', () => {
    const { container, rerender } = render(<FilesTitle t={() => 'Files'} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('16')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    expect(container.textContent).toBe('Files')
    rerender(<FilesTitle t={() => 'ファイル'} />)
    expect(container.textContent).toBe('ファイル')
  })
})

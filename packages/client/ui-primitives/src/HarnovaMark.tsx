import type { IconProps } from './icons/props.ts'
import { HARNOVA_MARK_PATHS, HARNOVA_MARK_VIEWBOX } from './brand-artwork.ts'

/** Render the approved Harnova mark in the surrounding text color. */
export function HarnovaMark({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox={HARNOVA_MARK_VIEWBOX} className={className} fill="currentColor" aria-hidden="true">
      {HARNOVA_MARK_PATHS.map(path => <path key={path} d={path} />)}
    </svg>
  )
}

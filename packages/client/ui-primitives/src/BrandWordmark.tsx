import type { IconProps } from './icons/props.ts'
import { HARNOVA_MARK_PATHS, HARNOVA_WORDMARK_PATHS } from './brand-artwork.ts'

/** Harnova name artwork with an optional leading mark. */
export interface BrandWordmarkProps extends IconProps {
  includeMark?: boolean | undefined
}

/** Render font-independent Harnova artwork in the surrounding text color. */
export function BrandWordmark({ size = 24, className, includeMark = true }: BrandWordmarkProps) {
  const width = includeMark ? 148 : 114
  return (
    <svg width={size * width / 24} height={size} className={className} viewBox={`0 0 ${width} 24`} fill="currentColor" aria-hidden="true">
      {includeMark && <g transform="translate(-4 -4) scale(.125)">
        {HARNOVA_MARK_PATHS.map(path => <path key={path} d={path} />)}
      </g>}
      <g transform={`translate(${includeMark ? 34 : 0} 3) scale(.36) translate(-212 -64)`}>
        {HARNOVA_WORDMARK_PATHS.map(path => <path key={path} d={path} />)}
      </g>
    </svg>
  )
}

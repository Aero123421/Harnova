import { HARNOVA_MARK_PATHS } from './brand-artwork.ts'

/** @deprecated Use HarnovaMark. Kept for existing plugin imports. */
export { HarnovaMark as FishLogo } from './HarnovaMark.tsx'
/** @deprecated Use HarnovaMark instead of copying the artwork. */
export const FISH_LOGO_VIEWBOX = { width: 256, height: 256 }
/** @deprecated Use HarnovaMark instead of copying the artwork. */
export const FISH_LOGO_PATH = HARNOVA_MARK_PATHS.join(' ')

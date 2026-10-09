# Harnova branding

The approved mark is the curved H from exploration C. Its paths are preserved in [harnova-mark.svg](harnova-mark.svg); [harnova-logo.svg](harnova-logo.svg) contains the same mark and outlined Harnova wordmark. [powered-by.svg](powered-by.svg) contains outlined attribution text. These are the editable source files.

Run `pnpm branding:generate` from the repository root to generate the shared UI paths, Web and documentation favicons, documentation wordmark, Desktop SVG/PNG icons, welcome artwork, installer PNGs, onboarding diagrams, optional badge, and Windows tray ICO. Run `pnpm branding:check` to compare generated artwork with the source. The tray's size/format is covered by Desktop tests.

UI marks use currentColor and a cropped 192 × 192 viewport so the approved shape remains readable at 24px. Standalone favicons have fixed black or white fills. The Desktop welcome SVG adapts to the OS theme. Generated PNG diagrams contain no embedded upstream screenshots or account details.

Text outlines use the repository's Montserrat Medium font. Keep [Montserrat-OFL.txt](Montserrat-OFL.txt) when distributing these assets. The upstream software's MIT notice remains in the root LICENSE.

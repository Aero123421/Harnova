# Website publication

## Manifest ownership

[website/docs.ts](../../../../website/docs.ts) owns public route mappings. Canonical content lives outside `website/`; the projector creates ignored generated output.

## Classify the change

Edit the owning page for content changes. Update manifest entries and current inbound links together for page additions, moves, or removals.

## DocsPage fields

Read the current `DocsPage` type and entries before editing. Choose source, route, label, and navigation values supported by that type.

## Preserve link behavior

Check relative links, anchors, images, and route mappings through the projector. Do not add an independent copy of canonical content.

## Preview and validate

Run `pnpm run website:build` or the relevant projection tests when site content or routes change. Build output is local evidence, not publication.

## Keep deployment separate

Publish only when requested by the user. Harnova's deployment target must be configured independently of upstream.

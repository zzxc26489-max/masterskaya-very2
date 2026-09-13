# Design QA — главная «Мастерская Веры»

- approved composite: `/workspace/scratch/ed2aa203bf0e/upload/01-1000094695.png`
- mobile workshop issue reference: `/workspace/scratch/ed2aa203bf0e/upload/01-1000094747.jpg`
- target viewports: 1440 × 1000 and 390 × 844 CSS px

## Latest corrections

1. Header and footer use the real workshop dragon-on-mushroom mark (`logo-mark.webp`), without filters or blending.
2. The mobile workshop intro is an editorial single-column composition: large copy, full-width action, three full-width process cards using real process photographs and numbered stages.
3. Decorative pseudo-icons were removed. The three workshop values now use restrained numbered medallions and full-width divided rows.
4. All active Residents are rendered. At desktop they form one horizontal scrolling row; at mobile they form a complete vertical list.
5. Resident actions use a centred SVG chevron inside an equal circular gold outline, avoiding font-dependent arrow alignment.
6. Workshop and Residents paper bands use `paper-botanical.webp`; the botanical drawing is masked to the outer margins and remains behind the content layer.
7. Mobile keeps the approved order: header, hero, workshop, Worlds, Residents, footer.

## Verification

- `npm run studio:check`: passed.
- `git diff --check`: passed.
- Local `npm run studio:test`: browser launch blocked because the Playwright Chromium bundle is not installed in the workspace.
- CI installs Chromium and runs the responsive route and asset checks at 1440 and 390 px.

final result: ready for CI visual verification

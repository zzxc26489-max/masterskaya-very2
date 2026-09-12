# Design QA — главная «Мастерская Веры»

- source visual truth path: `/workspace/scratch/ed2aa203bf0e/upload/01-1000094683.png`
- source pixels: 1536 × 1024, composite desktop/mobile reference
- desktop implementation screenshot: `/workspace/scratch/masterskaya-final-desktop-1440.jpg`
- desktop viewport: 1440 × 1000 CSS px, DPR 1; screenshot: 1440 × 3344 px
- mobile implementation screenshot: `/workspace/scratch/masterskaya-final-mobile-390.jpg`
- mobile viewport: 390 × 844 CSS px, DPR 1; screenshot: 390 × 3364 px
- state: homepage, all lazy images loaded, no broken images

## Findings

No actionable P0/P1/P2 visual differences remain within the approved light-header, alternating paper/night design direction.

1. Hero heading is locked to two lines; verified at 1024, 1280 and 1440 px.
2. Desktop hero buttons are content-width and stacked; mobile buttons remain full-width.
3. All five world cards visibly contain a figurine. Selected after visual review: nutcracker, forest dragon, blue dragon, Little Humpbacked Horse, rocking horse.
4. CTA desk, sketches, pen and inkwell are recognizable while centered copy remains legible.
5. World-card border and caption surface are visibly separated from the night background; descriptions are readable.
6. Resident cards use a 4:3 image area, visible border and soft shadow; heading, rule and link share one baseline.
7. Both handwritten process notes sit in clear space and remain fully readable.
8. Header logo is 44 × 44 px with no filter, opacity or blend-mode washout.
9. Feature labels, descriptions, proof line and icons have the approved visual weight; dividers are shortened.
10. Botanical ornaments are visible in section corners without entering body-copy areas.
11. At 390 px the green dragon is visible and the handwritten hero note does not collide with the subtitle.

## Required fidelity surfaces

- Fonts and typography: Cormorant Garamond and Manrope retained; hero wrapping, feature sizing and card-description sizing verified.
- Spacing and layout rhythm: one aligned shell; section order and light/dark rhythm unchanged; desktop and mobile cards retain approved geometry.
- Colors and tokens: approved paper, night, wine and gold tokens retained.
- Image quality and asset fidelity: existing workshop photography retained; all five world crops checked visually; 0 broken images in final captures.
- Copy and content: approved world text retained character-for-character; resident prices now come from data with the existing fallback.

## Comparison history

- Pass 1: found oversized hero copy/buttons, empty world landscapes, flat resident crops, weak CTA image, faint borders/ornaments and mobile hero crop drift.
- Fixes: updated scoped homepage CSS and homepage render helpers only.
- Pass 2 evidence: full-page desktop and mobile captures listed above; focused source/implementation comparison covered hero, process, worlds and residents. All listed P1/P2 findings are closed.

## Browser verification

- Cloud-browser render checked at 1440 × 1000 and 390 × 844.
- Carousel next control advances the active dot.
- Mobile menu opens and reports `aria-expanded="true"`.
- No console errors from `terminal.local`.
- `/residents.html`, `/collections.html`, `/collection.html?world=winter`, `/process.html`, `/contact.html` checked at 1440 and 390: no horizontal overflow and no broken images.

## Automated checks

- `npm run studio:check`: passed.
- `npm run studio:test`: blocked by missing local Playwright Chromium executable. Browser download was attempted but the runtime returned an invalid/truncated archive. Equivalent public-route checks were completed in the cloud browser; the repository test command itself could not turn green in this environment.

final result: passed

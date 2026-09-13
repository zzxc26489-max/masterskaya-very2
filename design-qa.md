# Design QA — главная «Мастерская Веры»

- source visual truth path: `/workspace/scratch/ed2aa203bf0e/upload/01-1000094695.png`
- source pixels: 1024 × 1536, composite desktop/mobile reference
- desktop implementation screenshot: `/workspace/scratch/masterskaya-desktop-final.jpg`
- desktop comparison: `/workspace/scratch/masterskaya-desktop-comparison-final.jpg`
- desktop viewport: 1363 × 936 CSS px; screenshot: 1348 × 2696 px
- mobile implementation screenshot: `/workspace/scratch/masterskaya-mobile-final-390.jpg`
- mobile comparison: `/workspace/scratch/masterskaya-mobile-comparison-final.jpg`
- state: homepage, all lazy images loaded, no broken images, no horizontal overflow

## Mobile fidelity

1. Header is the approved compact logo-and-hamburger row.
2. Hero uses a dedicated narrow art-directed image; the green dragon, orange dragon, residents and candle are all visible.
3. Hero copy, handwritten note, stacked full-width buttons and proof line follow the reference hierarchy.
4. Workshop content is single-column; three process photographs are a compact row and the three feature blocks are stacked with dividers.
5. Worlds use one centered card, circular previous/next controls, five dots and a full-width action.
6. Residents use three compact horizontal rows and a full-width action.
7. The approved mobile sequence moves directly from Residents to the stacked footer.
8. Final page height is 2679 px versus 2686 px in the reference crop.
9. Mobile menu opens/closes and updates `aria-expanded`; the worlds carousel advances its active dot.

## Desktop fidelity

1. Header is 95 px and hero is 625 px, matching the approved composition.
2. Hero heading is locked to two lines and protected by a dense left-side shade; buttons remain content-width and stacked.
3. A new 1920 × 900 desktop hero asset reproduces the approved candlelit group scene and crop.
4. Workshop is 591 px; its copy, three tilted prints, handwritten notes and feature row retain the approved geometry.
5. Worlds is 562 px; all five gold-framed cards contain a readable figurine and the approved Russian copy.
6. Residents is 392 px; heading, rule and link share a row and all three bordered cards have the approved wide photographic crop.
7. CTA is 174 px; desk, sketches and inkwell remain visible behind the centered copy.
8. Footer remains a compact three-column dark band with gold rules and corner ornaments.
9. All sections use one aligned content shell; ornaments remain outside the reading column.

## Browser verification

- Homepage: 0 broken images and no horizontal overflow.
- `/residents.html`, `/collections.html`, `/collection.html?world=winter-legends`, `/process.html`, `/contact.html`: correct page title/H1, 0 broken images and no horizontal overflow.
- No application errors from `terminal.local`; only the cloud-browser extension emitted its own metadata errors.

## Automated checks

- `npm run studio:check`: passed.
- `npm run studio:test`: blocked by the missing Playwright Chromium executable at the path expected by the repository test runner. Equivalent visual and route checks were completed in the cloud browser.

final result: passed

/* Builds the site's self-hosted fonts.

   Two things matter here. First, only the faces the CSS actually uses are
   fetched — the design needs Cormorant Garamond 500 (upright for headings,
   italic for the hero accent) and Manrope 400/600/700, not the nine weights
   the old Google link asked for. Second, each face is cut down to the glyphs
   a Russian page can show: full Cyrillic, Latin letters, digits and
   punctuation. Google's own latin file for Cormorant is 37 KB because it
   carries every accented European letter; subset, it is a fraction of that.

   Needs fonttools:  pip install fonttools brotli
   Run from the repo root:  node studio/scripts/build-fonts.mjs               */

import { execFileSync } from 'node:child_process';

// The proxy in front of this network occasionally stalls a connection outright,
// so every fetch gets a deadline and a couple of retries rather than hanging.
function curl(args) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return execFileSync('curl', ['-sS', '--max-time', '45', '--retry', '2', ...args], { maxBuffer: 8e6 });
    } catch (error) {
      if (attempt >= 3) throw error;
      console.log(`    повтор ${attempt}...`);
    }
  }
}
import { mkdirSync, writeFileSync, rmSync, statSync, readdirSync } from 'node:fs';

const DIR = 'studio/public/assets/fonts';
const TMP = '/tmp/font-src';

// Google's legacy /css endpoint hands a whole TrueType file to a browser too
// old for woff — which is exactly what subsetting wants, one complete charset
// instead of a dozen unicode-range slices.
const OLD_UA = 'Mozilla/5.0 (Linux; U; Android 2.2; en-us; DROID2 Build/VZW) AppleWebKit/533.1';

// query for the legacy endpoint, family name to emit, weight, style
const FACES = [
  ['Cormorant+Garamond:500', 'Cormorant Garamond', 500, 'normal'],
  ['Cormorant+Garamond:500italic', 'Cormorant Garamond', 500, 'italic'],
  ['Manrope:400', 'Manrope', 400, 'normal'],
  ['Manrope:600', 'Manrope', 600, 'normal'],
  ['Manrope:700', 'Manrope', 700, 'normal']
];

// Cyrillic (with Ё), Latin-1 letters and digits, the punctuation the copy
// uses (— – « » … ·), the ruble sign and №.
const UNICODES = 'U+0020-007E,U+00A0,U+00AB,U+00BB,U+0401,U+0410-044F,U+0451,'
  + 'U+2010-2015,U+2018-201F,U+2022,U+2026,U+2030,U+00B7,U+20BD,U+2116,U+2192,U+2197,U+00D7';

rmSync(DIR, { recursive: true, force: true });
rmSync(TMP, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
mkdirSync(TMP, { recursive: true });

const css = [];
let total = 0;

for (const [query, family, weight, style] of FACES) {
  const sheet = curl(['-A', OLD_UA,
    `https://fonts.googleapis.com/css?family=${query}&subset=cyrillic,latin`]).toString();
  const source = sheet.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/)?.[1];
  if (!source) throw new Error(`не нашёл файл шрифта для ${family} ${weight} ${style}`);

  const slug = `${family.toLowerCase().replace(/\s+/g, '-')}-${weight}${style === 'italic' ? '-italic' : ''}`;
  const raw = `${TMP}/${slug}.ttf`;
  const out = `${DIR}/${slug}.woff2`;
  curl(['-A', OLD_UA, '-o', raw, source]);
  execFileSync('pyftsubset', [raw, `--unicodes=${UNICODES}`, '--layout-features=kern,liga',
    '--flavor=woff2', `--output-file=${out}`]);

  const before = statSync(raw).size, after = statSync(out).size;
  total += after;
  console.log(`  ${slug.padEnd(30)} ${(before / 1024).toFixed(0).padStart(4)} КБ → ${(after / 1024).toFixed(0).padStart(3)} КБ`);

  css.push(`@font-face {\n  font-family: '${family}';\n  font-style: ${style};\n  font-weight: ${weight};`
    + `\n  font-display: swap;\n  src: url(../fonts/${slug}.woff2) format('woff2');\n}`);
}

writeFileSync('studio/public/assets/css/fonts.css',
  `/* Self-hosted and subset — rebuild with: node studio/scripts/build-fonts.mjs\n`
  + `   Only the faces the design uses, cut to Cyrillic + Latin + punctuation. */\n\n${css.join('\n\n')}\n`);
rmSync(TMP, { recursive: true, force: true });
console.log(`\nитого ${readdirSync(DIR).length} файлов, ${(total / 1024).toFixed(0)} КБ`);

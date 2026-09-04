/* Builds the 800px phone copy of every large photo and refreshes the manifest
   in assets/js/media.js. Run from the repo root after adding new photos:

     node studio/scripts/build-phone-images.mjs                                */
import sharp from 'sharp';
import { readdirSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = 'studio/public/media';
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.webp$/i.test(name) && !/-800\.webp$/i.test(name)) files.push(path);
  }
})(root);

const manifest = [];
let saved = 0;
for (const path of files) {
  const meta = await sharp(path).metadata();
  if (meta.width <= 900) continue;
  const out = path.replace(/\.webp$/i, '-800.webp');
  const buf = await sharp(path).resize({ width: 800, withoutEnlargement: true }).webp({ quality: 76, effort: 5 }).toBuffer();
  writeFileSync(out, buf);
  saved += statSync(path).size - buf.length;
  manifest.push('/' + path.replace('studio/public/', ''));
}
manifest.sort();

const modulePath = 'studio/public/assets/js/media.js';
const source = readFileSync(modulePath, 'utf8');
const open = '/* GENERATED — run: node studio/scripts/build-phone-images.mjs */';
const close = '/* END GENERATED */';
const block = `${open}\nexport const PHONE_COPIES = new Set(${JSON.stringify(manifest, null, 2)});\n${close}`;
const start = source.indexOf(open);
if (start === -1) throw new Error('manifest markers missing in media.js');
const end = source.indexOf(close, start) + close.length;
writeFileSync(modulePath, source.slice(0, start) + block + source.slice(end));

console.log(`создано ${manifest.length} мобильных версий, экономия на телефоне: ${(saved/1048576).toFixed(1)} МБ`);

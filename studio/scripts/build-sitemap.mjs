/* Writes sitemap.xml and robots.txt for a built site.

   The hand-written sitemap only listed the seven static pages, so the sixteen
   Жители and five Миры — the pages someone would actually search for — were
   invisible to search engines. This builds the full list from the content, so
   it stays right as Vera adds work.

   Usage:  node studio/scripts/build-sitemap.mjs <outDir> <origin>
   e.g.    node studio/scripts/build-sitemap.mjs _site https://verlepit.ru      */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [outDir, rawOrigin] = process.argv.slice(2);
if (!outDir || !rawOrigin) {
  console.error('нужно: node studio/scripts/build-sitemap.mjs <папка> <https://домен>');
  process.exit(1);
}
const origin = rawOrigin.replace(/\/+$/, '');
const content = JSON.parse(readFileSync(join(outDir, 'content.json'), 'utf8'));

const today = new Date().toISOString().slice(0, 10);
const urls = [
  ['/', '1.0'],
  ['/residents.html', '0.9'],
  ['/collections.html', '0.9'],
  ['/process.html', '0.7'],
  ['/about.html', '0.7'],
  ['/contact.html', '0.6'],
  ['/create.html', '0.5']
];

// One entry per Мир and per Житель — these are the pages with the story on
// them, and the ones worth finding from a search.
content.collections.forEach((world) => {
  urls.push([`/collection.html?world=${encodeURIComponent(world.slug || world.id)}`, '0.8']);
});
content.residents.forEach((resident) => {
  urls.push([`/chronicle.html?resident=${encodeURIComponent(resident.slug || resident.id)}`, '0.7']);
});

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(([path, priority]) =>
    `  <url><loc>${origin}${path.replace(/&/g, '&amp;')}</loc><lastmod>${today}</lastmod><priority>${priority}</priority></url>`),
  '</urlset>',
  ''
].join('\n');
writeFileSync(join(outDir, 'sitemap.xml'), xml);

writeFileSync(join(outDir, 'robots.txt'), [
  'User-agent: *',
  'Allow: /',
  'Disallow: /admin',
  'Disallow: /api/',
  '',
  `Sitemap: ${origin}/sitemap.xml`,
  ''
].join('\n'));

console.log(`карта сайта: ${urls.length} адресов (${content.collections.length} Миров, ${content.residents.length} Жителей) → ${origin}`);

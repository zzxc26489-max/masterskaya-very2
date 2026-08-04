import fs from 'node:fs/promises';
import path from 'node:path';

const [seedFile, overridesFile, outputFile] = process.argv.slice(2);

if (!seedFile || !overridesFile || !outputFile) {
  throw new Error('Usage: node build-content.mjs <seed.json> <overrides.json> <output.json>');
}

const [seed, overrides] = await Promise.all([
  fs.readFile(seedFile, 'utf8').then(JSON.parse),
  fs.readFile(overridesFile, 'utf8').then(JSON.parse)
]);

const mergeNested = (base = {}, patch = {}) => ({
  ...base,
  ...patch,
  chronicle: patch.chronicle ? { ...(base.chronicle || {}), ...patch.chronicle } : base.chronicle
});

const collectionOverrides = overrides.collections || {};
const residentOverrides = overrides.residents || {};

const finalContent = {
  ...seed,
  collections: seed.collections.map((collection) => ({
    ...collection,
    ...(collectionOverrides[collection.id] || {})
  })),
  residents: seed.residents.map((resident) => mergeNested(
    resident,
    residentOverrides[resident.id] || residentOverrides[resident.slug] || {}
  ))
};

for (const [id, patch] of Object.entries(residentOverrides)) {
  const resident = finalContent.residents.find((item) => item.id === id || item.slug === id);
  if (!resident) throw new Error(`Resident override does not match seed data: ${id}`);
  if (patch.heroImage && resident.heroImage !== patch.heroImage) {
    throw new Error(`Hero image override was not applied: ${id}`);
  }
}

await fs.mkdir(path.dirname(outputFile), { recursive: true });
await fs.writeFile(outputFile, `${JSON.stringify(finalContent, null, 2)}\n`, 'utf8');

console.log(`Final content written: ${outputFile}`);
console.log(`Residents: ${finalContent.residents.length}`);

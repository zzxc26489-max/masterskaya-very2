/* Phone copies of the photos.

   Every media file wider than 900px is built with an 800px companion beside it
   (studio/scripts/build-phone-images.mjs writes both the files and the list
   below). Shared by site.js and site-enhancements.js so both agree on which
   photos actually have a small version — pointing at one that was never built
   would 404 on exactly the phones it was meant for. */

/* GENERATED — run: node studio/scripts/build-phone-images.mjs */
export const PHONE_COPIES = new Set([
  "/media/collections/forest/gnome.webp",
  "/media/collections/forest/mushrooms.webp",
  "/media/hero/atelier-group-temp.webp",
  "/media/process/02-foil.webp",
  "/media/process/03-first-clay.webp",
  "/media/process/04-silhouette.webp",
  "/media/process/05-character.webp",
  "/media/process/06-unpainted.webp",
  "/media/process/07-first-paint.webp",
  "/media/process/08-finished.webp",
  "/media/residents/azimondias/armature.webp",
  "/media/residents/azimondias/final.webp",
  "/media/residents/azimondias/hero.webp",
  "/media/residents/azimondias/sculpture.webp",
  "/media/residents/baby-dragon/angle.webp",
  "/media/residents/baby-dragon/hero.webp",
  "/media/residents/chicken/angle.webp",
  "/media/residents/chicken/hero.webp",
  "/media/residents/forest-dragon/hero.webp",
  "/media/residents/forest-dragon/portrait.webp",
  "/media/residents/forest-dragon/studio.webp",
  "/media/residents/gorynych/amber-angle.webp",
  "/media/residents/gorynych/amber-hero.webp",
  "/media/residents/gorynych/crowned-hero.webp",
  "/media/residents/horse/hero.webp",
  "/media/residents/horse/studio.webp",
  "/media/residents/mermaid/angle.webp",
  "/media/residents/mermaid/hero.webp",
  "/media/residents/mouse-king/studio.webp",
  "/media/residents/mouse-queen/angle.webp",
  "/media/residents/mouse-queen/hero.webp",
  "/media/residents/mushrooms/basket.webp",
  "/media/residents/mushrooms/hero.webp",
  "/media/residents/nutcracker/detail.webp",
  "/media/residents/nutcracker/portrait.webp",
  "/media/residents/nutcracker/studio.webp",
  "/media/residents/puss-in-boots/armature.webp",
  "/media/residents/puss-in-boots/details.webp",
  "/media/residents/puss-in-boots/hero.webp",
  "/media/residents/puss-in-boots/pair-angle.webp",
  "/media/residents/puss-in-boots/pair.webp",
  "/media/scenes/azimondias.webp",
  "/media/scenes/baby-dragon.webp",
  "/media/scenes/chicken-sun.webp",
  "/media/scenes/forest-dragon.webp",
  "/media/scenes/forest-mushrooms.webp",
  "/media/scenes/gorynych-amber.webp",
  "/media/scenes/gorynych-green.webp",
  "/media/scenes/little-humpbacked-horse.webp",
  "/media/scenes/mermaid.webp",
  "/media/scenes/mouse-king.webp",
  "/media/scenes/mouse-queen.webp",
  "/media/scenes/nutcracker-ernst.webp",
  "/media/scenes/rocking-horse.webp",
  "/media/scenes/sirin.webp",
  "/media/scenes/soul-regan.webp",
  "/media/sets/winter-gift.webp",
  "/media/worlds/dragons-scene.webp",
  "/media/worlds/forest-scene.webp",
  "/media/worlds/home-scene.webp",
  "/media/worlds/russian-scene.webp",
  "/media/worlds/winter-scene.webp"
]);
/* END GENERATED */

// The 800px companion for a photo, or '' when none was built for it. Content
// paths carry a ?v= cache tag, so the lookup has to ignore the query.
export function phoneCopy(src = '') {
  const [path, search] = String(src).split('?');
  if (!PHONE_COPIES.has(path)) return '';
  return `${path.replace(/\.webp$/, '-800.webp')}${search ? `?${search}` : ''}`;
}

export const PHONE_SIZES = '(max-width: 48rem) 100vw, 1400px';

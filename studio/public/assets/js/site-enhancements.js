import { phoneCopy, PHONE_SIZES } from './media.js';

const pageName = document.body.dataset.page || 'home';
// GitHub Pages project sites live under /<repo>/, so root-relative media
// paths need that prefix stitched back in. Any other static host (Beget, a
// real domain later) serves from its own root, where '/media/...' already
// resolves — no rewriting needed there.
const staticPreview = window.location.hostname.endsWith('.github.io');
const mobileQuery = window.matchMedia('(max-width: 48rem)');
const staticBase = staticPreview ? new URL('content.json', window.location.href) : null;
const normalize = (value = '') => String(value).trim().toLocaleLowerCase('ru-RU');
const mediaUrl = (value = '') => {
  if (!value?.startsWith('/') || !staticPreview) return value;
  return new URL(value.slice(1), staticBase).href;
};

// Same fallback as the main app: prefer the live API, drop to the static
// snapshot when there is no server to ask.
async function fetchContent() {
  try {
    const response = await fetch('/api/content', { cache: 'no-store' });
    if (response.ok) return response;
  } catch { /* no server here — fall through */ }
  return fetch('content.json', { cache: 'no-store' });
}

function residentMap(data) {
  const map = new Map();
  data.residents.forEach((resident) => {
    [resident.id, resident.slug, resident.name, resident.shortName]
      .filter(Boolean)
      .forEach((key) => map.set(normalize(key), resident));
  });
  return map;
}

// focus/mobileFocus were measured against the studio shot — where the Житель
// often sits off to one side. The world photos are composed with them in the
// middle, so those numbers would shove the subject out of frame; centre is
// right for a scene.
function focusFor(resident, { mobile = false, scene = false } = {}) {
  if (!resident || scene) return 'center';
  return mobile
    ? (resident.mobileFocus || resident.focus || 'center')
    : (resident.focus || 'center');
}

// Which photo a slot wants. 'scene' is the Житель standing in their own world
// — that is what a card, a slide and the Chronicle header show. 'studio' is
// the bare shot of the work itself, used where the page is talking about
// Vera's hands rather than about one Житель.
function sourceFor(resident, want) {
  if (mobileQuery.matches && resident.mobileImage) return resident.mobileImage;
  return want === 'studio' ? resident.heroImage : (resident.sceneImage || resident.heroImage);
}

function setImage(image, resident, { eager = false, want = 'scene' } = {}) {
  if (!image || !resident?.heroImage) return;
  const raw = sourceFor(resident, want);
  const scene = raw === resident.sceneImage;
  // A srcset left over from the previous photo would win over the new src and
  // quietly show the wrong Житель, so it is always rewritten or dropped.
  const small = phoneCopy(raw);
  if (small) {
    image.srcset = `${mediaUrl(small)} 800w, ${mediaUrl(raw)} 1400w`;
    image.sizes = PHONE_SIZES;
  } else {
    image.removeAttribute('srcset');
  }
  image.src = mediaUrl(raw);
  image.alt = scene ? `${resident.name} в своём мире` : `${resident.name} — работа Веры`;
  image.style.setProperty('--resident-focus', focusFor(resident, { scene }));
  image.style.setProperty('--resident-focus-mobile', focusFor(resident, { scene, mobile: true }));
  image.decoding = 'async';
  if (eager) {
    image.loading = 'eager';
    image.fetchPriority = 'high';
  }
}

function cleanChronicleGallery() {
  document.querySelectorAll('section').forEach((section) => {
    if (section.querySelector('h2')?.textContent?.trim() !== 'Рассмотреть ближе') return;
    const gallery = section.querySelector('.gallery');
    if (!gallery) {
      section.remove();
      return;
    }

    const seen = new Set();
    [...gallery.children].forEach((item) => {
      const media = item.querySelector('img, video');
      const source = media?.currentSrc || media?.src || '';
      if (!source || seen.has(source)) item.remove();
      else seen.add(source);
    });

    if (!gallery.children.length) section.remove();
  });
}

function upgrade(data) {
  const lookup = residentMap(data);

  document.querySelectorAll('.resident-card').forEach((card) => {
    const resident = lookup.get(normalize(card.querySelector('h3')?.textContent));
    if (!resident) return;
    card.dataset.resident = resident.id;
    card.dataset.showcase = resident.showcase === false ? 'false' : 'true';
    card.style.setProperty('--resident-focus', focusFor(resident, { scene: true }));
    card.style.setProperty('--resident-focus-mobile', focusFor(resident, { scene: true, mobile: true }));
    setImage(card.querySelector('.resident-card__image img'), resident);
  });

  document.querySelectorAll('.world-resident').forEach((slide) => {
    const resident = lookup.get(normalize(slide.querySelector('h2')?.textContent));
    if (!resident) return;
    slide.dataset.resident = resident.id;
    slide.dataset.showcase = resident.showcase === false ? 'false' : 'true';
    slide.style.setProperty('--resident-focus', focusFor(resident, { scene: true }));
    slide.style.setProperty('--resident-focus-mobile', focusFor(resident, { scene: true, mobile: true }));
    setImage(slide.querySelector('.world-resident__photo img'), resident);
  });

  document.querySelectorAll('.world-slider__rail button').forEach((button) => {
    const resident = lookup.get(normalize(button.querySelector('span')?.textContent));
    if (!resident) return;
    button.dataset.resident = resident.id;
    button.dataset.showcase = resident.showcase === false ? 'false' : 'true';
    setImage(button.querySelector('img'), resident);
  });

  const forest = lookup.get('forest-dragon');
  if (forest) {
    document.querySelectorAll('.manifesto-portrait img, .about-image img')
      .forEach((image) => setImage(image, forest, { want: 'studio' }));
  }

  if (pageName === 'chronicle') {
    const key = new URLSearchParams(location.search).get('resident');
    const resident = lookup.get(normalize(key)) || data.residents.find((item) => item.showcase !== false);
    const hero = document.querySelector('.chronicle-hero');
    if (hero && resident) {
      hero.dataset.resident = resident.id;
      hero.style.setProperty('--hero-focus', focusFor(resident, { scene: true }));
      hero.style.setProperty('--hero-focus-mobile', focusFor(resident, { scene: true, mobile: true }));
      setImage(hero.querySelector('.chronicle-hero__scene'), resident, { eager: true });
    }
    cleanChronicleGallery();
  }

  document.documentElement.classList.add('resident-worlds-ready');
}

async function run() {
  const response = await fetchContent();
  if (!response.ok) throw new Error(`Content request failed: ${response.status}`);
  const data = await response.json();
  const apply = () => document.querySelector('#app main') ? (upgrade(data), true) : false;
  if (!apply()) {
    const observer = new MutationObserver(() => {
      if (apply()) observer.disconnect();
    });
    observer.observe(document.querySelector('#app'), { childList: true, subtree: true });
  }
}

run().catch(() => {
  document.documentElement.classList.add('resident-worlds-fallback');
});

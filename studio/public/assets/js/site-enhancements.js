const pageName = document.body.dataset.page || 'home';
const staticPreview = window.location.hostname.endsWith('.github.io');
const staticRoot = staticPreview
  ? `/${window.location.pathname.split('/').filter(Boolean)[0] || ''}`.replace(/\/$/, '')
  : '';
const mobileQuery = window.matchMedia('(max-width: 48rem)');
const contentUrl = staticPreview ? new URL('content.json', window.location.href).href : '/api/content';
const normalize = (value = '') => String(value).trim().toLocaleLowerCase('ru-RU');
const mediaUrl = (value = '') => value?.startsWith('/') && staticPreview ? `${staticRoot}${value}` : value;
const verifiedWorlds = window.__VERIFIED_WORLDS || {};

const collectionRepresentative = {
  'Зимние легенды': 'nutcracker-ernst',
  'Тайны древнего леса': 'forest-dragon',
  'Древние существа': 'azimondias',
  'Русские сказки': 'sirin',
  'Домашние легенды': 'rocking-horse'
};

function residentMap(data) {
  const map = new Map();
  data.residents.forEach((resident) => {
    [resident.id, resident.slug, resident.name, resident.shortName]
      .filter(Boolean)
      .forEach((key) => map.set(normalize(key), resident));
  });
  return map;
}

function sourceFor(resident) {
  return verifiedWorlds[resident?.id]
    || mediaUrl(mobileQuery.matches && resident?.mobileImage ? resident.mobileImage : resident?.heroImage || '');
}

function focusFor(resident, mobile = false) {
  if (resident?.id === 'nutcracker-ernst') return mobile ? '66% center' : '72% center';
  if (resident?.id === 'forest-dragon') return mobile ? '68% center' : '72% center';
  return mobile
    ? (resident?.mobileFocus || resident?.focus || '68% center')
    : (resident?.focus || '72% center');
}

function setImage(image, resident, eager = false) {
  if (!image || !resident) return;
  image.src = sourceFor(resident);
  image.alt = `${resident.name} в своём мире`;
  image.style.setProperty('--resident-focus', focusFor(resident));
  image.style.setProperty('--resident-focus-mobile', focusFor(resident, true));
  image.decoding = 'async';
  if (eager) {
    image.loading = 'eager';
    image.fetchPriority = 'high';
  }
}

function removeBadChronicleGallery() {
  document.querySelectorAll('section').forEach((section) => {
    if (section.querySelector('h2')?.textContent?.trim() === 'Рассмотреть ближе') {
      section.remove();
    }
  });
}

function upgrade(data) {
  const lookup = residentMap(data);

  document.querySelectorAll('.resident-card').forEach((card) => {
    const resident = lookup.get(normalize(card.querySelector('h3')?.textContent));
    if (!resident) return;
    card.dataset.resident = resident.id;
    if (resident.showcase === false) {
      card.hidden = true;
      return;
    }
    card.style.setProperty('--resident-focus', focusFor(resident));
    card.style.setProperty('--resident-focus-mobile', focusFor(resident, true));
    if (verifiedWorlds[resident.id]) {
      setImage(card.querySelector('.resident-card__image img'), resident);
    }
  });

  document.querySelectorAll('.world-resident').forEach((slide) => {
    const resident = lookup.get(normalize(slide.querySelector('h2')?.textContent));
    if (!resident) return;
    slide.dataset.resident = resident.id;
    if (resident.showcase === false) {
      slide.hidden = true;
      return;
    }
    slide.style.setProperty('--resident-focus', focusFor(resident));
    slide.style.setProperty('--resident-focus-mobile', focusFor(resident, true));
    if (verifiedWorlds[resident.id]) {
      setImage(slide.querySelector('.world-resident__photo img'), resident);
    }
  });

  document.querySelectorAll('.world-slider__rail button').forEach((button) => {
    const resident = lookup.get(normalize(button.querySelector('span')?.textContent));
    if (!resident) return;
    if (resident.showcase === false) {
      button.hidden = true;
      return;
    }
    if (verifiedWorlds[resident.id]) setImage(button.querySelector('img'), resident);
  });

  document.querySelectorAll('.world-chapter').forEach((chapter) => {
    const residentId = collectionRepresentative[chapter.querySelector('h3')?.textContent?.trim()];
    const resident = lookup.get(normalize(residentId));
    if (resident && verifiedWorlds[resident.id]) {
      setImage(chapter.querySelector('.world-chapter__resident img'), resident);
    }
  });

  const forest = lookup.get('forest-dragon');
  if (forest) {
    document.querySelectorAll('.manifesto-portrait img, .about-image img')
      .forEach((image) => setImage(image, forest));
  }

  if (pageName === 'chronicle') {
    const key = new URLSearchParams(location.search).get('resident');
    const resident = lookup.get(normalize(key)) || data.residents[0];
    const hero = document.querySelector('.chronicle-hero');
    if (hero && resident) {
      hero.dataset.resident = resident.id;
      hero.style.setProperty('--hero-focus', focusFor(resident));
      hero.style.setProperty('--hero-focus-mobile', focusFor(resident, true));
      setImage(hero.querySelector('.chronicle-hero__scene'), resident, true);
    }
    removeBadChronicleGallery();
  }

  document.documentElement.classList.add('resident-worlds-ready');
}

async function run() {
  const response = await fetch(contentUrl, { cache: 'no-store' });
  if (!response.ok) return;
  const data = await response.json();
  const apply = () => document.querySelector('#app main') ? (upgrade(data), true) : false;
  if (!apply()) {
    const observer = new MutationObserver(() => {
      if (apply()) observer.disconnect();
    });
    observer.observe(document.querySelector('#app'), { childList: true, subtree: true });
  }
}

run().catch(() => {});

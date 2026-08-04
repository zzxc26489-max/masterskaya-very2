const pageName = document.body.dataset.page || 'home';
const staticPreview = window.location.hostname.endsWith('.github.io');
const staticRoot = staticPreview
  ? `/${window.location.pathname.split('/').filter(Boolean)[0] || ''}`.replace(/\/$/, '')
  : '';
const mobileQuery = window.matchMedia('(max-width: 48rem)');
const contentUrl = staticPreview ? new URL('content.json', window.location.href).href : '/api/content';
const normalize = (value = '') => String(value).trim().toLocaleLowerCase('ru-RU');
const mediaUrl = (value = '') => value?.startsWith('/') && staticPreview ? `${staticRoot}${value}` : value;

function residentMap(data) {
  const map = new Map();
  data.residents.forEach((resident) => {
    [resident.id, resident.slug, resident.name, resident.shortName]
      .filter(Boolean)
      .forEach((key) => map.set(normalize(key), resident));
  });
  return map;
}

function focusFor(resident, mobile = false) {
  if (!resident) return 'center';
  return mobile
    ? (resident.mobileFocus || resident.focus || 'center')
    : (resident.focus || 'center');
}

function setImage(image, resident, eager = false) {
  if (!image || !resident?.heroImage) return;
  const source = mediaUrl(mobileQuery.matches && resident.mobileImage ? resident.mobileImage : resident.heroImage);
  image.src = source;
  image.alt = `${resident.name} в своём мире`;
  image.style.setProperty('--resident-focus', focusFor(resident));
  image.style.setProperty('--resident-focus-mobile', focusFor(resident, true));
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
    card.style.setProperty('--resident-focus', focusFor(resident));
    card.style.setProperty('--resident-focus-mobile', focusFor(resident, true));
    setImage(card.querySelector('.resident-card__image img'), resident);
  });

  document.querySelectorAll('.world-resident').forEach((slide) => {
    const resident = lookup.get(normalize(slide.querySelector('h2')?.textContent));
    if (!resident) return;
    slide.dataset.resident = resident.id;
    slide.dataset.showcase = resident.showcase === false ? 'false' : 'true';
    slide.style.setProperty('--resident-focus', focusFor(resident));
    slide.style.setProperty('--resident-focus-mobile', focusFor(resident, true));
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
      .forEach((image) => setImage(image, forest));
  }

  if (pageName === 'chronicle') {
    const key = new URLSearchParams(location.search).get('resident');
    const resident = lookup.get(normalize(key)) || data.residents.find((item) => item.showcase !== false);
    const hero = document.querySelector('.chronicle-hero');
    if (hero && resident) {
      hero.dataset.resident = resident.id;
      hero.style.setProperty('--hero-focus', focusFor(resident));
      hero.style.setProperty('--hero-focus-mobile', focusFor(resident, true));
      setImage(hero.querySelector('.chronicle-hero__scene'), resident, true);
    }
    cleanChronicleGallery();
  }

  document.documentElement.classList.add('resident-worlds-ready');
}

async function run() {
  const response = await fetch(contentUrl, { cache: 'no-store' });
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

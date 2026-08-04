const pageName = document.body.dataset.page || 'home';
const staticPreview = window.location.hostname.endsWith('.github.io');
const staticRoot = staticPreview
  ? `/${window.location.pathname.split('/').filter(Boolean)[0] || ''}`.replace(/\/$/, '')
  : '';
const mobileQuery = window.matchMedia('(max-width: 48rem)');

const mediaUrl = (value = '') => {
  if (!value || !value.startsWith('/') || !staticPreview) return value;
  return `${staticRoot}${value}`;
};

const contentUrl = staticPreview
  ? new URL('content.json', window.location.href).href
  : '/api/content';

const normalize = (value = '') => String(value).trim().toLocaleLowerCase('ru-RU');

const collectionRepresentative = {
  'Зимние легенды': 'nutcracker-ernst',
  'Тайны древнего леса': 'forest-dragon',
  'Древние существа': 'azimondias',
  'Русские сказки': 'sirin',
  'Домашние легенды': 'rocking-horse'
};

function statusClass(status) {
  return {
    available: 'status--available',
    'in-progress': 'status--in-progress',
    reserved: 'status--reserved',
    archive: 'status--archive'
  }[status] || '';
}

function statusText(status) {
  return {
    available: 'Можно приобрести',
    'in-progress': 'В работе',
    reserved: 'Уже выбрали',
    archive: 'Нашёл Хранителя'
  }[status] || 'Хроника Мастерской';
}

function residentLookup(data) {
  const map = new Map();
  data.residents.forEach((resident) => {
    [resident.id, resident.slug, resident.name, resident.shortName]
      .filter(Boolean)
      .forEach((key) => map.set(normalize(key), resident));
  });
  return map;
}

function chooseImage(resident) {
  return mediaUrl(mobileQuery.matches && resident.mobileImage ? resident.mobileImage : resident.heroImage);
}

function setResidentImage(image, resident) {
  if (!image || !resident?.heroImage) return;
  image.dataset.desktopSrc = mediaUrl(resident.heroImage);
  image.dataset.mobileSrc = mediaUrl(resident.mobileImage || resident.heroImage);
  image.src = chooseImage(resident);
  image.style.setProperty('--resident-focus', resident.focus || '72% center');
  image.style.setProperty('--resident-focus-mobile', resident.mobileFocus || resident.focus || '72% center');
  image.decoding = 'async';
}

function upgradeCards(lookup) {
  document.querySelectorAll('.resident-card').forEach((card) => {
    const resident = lookup.get(normalize(card.querySelector('h3')?.textContent));
    if (!resident) return;

    card.dataset.resident = resident.id;
    if (resident.showcase === false) {
      card.hidden = true;
      return;
    }

    card.style.setProperty('--resident-focus', resident.focus || '72% center');
    card.style.setProperty('--resident-focus-mobile', resident.mobileFocus || resident.focus || '72% center');
    setResidentImage(card.querySelector('.resident-card__image img'), resident);

    const badge = card.querySelector('.status');
    if (badge) {
      badge.className = `status ${statusClass(resident.availability)}`;
      badge.textContent = statusText(resident.availability);
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

    slide.style.setProperty('--resident-focus', resident.focus || '72% center');
    setResidentImage(slide.querySelector('.world-resident__photo img'), resident);
  });

  document.querySelectorAll('.world-slider__rail button').forEach((button) => {
    const resident = lookup.get(normalize(button.querySelector('span')?.textContent));
    if (!resident) return;
    if (resident.showcase === false) {
      button.hidden = true;
      return;
    }
    setResidentImage(button.querySelector('img'), resident);
  });
}

function upgradeChronicle(data, lookup) {
  if (pageName !== 'chronicle') return;

  const key = new URLSearchParams(window.location.search).get('resident');
  const resident = lookup.get(normalize(key)) || data.residents.find((item) => item.showcase !== false);
  if (!resident) return;

  const hero = document.querySelector('.chronicle-hero');
  const scene = hero?.querySelector('.chronicle-hero__scene');
  const shell = hero?.querySelector('.shell');
  if (!hero || !scene || !shell) return;

  hero.dataset.resident = resident.id;
  hero.style.setProperty('--hero-focus', resident.focus || '72% center');
  hero.style.setProperty('--hero-focus-mobile', resident.mobileFocus || resident.focus || '72% center');
  setResidentImage(scene, resident);
  scene.alt = `${resident.name} в своём мире`;
  scene.fetchPriority = 'high';
  scene.loading = 'eager';

  if (!shell.querySelector('.chronicle-hero__status')) {
    const badge = document.createElement('span');
    badge.className = `status ${statusClass(resident.availability)} chronicle-hero__status`;
    badge.textContent = statusText(resident.availability);
    shell.prepend(badge);
  }

  const actions = document.querySelector('.resident-detail__copy .cluster');
  if (actions && !shell.querySelector('.chronicle-hero__actions')) {
    const clone = actions.cloneNode(true);
    clone.classList.add('chronicle-hero__actions');
    shell.append(clone);
  }

  document.querySelectorAll('.resident-detail, .gallery').forEach((section) => {
    section.style.setProperty('--resident-focus', resident.focus || '72% center');
    section.style.setProperty('--resident-focus-mobile', resident.mobileFocus || resident.focus || '72% center');
  });

  document.querySelectorAll('.resident-detail__image img, .gallery img')
    .forEach((image) => setResidentImage(image, resident));
}

function replaceGenericResidentImages(lookup) {
  const forest = lookup.get('forest-dragon');
  if (!forest) return;
  document.querySelectorAll('.manifesto-portrait img, .about-image img')
    .forEach((image) => setResidentImage(image, forest));
}

function upgradeCollectionCards(lookup) {
  document.querySelectorAll('.world-chapter').forEach((chapter) => {
    const worldName = chapter.querySelector('.world-chapter__copy h3')?.textContent?.trim();
    const residentId = collectionRepresentative[worldName];
    const resident = residentId ? lookup.get(normalize(residentId)) : null;
    if (resident) setResidentImage(chapter.querySelector('.world-chapter__resident img'), resident);
  });
}

function refreshResponsiveImages() {
  document.querySelectorAll('img[data-desktop-src]').forEach((image) => {
    image.src = mobileQuery.matches ? image.dataset.mobileSrc : image.dataset.desktopSrc;
  });
}

async function runUpgrade() {
  const response = await fetch(contentUrl, { cache: 'no-store' });
  if (!response.ok) return;

  const data = await response.json();
  const lookup = residentLookup(data);

  const apply = () => {
    if (!document.querySelector('#app main')) return false;
    upgradeCards(lookup);
    upgradeChronicle(data, lookup);
    replaceGenericResidentImages(lookup);
    upgradeCollectionCards(lookup);
    refreshResponsiveImages();
    document.documentElement.classList.add('resident-worlds-ready');
    return true;
  };

  if (!apply()) {
    const observer = new MutationObserver(() => {
      if (apply()) observer.disconnect();
    });
    observer.observe(document.querySelector('#app'), { childList: true, subtree: true });
  }

  mobileQuery.addEventListener?.('change', refreshResponsiveImages);
}

runUpgrade().catch(() => {
  // The base site remains usable if the progressive layout layer cannot load.
});

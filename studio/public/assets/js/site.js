const app = document.querySelector('#app');
const page = document.body.dataset.page || 'home';
let content;

const isStaticPreview = window.location.hostname.endsWith('.github.io');
const staticBasePath = isStaticPreview
  ? `/${window.location.pathname.split('/').filter(Boolean)[0] || ''}`.replace(/\/$/, '')
  : '';

const esc = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;'
})[character]);
const byId = (items, key) => items.find((item) => item.id === key || item.slug === key);
const query = (key) => new URLSearchParams(window.location.search).get(key);
const isVideo = (url = '') => /\.(mp4|webm|mov)(?:\?.*)?$/i.test(url);

function rewritePreviewPaths(root = document) {
  if (!isStaticPreview) return;
  root.querySelectorAll('[href^="/"], [src^="/"]').forEach((element) => {
    ['href', 'src'].forEach((attribute) => {
      const value = element.getAttribute(attribute);
      if (value?.startsWith('/') && !value.startsWith('//')) {
        element.setAttribute(attribute, `${staticBasePath}${value}`);
      }
    });
  });
}

function galleryMedia(url, alt) {
  return isVideo(url)
    ? `<video src="${esc(url)}" controls playsinline preload="metadata" aria-label="${esc(alt)}"></video>`
    : `<img src="${esc(url)}" alt="${esc(alt)}" loading="lazy">`;
}

function statusCopy(status) {
  return {
    available: ['Можно приобрести', 'status--available'],
    'in-progress': ['В работе', 'status--in-progress'],
    reserved: ['Уже выбрали', 'status--reserved'],
    archive: ['Нашёл Хранителя', 'status--archive']
  }[status] || ['Хроника Мастерской', ''];
}

function priceLabel(resident) {
  const price = Number(resident?.price);
  return price > 0 ? `${price.toLocaleString('ru-RU')} ₽` : 'Цена по запросу';
}

function techniqueCopy(technique) {
  return technique === 'author-series' ? 'Авторская ручная серия' : 'Единственный в своём роде';
}

function collectionFor(resident) {
  return byId(content.collections, resident.collectionId) || {
    name: 'Мастерская',
    theme: 'dragons',
    sceneImage: '/media/worlds/dragons-scene.webp'
  };
}

function purchaseLink(resident) {
  const message = `Здравствуйте! Хочу узнать о Жителе «${resident.shortName || resident.name}» из Мастерской Веры.`;
  return `https://t.me/vera120700?text=${encodeURIComponent(message)}`;
}

// What separates one world from another, in plain words a first-time visitor
// can act on: what lives here, how it feels, and who it suits as a gift.
const WORLD_TRAITS = {
  winter: {
    mood: 'Ожидание праздника',
    lives: 'Щелкунчики, мышиные короли и зимние сцены',
    palette: 'Синий бархат, снег и золото мундиров',
    gift: 'На Новый год и Рождество — тем, кто любит праздник',
    air: 'Здесь идёт снег'
  },
  forest: {
    mood: 'Тишина и внимательный взгляд',
    lives: 'Лесные драконы, грибы и молчаливые существа',
    palette: 'Мох, тёплая кора и живые огни',
    gift: 'Тем, кто любит лес, книги и тихие вечера',
    air: 'Здесь в темноте летают светлячки'
  },
  dragons: {
    mood: 'Древность и спокойная сила',
    lives: 'Драконы, грифоны и авторские создания Веры',
    palette: 'Чешуя, старый камень и дыхание огня',
    gift: 'Тем, у кого есть своя легенда',
    air: 'Здесь стелется дым и поднимаются угли'
  },
  russian: {
    mood: 'Вечерняя сказка у огня',
    lives: 'Сирин, Змей Горыныч, Конёк-Горбунок и русалки',
    palette: 'Золото корон, гжельская синь и вязь',
    gift: 'Тем, кто вырос на этих сказках',
    air: 'Здесь по фону идёт славянский узор'
  },
  home: {
    mood: 'Тихий солнечный день',
    lives: 'Курочка, лошадка-качалка и другие домашние Жители',
    palette: 'Лён, солнечное дерево и тёплый свет',
    gift: 'На новоселье и просто для уюта в доме',
    air: 'Здесь в солнечном луче кружится пыль'
  }
};

function worldTraits(theme) {
  return WORLD_TRAITS[theme] || WORLD_TRAITS.dragons;
}

function residentWord(count) {
  const tail = count % 100;
  if (tail >= 11 && tail <= 14) return 'Жителей';
  const last = count % 10;
  if (last === 1) return 'Житель';
  if (last >= 2 && last <= 4) return 'Жителя';
  return 'Жителей';
}

// Deterministic pseudo-random so particle drifts look scattered rather than
// striped, but stay identical between renders (no layout jitter on re-render).
function scatter(seed) {
  let value = seed * 9301 + 49297;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

// Particles for a world's ambience. `density` scales the count: the page-wide
// layer carries more than the small copy laid over a single photo.
function atmosphereParticles(theme, density = 1) {
  const random = scatter(theme.length * 17 + 3);
  const round = (value, digits = 2) => Number(value.toFixed(digits));

  if (theme === 'forest') {
    // Fireflies wander on their own paths — each gets its own drift vector so
    // no two trace the same arc.
    return Array.from({ length: Math.round(18 * density) }, () => {
      const x = round(random() * 100);
      const y = round(random() * 100);
      const driftX = round(-26 + random() * 52);
      const driftY = round(-22 + random() * 44);
      const duration = round(9 + random() * 13);
      const delay = round(random() * 18);
      const scale = round(.45 + random() * .85);
      const glow = round(.32 + random() * .5);
      return `<i style="--x:${x}%;--y:${y}%;--dx:${driftX}px;--dy:${driftY}px;--d:${duration}s;--delay:-${delay}s;--scale:${scale};--glow:${glow}"></i>`;
    }).join('');
  }

  if (theme === 'winter') {
    return Array.from({ length: Math.round(38 * density) }, () => {
      const x = round(random() * 100);
      const sway = round(14 + random() * 40);
      const duration = round(11 + random() * 15);
      const delay = round(random() * 26);
      const size = round(1.6 + random() * 3.4, 1);
      const opacity = round(.3 + random() * .55);
      return `<i style="--x:${x}%;--sway:${sway}px;--d:${duration}s;--delay:-${delay}s;--size:${size}px;--o:${opacity}"></i>`;
    }).join('');
  }

  if (theme === 'dragons') {
    // Drifting smoke banks plus embers rising from below.
    const smoke = Array.from({ length: Math.round(4 * density) }, () => {
      const x = round(random() * 100);
      const y = round(40 + random() * 60);
      const size = round(30 + random() * 34);
      const duration = round(22 + random() * 16);
      const delay = round(random() * 30);
      return `<u style="--x:${x}%;--y:${y}%;--size:${size}%;--d:${duration}s;--delay:-${delay}s"></u>`;
    }).join('');
    const embers = Array.from({ length: Math.round(11 * density) }, () => {
      const x = round(random() * 100);
      const drift = round(-30 + random() * 60);
      const duration = round(9 + random() * 11);
      const delay = round(random() * 20);
      const scale = round(.5 + random() * .8);
      return `<i style="--x:${x}%;--dx:${drift}px;--d:${duration}s;--delay:-${delay}s;--scale:${scale}"></i>`;
    }).join('');
    return smoke + embers;
  }

  if (theme === 'russian') {
    // Warm sparks lifting off an evening fire, under the woven ornament.
    return Array.from({ length: Math.round(12 * density) }, () => {
      const x = round(random() * 100);
      const drift = round(-24 + random() * 48);
      const duration = round(11 + random() * 13);
      const delay = round(random() * 22);
      const scale = round(.45 + random() * .7);
      return `<i style="--x:${x}%;--dx:${drift}px;--d:${duration}s;--delay:-${delay}s;--scale:${scale}"></i>`;
    }).join('');
  }

  // home — dust motes turning slowly in a shaft of afternoon sun
  return Array.from({ length: Math.round(14 * density) }, () => {
    const x = round(random() * 100);
    const y = round(random() * 100);
    const driftX = round(-18 + random() * 36);
    const driftY = round(-30 + random() * 24);
    const duration = round(14 + random() * 16);
    const delay = round(random() * 24);
    const scale = round(.5 + random() * .9);
    return `<i style="--x:${x}%;--y:${y}%;--dx:${driftX}px;--dy:${driftY}px;--d:${duration}s;--delay:-${delay}s;--scale:${scale}"></i>`;
  }).join('');
}

// Ornament plates drawn as inline SVG so each world carries a motif of its own
// rather than the same generic frame.
function worldOrnament(theme) {
  if (theme === 'russian') {
    // Gzhel-inspired cobalt brushwork over a Slavic woven diamond ground.
    return `<svg class="ornament ornament--russian" viewBox="0 0 240 240" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="slav-weave" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M0 20 L20 0 L40 20 L20 40 Z" fill="none" stroke="currentColor" stroke-width="1"/>
          <path d="M20 14 L26 20 L20 26 L14 20 Z" fill="currentColor" opacity=".45"/>
          <path d="M0 0 L8 8 M40 0 L32 8 M0 40 L8 32 M40 40 L32 32" stroke="currentColor" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="240" height="240" fill="url(#slav-weave)" opacity=".5"/>
      <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M120 44 C150 62 158 96 138 120 C158 144 150 178 120 196 C90 178 82 144 102 120 C82 96 90 62 120 44 Z" opacity=".7"/>
        <path d="M120 78 C134 90 136 108 126 120 C136 132 134 150 120 162 C106 150 104 132 114 120 C104 108 106 90 120 78 Z" opacity=".55"/>
        <circle cx="120" cy="120" r="9" opacity=".8"/>
      </g>
    </svg>`;
  }

  if (theme === 'winter') {
    // Frost crystal — six-fold, the way a real snowflake branches.
    return `<svg class="ornament ornament--winter" viewBox="0 0 240 240" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" transform="translate(120 120)">
        ${Array.from({ length: 6 }, (_, index) => `<g transform="rotate(${index * 60})">
          <path d="M0 0 L0 -96"/>
          <path d="M0 -34 L-15 -49 M0 -34 L15 -49"/>
          <path d="M0 -58 L-12 -70 M0 -58 L12 -70"/>
          <path d="M0 -80 L-9 -90 M0 -80 L9 -90"/>
        </g>`).join('')}
      </g>
    </svg>`;
  }

  if (theme === 'dragons') {
    // Scale-mail ground with a heraldic wing arc.
    return `<svg class="ornament ornament--dragons" viewBox="0 0 240 240" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="dragon-scale" width="32" height="26" patternUnits="userSpaceOnUse">
          <path d="M-16 0 A16 16 0 0 0 16 0 M16 0 A16 16 0 0 0 48 0 M0 13 A16 16 0 0 0 32 13" fill="none" stroke="currentColor" stroke-width="1.2"/>
        </pattern>
      </defs>
      <rect width="240" height="240" fill="url(#dragon-scale)" opacity=".45"/>
      <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".65">
        <path d="M52 158 C74 108 108 82 150 78 M150 78 C132 96 124 118 126 142"/>
        <path d="M150 78 L176 66 L168 92 L190 88"/>
      </g>
    </svg>`;
  }

  if (theme === 'forest') {
    // Fern fronds and spores — the quiet growth of an old wood.
    return `<svg class="ornament ornament--forest" viewBox="0 0 240 240" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
        <path d="M120 210 C120 150 116 96 138 52" opacity=".7"/>
        ${Array.from({ length: 9 }, (_, index) => {
          const y = 196 - index * 17;
          const spread = 16 + index * 3.4;
          const lift = index * 1.8;
          return `<path d="M${120 + index * 1.6} ${y} C${120 - spread * .4} ${y - 6 - lift} ${120 - spread} ${y - 10 - lift} ${120 - spread - 6} ${y - 20 - lift}" opacity=".5"/>
                  <path d="M${120 + index * 1.6} ${y} C${120 + spread * .5} ${y - 6 - lift} ${120 + spread} ${y - 10 - lift} ${120 + spread + 6} ${y - 20 - lift}" opacity=".5"/>`;
        }).join('')}
      </g>
      <g fill="currentColor" opacity=".45">
        <circle cx="62" cy="70" r="3"/><circle cx="86" cy="44" r="2"/><circle cx="176" cy="128" r="2.6"/>
        <circle cx="198" cy="92" r="2"/><circle cx="52" cy="126" r="2.2"/>
      </g>
    </svg>`;
  }

  // home — a sun over a simple woven linen ground
  return `<svg class="ornament ornament--home" viewBox="0 0 240 240" aria-hidden="true" focusable="false">
    <defs>
      <pattern id="linen-weave" width="12" height="12" patternUnits="userSpaceOnUse">
        <path d="M0 6 H12 M6 0 V12" stroke="currentColor" stroke-width=".8" opacity=".5"/>
      </pattern>
    </defs>
    <rect width="240" height="240" fill="url(#linen-weave)" opacity=".4"/>
    <g transform="translate(120 120)" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round">
      <circle r="40" opacity=".75"/>
      ${Array.from({ length: 16 }, (_, index) => `<path d="M0 -52 L0 -66" transform="rotate(${index * 22.5})" opacity=".6"/>`).join('')}
    </g>
  </svg>`;
}

// The small ambience laid over a single photo — kept sparse so it reads as part
// of the picture instead of a veil across the subject.
function atmosphereMarkup(theme) {
  return `<div class="atmosphere atmosphere--${esc(theme)}" aria-hidden="true">${atmosphereParticles(theme, .55)}</div>`;
}

// The full-page ambience: this is what makes a world feel like a place you
// walked into rather than a page you opened.
function worldAtmosphere(theme) {
  return `<div class="world-air world-air--${esc(theme)}" aria-hidden="true">
    <div class="world-air__wash"></div>
    <div class="world-air__ornament">${worldOrnament(theme)}</div>
    <div class="world-air__particles">${atmosphereParticles(theme, 1)}</div>
    <div class="world-air__vignette"></div>
  </div>`;
}

function setShell(active) {
  const header = document.querySelector('[data-site-header]');
  const footer = document.querySelector('[data-site-footer]');
  const nav = [
    ['home', '/', 'Главная'],
    ['residents', '/residents.html', 'Жители'],
    ['collections', '/collections.html', 'Миры'],
    ['process', '/process.html', 'Как создаются'],
    ['about', '/about.html', 'О мастерской'],
    ['contact', '/contact.html', 'Контакты']
  ];

  header.innerHTML = `<a class="skip-link" href="#main">Перейти к содержанию</a>
    <div class="site-header"><div class="header-inner">
      <a class="brand" href="/" aria-label="Мастерская Веры — главная">
        <img class="brand__logo" src="/media/brand/logo-mark.webp" alt="" width="96" height="96">
        <span class="brand__name">Мастерская Веры</span>
      </a>
      <nav class="main-nav" id="main-nav" aria-label="Основная навигация">
        ${nav.map(([id, href, label]) => `<a class="${id === active ? 'is-active' : ''}" ${id === active ? 'aria-current="page"' : ''} href="${href}">${label}</a>`).join('')}
      </nav>
      <div class="header-actions">
        <a class="button button--wine button--compact header-cta" href="/residents.html">Смотреть Жителей</a>
        <button class="menu-toggle" type="button" aria-controls="main-nav" aria-expanded="false" data-menu-toggle>
          <span></span><span></span><span></span><span class="sr-only">Открыть меню</span>
        </button>
      </div>
    </div></div>`;

  footer.innerHTML = `<footer class="site-footer"><div class="shell footer-grid">
    <div>
      <a class="brand" href="/"><span class="brand__mark" aria-hidden="true">✦</span><span class="brand__name">Мастерская Веры</span></a>
      <p class="footer-copy">Авторские фигурки из полимерной глины. Каждая работа создаётся вручную и получает собственный характер.</p>
    </div>
    <nav class="footer-nav" aria-label="Навигация в подвале">
      <a href="/residents.html">Все Жители</a>
      <a href="/collections.html">Миры Мастерской</a>
      <a href="/process.html">Как создаются</a>
      <a href="/about.html">О мастерской</a>
    </nav>
    <div class="footer-contact">
      <p>Связаться с Верой</p>
      <a href="https://t.me/vera120700" target="_blank" rel="noreferrer">Telegram · @vera120700</a>
      <a href="https://t.me/masterskayaver" target="_blank" rel="noreferrer">Telegram-канал · Мастерская Веры</a>
      <a href="https://www.instagram.com/vera.romanycheva.23" target="_blank" rel="noreferrer">Instagram</a>
    </div>
  </div></footer><button class="scroll-top" type="button" data-scroll-top aria-label="Наверх">↑</button>`;

  const toggle = document.querySelector('[data-menu-toggle]');
  const navElement = document.querySelector('#main-nav');
  toggle.addEventListener('click', () => {
    const open = navElement.classList.toggle('is-open');
    document.body.classList.toggle('menu-open', open);
    toggle.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });
  navElement.addEventListener('click', () => {
    navElement.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  });

  const scrollButton = document.querySelector('[data-scroll-top]');
  window.addEventListener('scroll', () => {
    scrollButton.classList.toggle('is-visible', window.scrollY > 650);
  }, { passive: true });
  scrollButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function residentActions(resident, compact = false) {
  const sizeClass = compact ? ' button--compact' : '';
  const chronicle = `<a class="button button--light${sizeClass}" href="/chronicle.html?resident=${encodeURIComponent(resident.slug)}">Открыть Хронику</a>`;
  if (resident.availability === 'available') {
    return `${chronicle}<a class="button button--wine${sizeClass}" href="${esc(purchaseLink(resident))}" target="_blank" rel="noreferrer">Написать Вере</a>`;
  }
  if (resident.availability === 'in-progress') {
    return `${chronicle}<a class="button button--ghost${sizeClass}" href="/contact.html?resident=${encodeURIComponent(resident.slug)}">Следить за работой</a>`;
  }
  return chronicle;
}

function residentCard(resident) {
  const [label, className] = statusCopy(resident.availability);
  const world = collectionFor(resident);
  return `<article class="resident-card theme-${esc(world.theme)}" data-collection="${esc(resident.collectionId)}" data-status="${esc(resident.availability)}">
    <a class="resident-card__image" href="/chronicle.html?resident=${encodeURIComponent(resident.slug)}">
      <img src="${esc(resident.sceneImage || resident.heroImage)}" alt="${esc(resident.name)} в мире «${esc(world.name)}»" loading="lazy">
      <span class="resident-card__world">${esc(world.name)}</span>
    </a>
    <div class="resident-card__body">
      <div class="resident-card__meta"><span class="status ${className}">${label}</span>${['available', 'in-progress'].includes(resident.availability) ? `<span class="price">${priceLabel(resident)}</span>` : ''}</div>
      <h3>${esc(resident.shortName || resident.name)}</h3>
      <p>${esc(resident.excerpt)}</p>
      <div class="cluster">${residentActions(resident, true)}</div>
    </div>
  </article>`;
}

function worldCard(collection, index = 0) {
  const residentsInWorld = content.residents
    .filter((resident) => resident.collectionId === collection.id)
    .sort((left, right) => (left.worldOrder ?? 99) - (right.worldOrder ?? 99));
  const count = residentsInWorld.length;
  const stageResident = residentsInWorld.find((resident) => resident.sceneImage) || residentsInWorld[0];
  return `<article class="world-chapter theme-${esc(collection.theme)}" data-reveal>
    <img class="world-chapter__scene" src="${esc(stageResident?.sceneImage || collection.sceneImage || collection.image)}" alt="" loading="lazy">
    <div class="world-chapter__shade"></div>
    ${atmosphereMarkup(collection.theme)}
    <a class="world-chapter__link" href="/collection.html?world=${encodeURIComponent(collection.slug)}" aria-label="Открыть мир «${esc(collection.name)}»"></a>
    <div class="world-chapter__copy">
      <span class="world-chapter__number">0${index + 1}</span>
      <p class="eyebrow eyebrow--light">Мир Мастерской</p>
      <h3>${esc(collection.name)}</h3>
      <p>${esc(collection.description)}</p>
      <span class="world-chapter__cue">${esc(collection.cue || '')}</span>
      <span class="world-chapter__count">${count} ${count === 1 ? 'Житель' : count < 5 ? 'Жителя' : 'Жителей'}</span>
      <span class="text-link text-link--light">Войти в мир <b aria-hidden="true">↗</b></span>
    </div>
  </article>`;
}

function enableAtmosphereMotion() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Reveal once and stop watching: re-hiding a block after the reader has
  // scrolled past it makes content flicker away on the way back up.
  // The 300px bottom margin starts the fade before a block enters view, so it
  // has already arrived by the time it is on screen — and a fast scroll can
  // never outrun it and leave a blank panel behind.
  const reveal = (element) => {
    element.classList.add('is-visible');
    observer.unobserve(element);
  };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.isIntersecting && reveal(entry.target));
  }, { threshold: 0, rootMargin: '0px 0px 300px 0px' });

  const revealable = [...document.querySelectorAll('[data-reveal]')];
  revealable.forEach((element) => {
    // Anything already at or above the fold shows straight away — no fade in
    // from nothing on first paint.
    if (element.getBoundingClientRect().top < window.innerHeight) element.classList.add('is-visible');
    else observer.observe(element);
  });
  // Safety net: reveal blocks are hidden by CSS until observed, so if the
  // observer never fires (odd viewport, stalled layout) show them anyway
  // rather than leaving the page blank.
  window.setTimeout(() => revealable.forEach((element) => element.classList.add('is-visible')), 1800);
  if (reduced) return;

  document.querySelectorAll('[data-parallax]').forEach((stage) => {
    stage.addEventListener('pointermove', (event) => {
      const bounds = stage.getBoundingClientRect();
      stage.style.setProperty('--px', ((event.clientX - bounds.left) / bounds.width - .5).toFixed(3));
      stage.style.setProperty('--py', ((event.clientY - bounds.top) / bounds.height - .5).toFixed(3));
    });
    stage.addEventListener('pointerleave', () => {
      stage.style.setProperty('--px', '0');
      stage.style.setProperty('--py', '0');
    });
  });
}

function home() {
  const giftStory = content.stories.find((story) => story.id === 'gift-ceremony') || content.stories[0];
  const featuredIds = ['forest-dragon', 'gorynych-green', 'nutcracker-ernst', 'forest-mushrooms', 'azimondias', 'sirin'];
  const featured = featuredIds.map((id) => byId(content.residents, id)).filter(Boolean);
  const availableCount = content.residents.filter((resident) => resident.availability === 'available').length;

  app.innerHTML = `<main id="main">
    <section class="home-hero" data-parallax>
      <div class="home-hero__media"><img src="/media/hero/atelier-group-temp.webp" alt="Собрание Жителей Мастерской Веры" fetchpriority="high"></div>
      <div class="home-hero__shade"></div>
      <div class="home-hero__glow" aria-hidden="true"></div>
      <div class="shell home-hero__layout">
        <div class="home-hero__copy">
          <p class="eyebrow eyebrow--light" data-reveal>Добро пожаловать, путник ✦</p>
          <h1 data-reveal>Не просто фигурки.<br><em>Жители с историей.</em></h1>
          <p class="lede lede--light" data-reveal>Вера лепит и расписывает вручную драконов, сказочных героев и маленькие лесные чудеса. Каждая фигурка существует в одном экземпляре — второй такой не будет ни у кого.</p>
          <div class="cluster" data-reveal>
            <a class="button button--wine" href="/residents.html">Смотреть работы <span aria-hidden="true">↗</span></a>
            <a class="button button--light" href="#worlds">Заглянуть в Миры</a>
          </div>
        </div>
        <aside class="home-hero__folio" data-reveal>
          <p>Сейчас можно забрать домой</p>
          <strong>${availableCount}</strong>
          <span>готовых работ ждут своего человека</span>
          <a href="https://t.me/vera120700" target="_blank" rel="noreferrer">Спросить Веру →</a>
        </aside>
      </div>
      <a class="hero-scroll" href="#lexicon"><span>Листать дальше</span><i>↓</i></a>
    </section>

    <section id="lexicon" class="section section--paper lexicon">
      <div class="shell">
        <header class="section-head" data-reveal>
          <div>
            <p class="eyebrow">Пара слов, прежде чем идти дальше</p>
            <h2>Здесь у вещей свои имена</h2>
          </div>
        </header>
        <div class="lexicon-grid" data-reveal>
          <div class="lexicon-card">
            <b>Житель</b>
            <span>Так Вера называет свои фигурки. У каждой есть имя, характер и своя история — поэтому не «товар», а Житель.</span>
          </div>
          <div class="lexicon-card">
            <b>Мир</b>
            <span>Тематическая семья Жителей: зимние сказки, древний лес, драконы, русские сказки, домашние истории. У каждого Мира свой воздух.</span>
          </div>
          <div class="lexicon-card">
            <b>Хранитель</b>
            <span>Человек, у которого Житель поселился. Фигурка одна на свете, поэтому её не «покупают», а забирают к себе.</span>
          </div>
          <div class="lexicon-card">
            <b>Хроника</b>
            <span>Страница Жителя: как он появился, какой у него характер и куда ведёт его история. Там же — фотографии и цена.</span>
          </div>
        </div>
      </div>
    </section>

    <section class="section section--paper manifesto">
      <div class="shell manifesto-grid">
        <div class="manifesto-copy" data-reveal>
          <p class="eyebrow">Мастерская, а не фабрика</p>
          <h2>Характер рождается в руках — из формы, цвета и маленьких несовершенств.</h2>
          <p class="lede">Здесь нет конвейера и одинаковых лиц. Даже близкие образы отличаются взглядом, оттенками, фактурой и деталями ручной работы.</p>
          <div class="facts">
            <div class="fact"><b>Ручная лепка</b><span>от каркаса до последней детали</span></div>
            <div class="fact"><b>Своя роспись</b><span>живые переходы цвета и выражение</span></div>
            <div class="fact"><b>Личная встреча</b><span>заказ и вопросы напрямую Вере</span></div>
          </div>
        </div>
        <figure class="manifesto-portrait" data-reveal>
          <img src="/media/residents/forest-dragon/studio.webp" alt="Готовый лесной дракон Веры" loading="lazy">
          <figcaption><span>Готовая работа</span><b>Лесной дракон</b></figcaption>
        </figure>
      </div>
    </section>

    <section id="worlds" class="section section--night worlds-section">
      <div class="shell">
        <header class="section-head section-head--light" data-reveal>
          <div><p class="eyebrow eyebrow--light">Пять атмосфер</p><h2>У каждого Мира — свой воздух, свет и способ рассказать историю.</h2></div>
          <a class="text-link text-link--light" href="/collections.html">Открыть весь атлас →</a>
        </header>
        <div class="world-atlas">${content.collections.map(worldCard).join('')}</div>
      </div>
    </section>

    <section id="residents" class="section residents-featured">
      <div class="shell">
        <header class="section-head" data-reveal>
          <div><p class="eyebrow">Жители Мастерской</p><h2>Готовые, архивные и те, кто ещё только появляется.</h2></div>
          <a class="text-link" href="/residents.html">Смотреть всех →</a>
        </header>
        <div class="resident-carousel" data-reveal>${featured.map(residentCard).join('')}</div>
      </div>
    </section>

    <section class="section section--paper worth">
      <div class="shell">
        <header class="section-head" data-reveal>
          <div>
            <p class="eyebrow">Почему это дороже сувенира</p>
            <h2>Одна пара рук, один экземпляр, ни одной копии</h2>
          </div>
        </header>
        <div class="worth-grid" data-reveal>
          <div class="worth-card">
            <span class="worth-card__num">01</span>
            <b>Второго такого нет</b>
            <p>Вера не делает копий. Даже когда образ повторяется — Щелкунчик, Горыныч — меняются лицо, оттенки и детали. Ваш Житель существует в единственном экземпляре.</p>
          </div>
          <div class="worth-card">
            <span class="worth-card__num">02</span>
            <b>От каркаса до последнего мазка</b>
            <p>Проволока, фольга, полимерная глина, запекание, многослойная роспись. Никакого литья и конвейера — всё проходит через руки Веры.</p>
          </div>
          <div class="worth-card">
            <span class="worth-card__num">03</span>
            <b>Работа на недели, а не на часы</b>
            <p>Крупная фигурка рождается неделями: форма, сушка, роспись слой за слоем. Это то, за что платят — время мастера и внимание к мелочам.</p>
          </div>
          <div class="worth-card">
            <span class="worth-card__num">04</span>
            <b>С вами говорит сама Вера</b>
            <p>Без менеджеров и посредников. Вера сама отвечает, сама советует, сама упаковывает и отправляет.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section section--deep">
      <div class="shell story-strip" data-reveal>
        <figure class="story-strip__image"><img src="${esc(giftStory.image)}" alt="Подарочный набор Мастерской Веры" loading="lazy"></figure>
        <div class="story-strip__copy">
          <p class="eyebrow eyebrow--light">Если выбираете подарок</p>
          <h2>${esc(giftStory.title)}</h2>
          <p>${esc(giftStory.lead)}</p>
          <p class="story-strip__note">Такой подарок трудно повторить: человек получает вещь, которая существует в одном экземпляре, вместе с её историей.</p>
          <div class="cluster"><a class="button button--wine" href="https://t.me/vera120700" target="_blank" rel="noreferrer">Спросить о подарке</a><a class="button button--light" href="/process.html">Посмотреть, как создаются</a></div>
        </div>
      </div>
    </section>

    <section class="section section--paper final-call">
      <div class="shell final-call__panel" data-reveal>
        <p class="eyebrow">Стать Хранителем</p>
        <h2>Понравился кто-то из Жителей?</h2>
        <p>Напишите Вере — она подскажет, свободен ли он, сколько стоит и как доедет до вас. А если ни один не отозвался, расскажите свою идею: Вера создаёт Жителей и на заказ.</p>
        <div class="cluster">
          <a class="button button--wine" href="https://t.me/vera120700" target="_blank" rel="noreferrer">Написать Вере в Telegram</a>
          <a class="button button--line" href="/residents.html">Посмотреть всех Жителей</a>
        </div>
      </div>
    </section>
  </main>`;
  document.title = 'Мастерская Веры — авторские фигурки ручной работы';
  enableAtmosphereMotion();
}

function residentWorldSection(collection) {
  const residentsInWorld = content.residents
    .filter((resident) => resident.collectionId === collection.id)
    .sort((left, right) => (left.worldOrder ?? 99) - (right.worldOrder ?? 99));
  return `<section class="residents-world theme-${esc(collection.theme)}" data-world-residents data-collection="${esc(collection.id)}">
    <img class="residents-world__scene" src="${esc(collection.sceneImage || collection.image)}" alt="" loading="lazy">
    <div class="residents-world__shade"></div>
    ${atmosphereMarkup(collection.theme)}
    <div class="shell residents-world__inner">
      <header class="residents-world__head">
        <div><p class="eyebrow eyebrow--light">${esc(collection.cue || 'Мир Мастерской')}</p><h2>${esc(collection.name)}</h2><p>${esc(collection.description)}</p></div>
        <a class="button button--light" href="/collection.html?world=${encodeURIComponent(collection.slug)}">Войти в мир</a>
      </header>
      <div class="resident-grid">${residentsInWorld.map(residentCard).join('')}</div>
    </div>
  </section>`;
}

function residents() {
  app.innerHTML = `<main id="main">
    <section class="page-hero page-hero--residents"><div class="shell"><p class="eyebrow eyebrow--light">Все работы Веры</p><h1>Жители Мастерской</h1><p class="lede lede--light">Готовых можно приобрести, проданные остаются в Хрониках, а будущих — увидеть в процессе рождения.</p></div></section>
    <div class="filter-dock"><div class="shell filters" data-filters>
      <button class="filter-button" aria-pressed="true" data-filter="all">Все Миры</button>
      ${content.collections.map((collection) => `<button class="filter-button" aria-pressed="false" data-filter="${esc(collection.id)}">${esc(collection.name)}</button>`).join('')}
      <button class="filter-button" aria-pressed="false" data-filter="available">Можно приобрести</button>
      <button class="filter-button" aria-pressed="false" data-filter="in-progress">В работе</button>
      <button class="filter-button" aria-pressed="false" data-filter="archive">Архив</button>
    </div></div>
    <div data-resident-worlds>${content.collections.map(residentWorldSection).join('')}</div>
    <section class="section section--paper"><div class="shell empty-state" hidden data-empty>В этом разделе пока нет Жителей. Выберите другой Мир или напишите Вере.</div></section>
  </main>`;
  document.title = 'Жители — Мастерская Веры';
  document.querySelector('[data-filters]').addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    const filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    let totalVisible = 0;
    document.querySelectorAll('[data-world-residents]').forEach((section) => {
      let sectionVisible = 0;
      section.querySelectorAll('.resident-card').forEach((card) => {
        const match = filter === 'all' || section.dataset.collection === filter || card.dataset.status === filter;
        card.hidden = !match;
        if (match) sectionVisible += 1;
      });
      section.hidden = sectionVisible === 0;
      totalVisible += sectionVisible;
    });
    document.querySelector('[data-empty]').hidden = totalVisible > 0;
  });
  enableAtmosphereMotion();
}

function collections() {
  app.innerHTML = `<main id="main">
    <section class="page-hero page-hero--atlas"><div class="shell"><p class="eyebrow eyebrow--light">Атлас Мастерской</p><h1>Пять Миров.<br>Пять разных ощущений.</h1><p class="lede lede--light">Не фильтры каталога, а отдельные сцены: лес дышит мхом и огоньками, зима — снегом, русская сказка — деревом и вязью.</p></div></section>
    <section class="section section--night worlds-section"><div class="shell"><div class="world-atlas world-atlas--full">${content.collections.map(worldCard).join('')}</div></div></section>
  </main>`;
  document.title = 'Миры Мастерской — Мастерская Веры';
  enableAtmosphereMotion();
}

function worldResidentSlide(resident, index) {
  const [label, className] = statusCopy(resident.availability);
  const world = collectionFor(resident);
  return `<article class="world-resident ${index === 0 ? 'is-active' : ''}" data-world-slide data-index="${index}" aria-hidden="${index === 0 ? 'false' : 'true'}">
    <figure class="world-resident__scene">
      <img src="${esc(resident.sceneImage || resident.heroImage)}" alt="${esc(resident.name)} в мире «${esc(world.name)}»" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>
      <span>Настоящая работа Веры · сцена Мира</span>
    </figure>
    <div class="world-resident__copy">
      <div class="world-resident__meta"><span class="status ${className}">${label}</span><span>0${index + 1}</span></div>
      <p class="eyebrow eyebrow--light">${esc(resident.type)}</p>
      <h2>${esc(resident.shortName || resident.name)}</h2>
      <p class="world-resident__excerpt">${esc(resident.excerpt)}</p>
      <dl>
        <div><dt>Характер</dt><dd>${esc(resident.character)}</dd></div>
        <div><dt>Где обитает</dt><dd>${esc(resident.habitat)}</dd></div>
      </dl>
      <div class="cluster">${residentActions(resident)}</div>
    </div>
  </article>`;
}

function collectionPage() {
  const collection = byId(content.collections, query('world')) || content.collections[0];
  const residentsInWorld = content.residents
    .filter((resident) => resident.collectionId === collection.id)
    .sort((left, right) => (left.worldOrder ?? 99) - (right.worldOrder ?? 99));
  const traits = worldTraits(collection.theme);
  const available = residentsInWorld.filter((resident) => resident.availability === 'available');
  document.body.classList.add(`theme-${collection.theme}`, 'world-page');
  document.body.insertAdjacentHTML('afterbegin', worldAtmosphere(collection.theme));

  app.innerHTML = `<main id="main">
    <section class="world-stage theme-${esc(collection.theme)}" style="--world-accent:${esc(collection.accent)}" data-parallax>
      <img class="world-stage__scene" src="${esc(collection.sceneImage || collection.image)}" alt="" fetchpriority="high">
      <div class="world-stage__shade"></div>
      ${atmosphereMarkup(collection.theme)}
      <div class="shell world-stage__intro">
        <a class="world-back" href="/collections.html">← Все Миры</a>
        <p class="eyebrow eyebrow--light">${esc(collection.cue || 'Мир Мастерской')}</p>
        <h1>${esc(collection.name)}</h1>
        <p>${esc(collection.description)}</p>
        <div class="world-stage__facts">
          <span class="world-badge">${residentsInWorld.length} ${residentWord(residentsInWorld.length)}</span>
          ${available.length ? `<span class="world-badge world-badge--free">${available.length} можно забрать домой</span>` : ''}
          <span class="world-badge world-badge--air">${esc(traits.air)}</span>
        </div>
      </div>
    </section>

    <section class="section world-character">
      <div class="shell">
        <header class="section-head section-head--light" data-reveal>
          <div>
            <p class="eyebrow eyebrow--light">Чем этот Мир не похож на другие</p>
            <h2>${esc(traits.mood)}</h2>
          </div>
        </header>
        <div class="world-traits" data-reveal>
          <div class="world-trait"><b>Кто здесь живёт</b><span>${esc(traits.lives)}</span></div>
          <div class="world-trait"><b>Цвета Мира</b><span>${esc(traits.palette)}</span></div>
          <div class="world-trait"><b>Кому подойдёт в подарок</b><span>${esc(traits.gift)}</span></div>
        </div>
      </div>
    </section>

    ${residentsInWorld.length ? `<section class="section world-residents-section">
      <div class="shell">
        <header class="section-head section-head--light" data-reveal>
          <div>
            <p class="eyebrow eyebrow--light">Жители этого Мира</p>
            <h2>Каждый сделан вручную в одном экземпляре</h2>
          </div>
          <a class="text-link text-link--light" href="/residents.html">Все работы Веры →</a>
        </header>
      </div>
      <div class="shell world-slider" data-world-slider tabindex="0" aria-label="Жители мира «${esc(collection.name)}»">
        <div class="world-slider__slides">${residentsInWorld.map(worldResidentSlide).join('')}</div>
        <div class="world-slider__controls">
          <button type="button" data-world-prev aria-label="Предыдущий Житель">←</button>
          <div class="world-slider__count"><span data-world-current>01</span><i></i><span>${String(residentsInWorld.length).padStart(2, '0')}</span></div>
          <button type="button" data-world-next aria-label="Следующий Житель">→</button>
        </div>
        <div class="world-slider__rail" role="tablist" aria-label="Выбор Жителя">
          ${residentsInWorld.map((resident, index) => `<button class="${index === 0 ? 'is-active' : ''}" type="button" data-world-go="${index}" role="tab" aria-selected="${index === 0 ? 'true' : 'false'}"><img src="${esc(resident.sceneImage || resident.heroImage)}" alt=""><span>${esc(resident.shortName || resident.name)}</span></button>`).join('')}
        </div>
      </div>
    </section>` : `<section class="section"><div class="shell empty-state empty-state--dark">Первые Жители этого Мира скоро появятся. Напишите Вере — она расскажет, кто здесь готовится.</div></section>`}

    <section class="section world-invite">
      <div class="shell world-invite__panel" data-reveal>
        <p class="eyebrow eyebrow--light">${esc(collection.name)}</p>
        <h2>Понравился кто-то из этого Мира?</h2>
        <p>Напишите Вере — она расскажет о размере, сроках и стоимости, поможет выбрать или придумает нового Жителя специально для вас.</p>
        <div class="cluster">
          <a class="button button--wine" href="https://t.me/vera120700" target="_blank" rel="noreferrer">Написать Вере</a>
          <a class="button button--light" href="/collections.html">Посмотреть другие Миры</a>
        </div>
      </div>
    </section>
  </main>`;
  document.title = `${collection.name} — Мастерская Веры`;
  bindWorldSlider();
  enableAtmosphereMotion();
}

function bindWorldSlider() {
  const slider = document.querySelector('[data-world-slider]');
  if (!slider) return;
  const slides = [...slider.querySelectorAll('[data-world-slide]')];
  const tabs = [...slider.querySelectorAll('[data-world-go]')];
  const currentLabel = slider.querySelector('[data-world-current]');
  let current = 0;
  let pointerStart = null;

  slides.slice(1).forEach((slide) => {
    const image = new Image();
    image.src = slide.querySelector('.world-resident__scene img').src;
  });

  const show = (next, direction = 1) => {
    const normalized = (next + slides.length) % slides.length;
    if (normalized === current) return;
    slider.dataset.direction = direction > 0 ? 'next' : 'prev';
    slides.forEach((slide, index) => {
      slide.classList.toggle('is-active', index === normalized);
      slide.classList.toggle('is-before', index < normalized);
      slide.classList.toggle('is-after', index > normalized);
      slide.setAttribute('aria-hidden', String(index !== normalized));
    });
    tabs.forEach((tab, index) => {
      tab.classList.toggle('is-active', index === normalized);
      tab.setAttribute('aria-selected', String(index === normalized));
    });
    current = normalized;
    currentLabel.textContent = String(current + 1).padStart(2, '0');
  };

  slider.querySelector('[data-world-prev]').addEventListener('click', () => show(current - 1, -1));
  slider.querySelector('[data-world-next]').addEventListener('click', () => show(current + 1, 1));
  tabs.forEach((tab) => tab.addEventListener('click', () => {
    const next = Number(tab.dataset.worldGo);
    show(next, next > current ? 1 : -1);
  }));
  slider.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') show(current - 1, -1);
    if (event.key === 'ArrowRight') show(current + 1, 1);
  });
  slider.addEventListener('pointerdown', (event) => {
    pointerStart = { x: event.clientX, y: event.clientY };
  });
  slider.addEventListener('pointerup', (event) => {
    if (!pointerStart) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) show(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  });
}

function process() {
  const azimondias = byId(content.residents, 'azimondias') || content.residents[0];
  const threshold = content.stories.find((story) => story.id === 'big-dragon-threshold') || content.stories[0];
  const stages = [
    ['01', 'Проволока', 'Проволочная линия задаёт позу, шею, хвост и будущие крылья.', '/media/process/01-wire.webp'],
    ['02', 'Фольга', 'Фольга набирает лёгкий внутренний объём, не утяжеляя фигурку.', '/media/process/02-foil.webp'],
    ['03', 'Первые слои глины', 'Полимерная глина ложится на основу и собирает первые массы тела.', '/media/process/03-first-clay.webp'],
    ['04', 'Узнаваемый силуэт', 'Появляются голова, линия спины, лапы и движение будущего Жителя.', '/media/process/04-silhouette.webp'],
    ['05', 'Характер и взгляд', 'Глаз, морда и мелкие формы превращают конструкцию в персонажа.', '/media/process/05-character.webp'],
    ['06', 'Готовая лепка', 'До цвета уже завершены чешуя, крылья, когти и вся пластика поверхности.', '/media/process/06-unpainted.webp'],
    ['07', 'Первая роспись', 'Первые синие мазки намечают глубину, свет и будущую палитру.', '/media/process/07-first-paint.webp'],
    ['08', 'Готовый Азимондиас', 'Многослойная роспись завершает образ — после неё Житель отправился к Хранителю.', '/media/process/08-finished.webp']
  ];
  app.innerHTML = `<main id="main">
    <section class="page-hero page-hero--process"><div class="shell"><p class="eyebrow eyebrow--light">От проволоки до характера</p><h1>Как создаётся Житель</h1><p class="lede lede--light">Не разрозненный коллаж, а настоящий путь Азимондиаса — восемь последовательных этапов ручной работы.</p></div></section>
    <section class="section section--paper process-chronicle"><div class="shell">
      <header class="process-chronicle__head"><div><p class="eyebrow">Рождение формы</p><h2>Азимондиас.<br>Шаг за шагом.</h2></div><p class="lede">${esc(azimondias.story)}</p></header>
      <ol class="process-sequence">${stages.map(([number, title, description, image], index) => `<li class="process-stage ${index % 2 ? 'process-stage--reverse' : ''}" data-reveal>
        <figure class="process-stage__image"><img src="${image}" alt="${esc(title)} — этап создания Азимондиаса" loading="lazy"><figcaption>${number} / 08</figcaption></figure>
        <div class="process-stage__copy"><span>${number}</span><p class="eyebrow">Этап создания</p><h3>${esc(title)}</h3><p>${esc(description)}</p></div>
      </li>`).join('')}</ol>
    </div></section>
    <section class="section section--night"><div class="shell quote-panel"><p class="eyebrow eyebrow--light">Голос Мастера</p><blockquote>«${esc(threshold.quote)}»</blockquote><cite>Вера — о первой большой драконьей работе</cite></div></section>
  </main>`;
  document.title = 'Как создаётся Житель — Мастерская Веры';
  enableAtmosphereMotion();
}

function createResident() {
  const baseOptions = [
    { title: 'Лесной дракон', note: 'Мох, кора и природная палитра', image: '/media/residents/forest-dragon/studio.webp' },
    { title: 'Малыш-дракон', note: 'Новый характер, который ещё появляется', image: '/media/residents/baby-dragon/hero.webp' },
    { title: 'Сказочный спутник', note: 'Дорога, движение и собственная легенда', image: '/media/residents/horse/hero.webp' }
  ];
  app.innerHTML = `<main id="main">
    <section class="page-hero page-hero--create"><div class="shell"><p class="eyebrow eyebrow--light">Будущая работа</p><h1>Обсудить идею с Верой</h1><p class="lede lede--light">Не конструктор готовой копии, а разговор о характере, форме, цвете и деталях нового Жителя.</p></div></section>
    <section class="section section--paper"><div class="shell creation-layout">
      <aside class="creation-preview">
        <img src="${baseOptions[0].image}" alt="Пример направления будущей работы" data-preview-image>
        <div class="creation-preview__copy"><p class="eyebrow eyebrow--light">Направление образа</p><h2 data-preview-title>${baseOptions[0].title}</h2><p data-preview-note>${baseOptions[0].note}</p></div>
      </aside>
      <div class="creation-panel"><p class="eyebrow">Первый разговор</p><h2>С чего может начаться новый Житель</h2><p class="lede">Выберите близкое настроение. Это не обещание точной копии, а отправная точка для разговора с Верой.</p>
        <div class="option-grid" data-choice="base">${baseOptions.map((option, index) => `<button class="option ${index === 0 ? 'is-selected' : ''}" type="button" data-title="${option.title}" data-note="${option.note}" data-image="${option.image}"><img src="${option.image}" alt=""><span><b>${option.title}</b><small>${option.note}</small></span></button>`).join('')}</div>
        <p class="creation-note">Размер, материалы, сроки и стоимость Вера обсуждает лично после знакомства с идеей.</p>
        <div class="contact-actions"><a class="button button--wine" href="https://t.me/vera120700" target="_blank" rel="noreferrer">Написать в Telegram</a><a class="button button--line" href="https://www.instagram.com/vera.romanycheva.23" target="_blank" rel="noreferrer">Instagram</a></div>
      </div>
    </div></section>
  </main>`;
  document.title = 'Обсудить нового Жителя — Мастерская Веры';
  document.querySelector('[data-choice="base"]').addEventListener('click', (event) => {
    const option = event.target.closest('.option');
    if (!option) return;
    document.querySelectorAll('[data-choice="base"] .option').forEach((item) => item.classList.toggle('is-selected', item === option));
    document.querySelector('[data-preview-image]').src = option.dataset.image;
    document.querySelector('[data-preview-title]').textContent = option.dataset.title;
    document.querySelector('[data-preview-note]').textContent = option.dataset.note;
  });
}

function chronicle() {
  const resident = byId(content.residents, query('resident')) || content.residents[0];
  const collection = collectionFor(resident);
  const [status, className] = statusCopy(resident.availability);
  let primaryAction = '';
  if (resident.availability === 'available') {
    primaryAction = `<a class="button button--wine" href="${esc(purchaseLink(resident))}" target="_blank" rel="noreferrer">Написать Вере</a>`;
  } else if (resident.availability === 'in-progress') {
    primaryAction = `<a class="button button--wine" href="/contact.html?resident=${encodeURIComponent(resident.slug)}">Узнать о работе</a>`;
  }

  app.innerHTML = `<main id="main" class="theme-${esc(collection.theme)}">
    <section class="chronicle-hero">
      <img class="chronicle-hero__scene" src="${esc(resident.sceneImage || collection.sceneImage || collection.image)}" alt="${esc(resident.name)} в мире «${esc(collection.name)}»">
      <div class="chronicle-hero__shade"></div>${atmosphereMarkup(collection.theme)}
      <div class="shell"><p class="eyebrow eyebrow--light">Хроника Жителя · ${esc(collection.name)}</p><h1>${esc(resident.name)}</h1><p class="lede lede--light">${esc(resident.excerpt)}</p></div>
    </section>
    <section class="section section--paper"><div class="shell resident-detail">
      <figure class="resident-detail__image"><img src="${esc(resident.heroImage)}" alt="${esc(resident.name)}"></figure>
      <div class="resident-detail__copy"><span class="status ${className}">${status}</span><h2>${esc(resident.name)}</h2><p class="lede">${esc(resident.story)}</p>
        <dl class="meta-list"><div><dt>Мир</dt><dd>${esc(collection.name)}</dd></div>${['available', 'in-progress'].includes(resident.availability) ? `<div><dt>Стоимость</dt><dd>${esc(priceLabel(resident))}</dd></div>` : ''}<div><dt>Работа</dt><dd>${esc(techniqueCopy(resident.technique))}</dd></div><div><dt>Характер</dt><dd>${esc(resident.character)}</dd></div><div><dt>Где обитает</dt><dd>${esc(resident.habitat)}</dd></div></dl>
        <div class="cluster">${primaryAction}<a class="button button--line" href="/residents.html">Все Жители</a></div>
      </div>
    </div></section>
    <section class="section"><div class="shell"><header class="section-head"><div><p class="eyebrow">Свиток Жителя</p><h2>Хроника в трёх частях</h2></div></header><div class="chronicle-grid"><div><p class="eyebrow">Истоки</p><h3>Откуда пришёл</h3><p>${esc(resident.chronicle?.origin)}</p></div><div><p class="eyebrow">Характер</p><h3>Какой он</h3><p>${esc(resident.chronicle?.character)}</p></div><div><p class="eyebrow">Путь</p><h3>Куда ведёт история</h3><p>${esc(resident.chronicle?.path)}</p></div></div></div></section>
    <section class="section section--night"><div class="shell"><header class="section-head section-head--light"><div><p class="eyebrow eyebrow--light">Настоящие фотографии</p><h2>Рассмотреть ближе</h2></div></header><div class="gallery">${resident.gallery.map((media, index) => isVideo(media) ? `<div class="gallery__video">${galleryMedia(media, `${resident.name} — видео ${index + 1}`)}</div>` : `<button type="button" data-lightbox="${esc(media)}" aria-label="Открыть фото ${index + 1}">${galleryMedia(media, `${resident.name} — фотография ${index + 1}`)}</button>`).join('')}</div></div></section>
    ${chronicleNextStep(resident, collection)}
  </main>`;
  document.title = `${resident.name} — Хроника Мастерской Веры`;
  bindLightbox();
  enableAtmosphereMotion();
}

// A resident's page must never be a dead end. A sold or reserved one still
// leads somewhere: to the ones that are free, or to a commission.
function chronicleNextStep(resident, collection) {
  const free = content.residents.filter((item) => item.availability === 'available' && item.id !== resident.id);
  const suggestions = [
    ...free.filter((item) => item.collectionId === resident.collectionId),
    ...free.filter((item) => item.collectionId !== resident.collectionId)
  ].slice(0, 3);

  const taken = resident.availability === 'archive' || resident.availability === 'reserved';
  const heading = taken
    ? 'Этот Житель уже нашёл свой дом'
    : resident.availability === 'in-progress'
      ? 'Этот Житель ещё рождается'
      : `Забрать «${resident.shortName || resident.name}» к себе`;
  const copy = taken
    ? 'Повторить его один в один нельзя — каждая работа создаётся в единственном экземпляре. Но Вера может слепить для вас нового Жителя в том же духе, а ещё вот кто свободен прямо сейчас.'
    : resident.availability === 'in-progress'
      ? 'Работа ещё в Мастерской. Напишите Вере — она расскажет, на каком он этапе, когда будет готов и сколько будет стоить.'
      : 'Напишите Вере — она подтвердит, что он свободен, назовёт стоимость и расскажет, как он доедет до вас.';

  const action = taken
    ? `<a class="button button--wine" href="https://t.me/vera120700" target="_blank" rel="noreferrer">Заказать похожего</a><a class="button button--line" href="/residents.html">Кто свободен сейчас</a>`
    : resident.availability === 'in-progress'
      ? `<a class="button button--wine" href="/contact.html?resident=${encodeURIComponent(resident.slug)}">Спросить о работе</a><a class="button button--line" href="/collection.html?world=${encodeURIComponent(collection.slug || '')}">Другие из этого Мира</a>`
      : `<a class="button button--wine" href="${esc(purchaseLink(resident))}" target="_blank" rel="noreferrer">Написать Вере</a><a class="button button--line" href="/collection.html?world=${encodeURIComponent(collection.slug || '')}">Другие из этого Мира</a>`;

  return `<section class="section section--paper next-step">
    <div class="shell">
      <div class="next-step__panel" data-reveal>
        <p class="eyebrow">Что дальше</p>
        <h2>${esc(heading)}</h2>
        <p>${esc(copy)}</p>
        <div class="cluster">${action}</div>
      </div>
      ${taken && suggestions.length ? `<div class="next-step__suggestions" data-reveal>
        <p class="eyebrow">Свободны прямо сейчас</p>
        <div class="resident-carousel">${suggestions.map(residentCard).join('')}</div>
      </div>` : ''}
    </div>
  </section>`;
}

function about() {
  app.innerHTML = `<main id="main">
    <section class="page-hero page-hero--about"><div class="shell"><p class="eyebrow eyebrow--light">О Мастерской</p><h1>Там, где форма становится характером</h1><p class="lede lede--light">Вера лепит и расписывает фантазийных Жителей вручную — от первого каркаса до финального взгляда.</p></div></section>
    <section class="section section--paper"><div class="shell about-grid"><figure class="about-image"><img src="/media/residents/forest-dragon/studio.webp" alt="Готовая работа Веры" loading="lazy"></figure><div><p class="eyebrow">Руки и материал</p><h2>Работа начинается не с витрины, а с идеи и формы</h2><p class="lede">Полимерная глина, каркас из фольги и проволоки, ручная обработка, акриловая роспись, защитное покрытие и маленькие детали — путь каждого Жителя зависит от его характера.</p><div class="facts"><div class="fact"><b>Вручную</b><span>каждый этап проходит через руки Веры</span></div><div class="fact"><b>Лично</b><span>идеи и заказы обсуждаются напрямую</span></div><div class="fact"><b>Без копий</b><span>повторить работу один в один нельзя</span></div></div><div class="cluster cluster--top"><a class="button button--wine" href="/contact.html">Написать Вере</a><a class="button button--line" href="/process.html">Посмотреть процесс</a></div></div></div></section>
  </main>`;
  document.title = 'О Мастерской — Мастерская Веры';
}

function contact() {
  const resident = byId(content.residents, query('resident'));
  const telegramText = resident
    ? encodeURIComponent(`Здравствуйте! Хочу узнать о Жителе «${resident.name}».`)
    : encodeURIComponent('Здравствуйте! Хочу узнать о работах Мастерской Веры.');
  app.innerHTML = `<main id="main">
    <section class="page-hero page-hero--contact"><div class="shell"><p class="eyebrow eyebrow--light">Связь с Мастерской</p><h1>Написать Вере</h1><p class="lede lede--light">О готовой работе, будущем Жителе или доставке — без посредников.</p></div></section>
    <section class="section section--paper"><div class="shell contact-grid">
      <div class="contact-card"><p class="eyebrow">Telegram</p><h2>Самый быстрый способ связаться</h2><p>${resident ? `Вы спрашиваете о работе «${esc(resident.name)}». Сообщение уже будет подготовлено.` : 'Вера лично ответит на вопросы о наличии, стоимости, сроках и индивидуальной работе.'}</p><div class="contact-actions"><a class="button button--wine" href="https://t.me/vera120700?text=${telegramText}" target="_blank" rel="noreferrer">Открыть Telegram</a><a class="button button--line" href="https://www.instagram.com/vera.romanycheva.23" target="_blank" rel="noreferrer">Instagram</a></div><p class="contact-channel">Смотреть готовые работы и процесс: <a class="text-link" href="https://t.me/masterskayaver" target="_blank" rel="noreferrer">t.me/masterskayaver →</a></p></div>
      <div class="contact-card contact-card--dark"><p class="eyebrow eyebrow--light">Что можно уточнить</p><ul class="contact-list"><li><span>01</span>Есть ли Житель в наличии</li><li><span>02</span>Стоимость и доставка</li><li><span>03</span>Идея индивидуальной работы</li><li><span>04</span>Подарочный набор</li></ul></div>
    </div></section>
    <section class="section section--night"><div class="shell">
      <header class="section-head section-head--light" data-reveal><div><p class="eyebrow eyebrow--light">Прежде чем писать</p><h2>Доставка и оплата</h2></div></header>
      <div class="facts facts--wide facts--light" data-reveal>
        <div class="fact"><b>География</b><span>По всей России и, по возможности, в любую точку мира — Вера подскажет, дойдёт ли посылка именно до вас.</span></div>
        <div class="fact"><b>Доставка</b><span>Стоимость и способ отправки оплачивает заказчик — обсуждается вместе с Верой после выбора Жителя.</span></div>
        <div class="fact"><b>Сроки и стоимость</b><span>Зависят от размера работы, региона и способа доставки — точные цифры Вера называет индивидуально.</span></div>
        <div class="fact"><b>Оплата</b><span>Перевод на карту, наличные при личной встрече или безопасная сделка через Авито-доставку.</span></div>
      </div>
    </div></section>
  </main>`;
  document.title = 'Связаться с Верой — Мастерская Веры';
  enableAtmosphereMotion();
}

function bindLightbox() {
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.innerHTML = '<button type="button" aria-label="Закрыть фотографию">×</button>';
  document.body.append(lightbox);

  // The <img> is built on first open, so no src-less image ever sits in the
  // document waiting to be used.
  let picture = null;
  const picture_ = () => {
    if (!picture) {
      picture = document.createElement('img');
      picture.alt = 'Увеличенная фотография Жителя';
      lightbox.append(picture);
    }
    return picture;
  };

  const close = () => {
    lightbox.classList.remove('is-open');
    document.body.classList.remove('menu-open');
  };
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox || event.target.matches('button')) close();
  });
  document.querySelectorAll('[data-lightbox]').forEach((button) => button.addEventListener('click', () => {
    picture_().src = button.dataset.lightbox;
    lightbox.classList.add('is-open');
    // Stop the page behind the overlay from scrolling under it.
    document.body.classList.add('menu-open');
  }));
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
}

function notFound() {
  app.innerHTML = '<main id="main"><section class="section"><div class="shell"><p class="eyebrow">Страница не найдена</p><h1>Здесь пока нет Хроники</h1><p class="lede">Вернитесь на главную или откройте атлас Миров.</p><p class="cluster cluster--top"><a class="button button--wine" href="/">На главную</a></p></div></section></main>';
}

// Try the live API first (the real Express server); on any static host —
// GitHub Pages, Beget, a future domain — that 404s, so fall back to the
// content.json snapshot the build step generates. This way the frontend
// doesn't need to know in advance which kind of host it's running on.
async function loadContent() {
  try {
    const response = await fetch('/api/content');
    if (response.ok) return await response.json();
  } catch { /* no server here — fall through to the static snapshot */ }
  const response = await fetch('content.json');
  if (!response.ok) throw new Error('Контент недоступен');
  return await response.json();
}

async function boot() {
  try {
    content = await loadContent();
    const active = page === 'collection' || page === 'collections'
      ? 'collections'
      : page === 'chronicle'
        ? 'residents'
        : page === 'create'
          ? ''
          : page;
    setShell(active);
    ({
      home,
      residents,
      collections,
      collection: collectionPage,
      process,
      create: createResident,
      chronicle,
      about,
      contact
    }[page] || notFound)();
    rewritePreviewPaths();
  } catch (error) {
    setShell('');
    app.innerHTML = `<main id="main"><section class="section"><div class="shell"><p class="eyebrow">Техническая пауза</p><h1>Мастерская пока не открылась</h1><p class="lede">${esc(error.message)}. Попробуйте обновить страницу чуть позже.</p></div></section></main>`;
    rewritePreviewPaths();
  }
}

boot();

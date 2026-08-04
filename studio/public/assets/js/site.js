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

function atmosphereMarkup(theme) {
  if (theme === 'forest') {
    const points = [
      [8, 22, 6, .2, .75], [18, 64, 8, 2.3, .5], [29, 34, 7, 4.7, .9],
      [41, 76, 10, 1.1, .65], [54, 18, 8, 3.4, .52], [61, 57, 6, 5.3, .8],
      [72, 31, 9, .9, .62], [81, 69, 7, 4.1, .72], [91, 43, 10, 2.8, .55]
    ];
    return `<div class="atmosphere atmosphere--forest" aria-hidden="true">${points.map(([x, y, d, delay, scale]) => `<i style="--x:${x}%;--y:${y}%;--d:${d}s;--delay:-${delay}s;--scale:${scale}"></i>`).join('')}</div>`;
  }
  if (theme === 'winter') {
    const flakes = Array.from({ length: 24 }, (_, index) => {
      const x = (index * 37 + 11) % 100;
      const d = 8 + (index % 7) * 1.7;
      const delay = (index * 1.37) % 11;
      const size = 2 + (index % 4);
      return `<i style="--x:${x}%;--d:${d}s;--delay:-${delay}s;--size:${size}px"></i>`;
    }).join('');
    return `<div class="atmosphere atmosphere--winter" aria-hidden="true">${flakes}</div>`;
  }
  if (theme === 'dragons') {
    return '<div class="atmosphere atmosphere--dragons" aria-hidden="true"><i></i><i></i><b></b></div>';
  }
  if (theme === 'russian') {
    return '<div class="atmosphere atmosphere--russian" aria-hidden="true"><i></i><b></b></div>';
  }
  return '<div class="atmosphere atmosphere--home" aria-hidden="true"><i></i><i></i><i></i></div>';
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
        <span class="brand__mark" aria-hidden="true">✦</span>
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
      <img src="${esc(resident.heroImage)}" alt="${esc(resident.name)}" loading="lazy">
      <span class="resident-card__world">${esc(world.name)}</span>
    </a>
    <div class="resident-card__body">
      <span class="status ${className}">${label}</span>
      <h3>${esc(resident.shortName || resident.name)}</h3>
      <p>${esc(resident.excerpt)}</p>
      <div class="cluster">${residentActions(resident, true)}</div>
    </div>
  </article>`;
}

function worldCard(collection, index = 0) {
  const count = content.residents.filter((resident) => resident.collectionId === collection.id).length;
  return `<article class="world-chapter theme-${esc(collection.theme)}" data-reveal>
    <img class="world-chapter__scene" src="${esc(collection.sceneImage || collection.image)}" alt="" loading="lazy">
    <div class="world-chapter__shade"></div>
    ${atmosphereMarkup(collection.theme)}
    <a class="world-chapter__link" href="/collection.html?world=${encodeURIComponent(collection.slug)}" aria-label="Открыть мир «${esc(collection.name)}»"></a>
    <div class="world-chapter__copy">
      <span class="world-chapter__number">0${index + 1}</span>
      <p class="eyebrow eyebrow--light">Мир Мастерской</p>
      <h3>${esc(collection.name)}</h3>
      <p>${esc(collection.description)}</p>
      <span class="world-chapter__cue">${esc(collection.cue || '')}</span>
      <span class="text-link text-link--light">Войти в мир <b aria-hidden="true">↗</b></span>
    </div>
    <figure class="world-chapter__resident">
      <img src="${esc(collection.image)}" alt="${esc(collection.name)} — работа Веры" loading="lazy">
      <figcaption>${count} ${count === 1 ? 'Житель' : count < 5 ? 'Жителя' : 'Жителей'}</figcaption>
    </figure>
  </article>`;
}

function enableAtmosphereMotion() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle('is-visible', entry.isIntersecting));
  }, { threshold: .12 });
  document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));
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
          <p class="lede lede--light" data-reveal>Вера вручную создаёт драконов, сказочных персонажей и маленькие лесные чудеса. У каждого — свой характер, единственный экземпляр и путь к дому.</p>
          <div class="cluster" data-reveal>
            <a class="button button--wine" href="/residents.html">Смотреть Жителей <span aria-hidden="true">↗</span></a>
            <a class="button button--light" href="#worlds">Открыть Миры</a>
          </div>
        </div>
        <aside class="home-hero__folio" data-reveal>
          <p>Сейчас в Мастерской</p>
          <strong>${availableCount}</strong>
          <span>готовых работ можно приобрести</span>
          <a href="https://t.me/vera120700" target="_blank" rel="noreferrer">Спросить Веру →</a>
        </aside>
      </div>
      <a class="hero-scroll" href="#worlds"><span>Листать к Мирам</span><i>↓</i></a>
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

    <section class="section section--deep">
      <div class="shell story-strip" data-reveal>
        <figure class="story-strip__image"><img src="${esc(giftStory.image)}" alt="Подарочный набор Мастерской Веры" loading="lazy"></figure>
        <div class="story-strip__copy">
          <p class="eyebrow eyebrow--light">Путь к Хранителю</p>
          <h2>${esc(giftStory.title)}</h2>
          <p>${esc(giftStory.lead)}</p>
          <div class="cluster"><a class="button button--wine" href="https://t.me/vera120700" target="_blank" rel="noreferrer">Написать Вере</a><a class="button button--light" href="/process.html">Как создаются</a></div>
        </div>
      </div>
    </section>
  </main>`;
  document.title = 'Мастерская Веры — авторские фигурки ручной работы';
  enableAtmosphereMotion();
}

function residentWorldSection(collection) {
  const residentsInWorld = content.residents.filter((resident) => resident.collectionId === collection.id);
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
  return `<article class="world-resident ${index === 0 ? 'is-active' : ''}" data-world-slide data-index="${index}" aria-hidden="${index === 0 ? 'false' : 'true'}">
    <figure class="world-resident__photo">
      <img src="${esc(resident.heroImage)}" alt="${esc(resident.name)}" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>
      <span>Настоящая работа Веры</span>
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
  const residentsInWorld = content.residents.filter((resident) => resident.collectionId === collection.id);
  document.body.classList.add(`theme-${collection.theme}`);

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
      </div>
      ${residentsInWorld.length ? `<div class="shell world-slider" data-world-slider tabindex="0" aria-label="Жители мира «${esc(collection.name)}»">
        <div class="world-slider__slides">${residentsInWorld.map(worldResidentSlide).join('')}</div>
        <div class="world-slider__controls">
          <button type="button" data-world-prev aria-label="Предыдущий Житель">←</button>
          <div class="world-slider__count"><span data-world-current>01</span><i></i><span>${String(residentsInWorld.length).padStart(2, '0')}</span></div>
          <button type="button" data-world-next aria-label="Следующий Житель">→</button>
        </div>
        <div class="world-slider__rail" role="tablist" aria-label="Выбор Жителя">
          ${residentsInWorld.map((resident, index) => `<button class="${index === 0 ? 'is-active' : ''}" type="button" data-world-go="${index}" role="tab" aria-selected="${index === 0 ? 'true' : 'false'}"><img src="${esc(resident.heroImage)}" alt=""><span>${esc(resident.shortName || resident.name)}</span></button>`).join('')}
        </div>
      </div>` : `<div class="shell empty-state empty-state--dark">Первые Жители этого Мира скоро появятся.</div>`}
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
    image.src = slide.querySelector('img').src;
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
  app.innerHTML = `<main id="main">
    <section class="page-hero page-hero--process"><div class="shell"><p class="eyebrow eyebrow--light">От каркаса до характера</p><h1>Как создаётся Житель</h1><p class="lede lede--light">Настоящий путь Азимондиаса: проволока, фольга, форма, первый взгляд и ручная роспись.</p></div></section>
    <section class="section section--paper"><div class="shell process-layout">
      <div class="process-gallery">
        <figure class="process-shot process-shot--large"><img src="${esc(azimondias.heroImage)}" alt="Готовый Азимондиас"><figcaption>04 · Готовый Житель</figcaption></figure>
        <figure class="process-shot"><img src="/media/residents/azimondias/armature.webp" alt="Каркас Азимондиаса"><figcaption>01 · Каркас</figcaption></figure>
        <figure class="process-shot"><img src="/media/residents/azimondias/sculpture.webp" alt="Скульптура Азимондиаса"><figcaption>03 · Форма</figcaption></figure>
      </div>
      <div class="process-copy"><p class="eyebrow">Рождение формы</p><h2>Настоящая ручная работа, шаг за шагом</h2><p class="lede">${esc(azimondias.story)}</p>
        <ol class="timeline"><li><b>01</b><div><strong>Искра и каркас</strong><span>Идея получает опору из проволоки и фольги.</span></div></li><li><b>02</b><div><strong>Лепка</strong><span>Глина собирает силуэт, пластику и детали.</span></div></li><li><b>03</b><div><strong>Роспись</strong><span>Цвет, глаза и фактура пробуждают характер.</span></div></li><li><b>04</b><div><strong>Встреча</strong><span>Готовый Житель отправляется к Хранителю.</span></div></li></ol>
      </div>
    </div></section>
    <section class="section section--night"><div class="shell quote-panel"><p class="eyebrow eyebrow--light">Голос Мастера</p><blockquote>«${esc(threshold.quote)}»</blockquote><cite>Вера — о первой большой драконьей работе</cite></div></section>
  </main>`;
  document.title = 'Как создаётся Житель — Мастерская Веры';
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
      <img class="chronicle-hero__scene" src="${esc(collection.sceneImage || collection.image)}" alt="">
      <div class="chronicle-hero__shade"></div>${atmosphereMarkup(collection.theme)}
      <div class="shell"><p class="eyebrow eyebrow--light">Хроника Жителя · ${esc(collection.name)}</p><h1>${esc(resident.name)}</h1><p class="lede lede--light">${esc(resident.excerpt)}</p></div>
    </section>
    <section class="section section--paper"><div class="shell resident-detail">
      <figure class="resident-detail__image"><img src="${esc(resident.heroImage)}" alt="${esc(resident.name)}"></figure>
      <div class="resident-detail__copy"><span class="status ${className}">${status}</span><h2>${esc(resident.name)}</h2><p class="lede">${esc(resident.story)}</p>
        <dl class="meta-list"><div><dt>Мир</dt><dd>${esc(collection.name)}</dd></div><div><dt>Работа</dt><dd>${esc(techniqueCopy(resident.technique))}</dd></div><div><dt>Характер</dt><dd>${esc(resident.character)}</dd></div><div><dt>Где обитает</dt><dd>${esc(resident.habitat)}</dd></div></dl>
        <div class="cluster">${primaryAction}<a class="button button--line" href="/residents.html">Все Жители</a></div>
      </div>
    </div></section>
    <section class="section"><div class="shell"><header class="section-head"><div><p class="eyebrow">Свиток Жителя</p><h2>Хроника в трёх частях</h2></div></header><div class="chronicle-grid"><div><p class="eyebrow">Истоки</p><h3>Откуда пришёл</h3><p>${esc(resident.chronicle?.origin)}</p></div><div><p class="eyebrow">Характер</p><h3>Какой он</h3><p>${esc(resident.chronicle?.character)}</p></div><div><p class="eyebrow">Путь</p><h3>Куда ведёт история</h3><p>${esc(resident.chronicle?.path)}</p></div></div></div></section>
    <section class="section section--night"><div class="shell"><header class="section-head section-head--light"><div><p class="eyebrow eyebrow--light">Настоящие фотографии</p><h2>Рассмотреть ближе</h2></div></header><div class="gallery">${resident.gallery.map((media, index) => isVideo(media) ? `<div class="gallery__video">${galleryMedia(media, `${resident.name} — видео ${index + 1}`)}</div>` : `<button type="button" data-lightbox="${esc(media)}" aria-label="Открыть фото ${index + 1}">${galleryMedia(media, `${resident.name} — фотография ${index + 1}`)}</button>`).join('')}</div></div></section>
  </main>`;
  document.title = `${resident.name} — Хроника Мастерской Веры`;
  bindLightbox();
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
      <div class="contact-card"><p class="eyebrow">Telegram</p><h2>Самый быстрый способ связаться</h2><p>${resident ? `Вы спрашиваете о работе «${esc(resident.name)}». Сообщение уже будет подготовлено.` : 'Вера лично ответит на вопросы о наличии, стоимости, сроках и индивидуальной работе.'}</p><div class="contact-actions"><a class="button button--wine" href="https://t.me/vera120700?text=${telegramText}" target="_blank" rel="noreferrer">Открыть Telegram</a><a class="button button--line" href="https://www.instagram.com/vera.romanycheva.23" target="_blank" rel="noreferrer">Instagram</a></div></div>
      <div class="contact-card contact-card--dark"><p class="eyebrow eyebrow--light">Что можно уточнить</p><ul class="contact-list"><li><span>01</span>Есть ли Житель в наличии</li><li><span>02</span>Стоимость и доставка</li><li><span>03</span>Идея индивидуальной работы</li><li><span>04</span>Подарочный набор</li></ul></div>
    </div></section>
  </main>`;
  document.title = 'Связаться с Верой — Мастерская Веры';
}

function bindLightbox() {
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.innerHTML = '<button type="button" aria-label="Закрыть фотографию">×</button><img alt="Увеличенная фотография Жителя">';
  document.body.append(lightbox);
  const close = () => lightbox.classList.remove('is-open');
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox || event.target.matches('button')) close();
  });
  document.querySelectorAll('[data-lightbox]').forEach((button) => button.addEventListener('click', () => {
    lightbox.querySelector('img').src = button.dataset.lightbox;
    lightbox.classList.add('is-open');
  }));
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
}

function notFound() {
  app.innerHTML = '<main id="main"><section class="section"><div class="shell"><p class="eyebrow">Страница не найдена</p><h1>Здесь пока нет Хроники</h1><p class="lede">Вернитесь на главную или откройте атлас Миров.</p><p class="cluster cluster--top"><a class="button button--wine" href="/">На главную</a></p></div></section></main>';
}

async function boot() {
  try {
    const response = await fetch(isStaticPreview ? 'content.json' : '/api/content');
    if (!response.ok) throw new Error('Контент недоступен');
    content = await response.json();
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

const app = document.querySelector('#app');
const page = document.body.dataset.page || 'home';
let content;
const isStaticPreview = window.location.hostname.endsWith('.github.io');
const staticBasePath = isStaticPreview ? `/${window.location.pathname.split('/').filter(Boolean)[0] || ''}`.replace(/\/$/, '') : '';

function rewritePreviewPaths(root = document) {
  if (!isStaticPreview) return;
  root.querySelectorAll('[href^="/"], [src^="/"]').forEach((element) => {
    for (const attribute of ['href', 'src']) {
      const value = element.getAttribute(attribute);
      if (value?.startsWith('/') && !value.startsWith('//')) element.setAttribute(attribute, `${staticBasePath}${value}`);
    }
  });
}

const esc = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
const byId = (items, key) => items.find((item) => item.id === key || item.slug === key);
const query = (key) => new URLSearchParams(window.location.search).get(key);
const isVideo = (url = '') => /\.(mp4|webm|mov)(?:\?.*)?$/i.test(url);
const galleryMedia = (url, alt) => isVideo(url)
  ? `<video src="${esc(url)}" controls playsinline preload="metadata" aria-label="${esc(alt)}"></video>`
  : `<img src="${esc(url)}" alt="${esc(alt)}" loading="lazy">`;

function statusCopy(status) {
  return {
    available: ['В наличии', 'status--available'],
    'in-progress': ['В работе', 'status--in-progress'],
    reserved: ['Уже выбрали', 'status--reserved'],
    archive: ['Нашёл Хранителя', '']
  }[status] || ['Хроника Мастерской', ''];
}

function techniqueCopy(technique) {
  return technique === 'author-series' ? 'Авторская серия' : 'Единственный в своём роде';
}

function collectionFor(resident) {
  return byId(content.collections, resident.collectionId) || { name: 'Мастерская', theme: 'dragons' };
}

function setShell(active) {
  const header = document.querySelector('[data-site-header]');
  const footer = document.querySelector('[data-site-footer]');
  const nav = [
    ['home', '/', 'Главная'],
    ['residents', '/residents.html', 'Жители'],
    ['collections', '/collections.html', 'Коллекции'],
    ['process', '/process.html', 'Как создаются'],
    ['about', '/about.html', 'О мастерской'],
    ['contact', '/contact.html', 'Связаться']
  ];
  header.innerHTML = `<a class="skip-link" href="#main">Перейти к содержанию</a>
    <div class="site-header"><div class="header-inner">
      <a class="brand" href="/" aria-label="Мастерская Веры — главная"><span class="brand__mark" aria-hidden="true">✦</span><span class="brand__name">Мастерская Веры</span></a>
      <nav class="main-nav" id="main-nav" aria-label="Основная навигация">${nav.map(([id, href, label]) => `<a class="${id === active ? 'is-active' : ''}" ${id === active ? 'aria-current="page"' : ''} href="${href}">${label}</a>`).join('')}</nav>
      <div class="header-actions"><a class="button button--wine button--compact header-cta" href="/create.html">Создать Жителя</a><button class="menu-toggle" type="button" aria-controls="main-nav" aria-expanded="false" data-menu-toggle>☰</button></div>
    </div></div>`;
  const footerNote = isStaticPreview
    ? 'Сейчас открыта версия для просмотра. Админка появится на серверной версии сайта.'
    : 'Свиток Жителя и его Хроника — часть встречи. <a href="/admin">Вход в админку</a>';
  footer.innerHTML = `<footer class="site-footer"><div class="shell footer-grid">
      <div><a class="brand" href="/"><span class="brand__mark" aria-hidden="true">✦</span><span class="brand__name">Мастерская Веры</span></a><p class="footer-copy">Авторские Жители из глины, красок, деталей и историй. Каждый создаётся вручную и находит своего Хранителя.</p></div>
      <nav class="footer-nav" aria-label="Навигация в подвале"><a href="/residents.html">Жители</a><a href="/collections.html">Коллекции</a><a href="/process.html">Как создаются</a><a href="/create.html">Создать Жителя</a><a href="/contact.html">Связаться с Верой</a></nav>
      <p class="footer-note">${footerNote}</p>
    </div></footer><button class="scroll-top" type="button" data-scroll-top aria-label="Наверх">↑</button>`;
  document.querySelector('[data-menu-toggle]').addEventListener('click', () => {
    const button = document.querySelector('[data-menu-toggle]');
    const navEl = document.querySelector('#main-nav');
    const open = navEl.classList.toggle('is-open');
    document.body.classList.toggle('menu-open', open);
    button.setAttribute('aria-expanded', String(open));
  });
  const scrollButton = document.querySelector('[data-scroll-top]');
  window.addEventListener('scroll', () => scrollButton.classList.toggle('is-visible', window.scrollY > 550), { passive: true });
  scrollButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function residentCard(resident) {
  const [label, className] = statusCopy(resident.availability);
  const purchaseLink = `https://t.me/vera120700?text=${encodeURIComponent(`Здравствуйте! Хочу узнать о Жителе «${resident.shortName || resident.name}» из Мастерской Веры.`)}`;
  const actions = resident.availability === 'available'
    ? `<a class="button button--wine button--compact" href="${esc(purchaseLink)}" target="_blank" rel="noreferrer">Приобрести</a>`
    : resident.availability === 'in-progress'
      ? `<a class="button button--line button--compact" href="/contact.html?resident=${encodeURIComponent(resident.slug)}">Узнать о Жителе</a>`
      : '';
  return `<article class="resident-card" data-collection="${esc(resident.collectionId)}" data-status="${esc(resident.availability)}">
    <a class="resident-card__image" href="/chronicle.html?resident=${encodeURIComponent(resident.slug)}"><img src="${esc(resident.heroImage)}" alt="${esc(resident.name)}" loading="lazy"></a>
    <div class="resident-card__body"><span class="status ${className}">${label}</span><h3>${esc(resident.shortName || resident.name)}</h3><p>${esc(resident.excerpt)}</p><div class="cluster"><a class="button button--ink button--compact" href="/chronicle.html?resident=${encodeURIComponent(resident.slug)}">Открыть Хронику</a>${actions}</div></div>
  </article>`;
}

function collectionCard(collection) {
  return `<a class="collection-card theme-${esc(collection.theme)}" href="/collection.html?world=${encodeURIComponent(collection.slug)}">
    <img src="${esc(collection.image)}" alt="${esc(collection.name)}" loading="lazy"><div class="collection-card__copy"><p class="eyebrow eyebrow--light">Мир Мастерской</p><h3>${esc(collection.name)}</h3><p>${esc(collection.description)}</p></div>
  </a>`;
}

function enableAtmosphereMotion() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const stage = document.querySelector('[data-hero-stage]');
  if (stage) {
    stage.addEventListener('pointermove', (event) => {
      const bounds = stage.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width - .5).toFixed(3);
      const y = ((event.clientY - bounds.top) / bounds.height - .5).toFixed(3);
      stage.style.setProperty('--pointer-x', x);
      stage.style.setProperty('--pointer-y', y);
    });
    stage.addEventListener('pointerleave', () => {
      stage.style.setProperty('--pointer-x', '0');
      stage.style.setProperty('--pointer-y', '0');
    });
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle('is-visible', entry.isIntersecting));
  }, { threshold: .14 });
  document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));
}

function home() {
  const giftStory = content.stories.find((story) => story.id === 'gift-ceremony') || content.stories[0];
  app.innerHTML = `<main id="main">
    <section class="hero hero--atelier" data-hero-stage><div class="hero__media"><img src="/media/hero/atelier-group-temp.webp" alt="Собрание Жителей Мастерской Веры" fetchpriority="high"></div><div class="hero__shade"></div><div class="hero__mist" aria-hidden="true"></div><div class="shell hero__content"><p class="eyebrow eyebrow--light" data-reveal>Добро пожаловать, путник! ✦</p><h1 data-reveal>Мастерская<br><em>Веры.</em></h1><p class="lede lede--light" data-reveal>Авторские Жители из полимерной глины — с характером, именем и собственной Хроникой.</p><div class="cluster" data-reveal><a class="button button--wine" href="/residents.html">Смотреть Жителей <span aria-hidden="true">↗</span></a><a class="button button--light" href="/about.html">О мастерской</a></div><p class="hero__note" data-reveal>Готовые работы можно приобрести, созданные Жители живут в Хрониках, а новые — пока рождаются в Мастерской.</p></div><a class="hero__scroll" href="#residents" aria-label="Перейти к Жителям"><span>Листать Жителей</span><i>↓</i></a></section>

    <section class="section section--paper manifesto"><div class="shell intro-grid" data-reveal><figure class="intro-grid__visual"><img src="/media/residents/azimondias/final.webp" alt="Азимондиас, синий дракон Веры" loading="lazy"><span class="image-caption">Азимондиас · мир Древних существ</span></figure><div class="introduction"><p class="eyebrow">Не обычный магазин</p><h2>Сначала появляется характер. Потом — имя, история и путь к дому.</h2><p class="lede">У Жителя может быть драконья чешуя, корона, крылья или тихий домашний характер. Но в основе всегда остаётся авторская ручная работа Веры.</p><div class="facts"><div class="fact"><b>Руками</b><span>лепка, роспись, детали и финальное покрытие</span></div><div class="fact"><b>Без копий</b><span>оригиналы не повторяются один в один</span></div><div class="fact"><b>С историей</b><span>Свиток и Хроника продолжают встречу</span></div></div></div></div></section>

    <section id="worlds" class="section section--night worlds-stage"><div class="shell"><header class="section-head" data-reveal><div><p class="eyebrow eyebrow--light">Миры Мастерской</p><h2>У каждой коллекции — свой воздух, свет и характер.</h2></div><a class="text-link text-link--light" href="/collections.html">Открыть атлас →</a></header><div class="worlds-stage__line" aria-hidden="true"><span>Выбери портал</span><i></i><span>Иди за историей</span></div><div class="collection-grid collection-grid--portals">${content.collections.map(collectionCard).join('')}</div></div></section>

    <section id="residents" class="section"><div class="shell"><header class="section-head"><div><p class="eyebrow">Хроники Мастерской</p><h2>Жители, которых уже можно встретить</h2></div><a class="text-link" href="/residents.html">Смотреть всех →</a></header><div class="resident-grid">${content.residents.slice(0, 4).map(residentCard).join('')}</div></div></section>

    <section class="section section--deep"><div class="shell story-strip"><figure class="story-strip__image"><img src="${esc(giftStory.image)}" alt="Подарочный набор Мастерской Веры" loading="lazy"></figure><div class="story-strip__copy"><p class="eyebrow eyebrow--light">Встреча с Хранителем</p><h2>${esc(giftStory.title)}</h2><p>${esc(giftStory.lead)}</p><a class="button button--light" href="/process.html#meeting">Как это устроено</a></div></div></section>

    <section class="section section--paper"><div class="shell"><header class="section-head"><div><p class="eyebrow">Честно о технике</p><h2>Сегодня все Жители создаются вручную</h2></div></header><div class="tech-grid"><article class="tech-card"><span class="tech-card__index">01</span><h3>Оригиналы</h3><p>Полностью слепленные вручную Жители — единственные в своём роде. Точно повторить такую форму нельзя.</p></article><article class="tech-card"><span class="tech-card__index">02</span><h3>Будущие серии</h3><p>Позже у некоторых образов могут появиться авторские основы. Это не массовое производство: каждую отливку Вера будет обрабатывать, расписывать и дополнять вручную.</p></article><article class="tech-card"><span class="tech-card__index">03</span><h3>Своя история</h3><p>Даже при общей форме у Жителей будут разный цвет, взгляд, детали и характер. Тысяч одинаковых заготовок здесь не появится.</p></article></div></div></section>
  </main>`;
  document.title = 'Мастерская Веры — авторские Жители ручной работы';
  enableAtmosphereMotion();
}

function residents() {
  app.innerHTML = `<main id="main"><section class="page-hero"><div class="shell"><p class="eyebrow eyebrow--light">Архив и новые работы</p><h1>Жители Мастерской</h1><p class="lede">Здесь живут готовые, уже нашедшие дом и только рождающиеся работы. Статус у каждого Жителя виден сразу.</p></div></section><section class="section"><div class="shell"><div class="filters" data-filters><button class="filter-button" aria-pressed="true" data-filter="all">Все</button>${content.collections.map((collection) => `<button class="filter-button" aria-pressed="false" data-filter="${esc(collection.id)}">${esc(collection.name)}</button>`).join('')}<button class="filter-button" aria-pressed="false" data-filter="available">Готовы к встрече</button><button class="filter-button" aria-pressed="false" data-filter="in-progress">В работе</button></div><div class="resident-grid" data-resident-grid>${content.residents.map(residentCard).join('')}</div><p class="empty-state" hidden data-empty>Пока в этом разделе нет Жителей. Загляните в другие Миры или напишите Вере.</p></div></section></main>`;
  document.title = 'Жители — Мастерская Веры';
  document.querySelector('[data-filters]').addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    const filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    let visible = 0;
    document.querySelectorAll('[data-resident-grid] .resident-card').forEach((card) => {
      const match = filter === 'all' || card.dataset.collection === filter || card.dataset.status === filter;
      card.hidden = !match;
      if (match) visible += 1;
    });
    document.querySelector('[data-empty]').hidden = visible > 0;
  });
}

function collections() {
  app.innerHTML = `<main id="main"><section class="page-hero"><div class="shell"><p class="eyebrow eyebrow--light">Главы Мастерской</p><h1>Коллекции — это Миры, а не категории</h1><p class="lede">Структура сайта остаётся узнаваемой, но каждый Мир меняет настроение: снег, лесные огни, каменный туман или авторский орнамент.</p></div></section><section class="section section--paper"><div class="shell"><div class="collection-grid">${content.collections.map(collectionCard).join('')}</div></div></section></main>`;
  document.title = 'Коллекции — Мастерская Веры';
}

function collectionPage() {
  const collection = byId(content.collections, query('world')) || content.collections[0];
  const residentsInWorld = content.residents.filter((resident) => resident.collectionId === collection.id);
  document.body.classList.add(`theme-${collection.theme}`);
  app.innerHTML = `<main id="main"><section class="collection-hero theme-${esc(collection.theme)}"><div class="collection-hero__media"><img src="${esc(collection.image)}" alt="${esc(collection.name)}"></div><div class="collection-hero__shade"></div><div class="world-atmosphere" aria-hidden="true"></div><div class="shell"><p class="eyebrow eyebrow--light">Мир Мастерской</p><h1>${esc(collection.name)}</h1><p class="lede">${esc(collection.description)}</p></div></section><section class="section"><div class="shell"><header class="section-head"><div><p class="eyebrow">Обитатели</p><h2>${esc(collection.title)}</h2></div><a class="text-link" href="/collections.html">Все Миры →</a></header>${residentsInWorld.length ? `<div class="resident-grid">${residentsInWorld.map(residentCard).join('')}</div>` : '<p class="empty-state">Первые Жители этого Мира скоро появятся в Хрониках.</p>'}</div></section></main>`;
  document.title = `${collection.name} — Мастерская Веры`;
}

function process() {
  const azimondias = byId(content.residents, 'azimondias') || content.residents[0];
  const threshold = content.stories.find((story) => story.id === 'big-dragon-threshold') || content.stories[0];
  const gift = content.stories.find((story) => story.id === 'gift-ceremony') || content.stories[0];
  app.innerHTML = `<main id="main"><section class="page-hero"><div class="shell"><p class="eyebrow eyebrow--light">От искры до встречи</p><h1>Как создаётся Житель</h1><p class="lede">Не декоративная схема, а путь на настоящих фотографиях: каркас, форма, первый взгляд, роспись и Хроника.</p></div></section><section class="section section--paper"><div class="shell process-grid"><div class="process-photo-stack"><figure class="process-photo"><img src="${esc(azimondias.heroImage)}" alt="Азимондиас после росписи"><figcaption>05 · Встреча с характером</figcaption></figure><figure class="process-photo"><img src="/media/residents/azimondias/armature.webp" alt="Каркас будущего Азимондиаса"><figcaption>01 · Каркас</figcaption></figure><figure class="process-photo"><img src="/media/residents/azimondias/sculpture.webp" alt="Скульптура Азимондиаса до росписи"><figcaption>03 · Форма и взгляд</figcaption></figure></div><div class="process-narrative"><p class="eyebrow">История Азимондиаса</p><h2>От проволоки — к собственному взгляду</h2><p class="lede">${esc(azimondias.story)}</p><ol class="timeline"><li><b>01</b><div><strong>Искра и каркас</strong><span>Идея получает опору из фольги и проволоки.</span></div></li><li><b>02</b><div><strong>Рождение формы</strong><span>Полимерная глина собирает силуэт, пластику и фактуру.</span></div></li><li><b>03</b><div><strong>Пробуждение характера</strong><span>Появляются глаза, цвет, роспись и особые детали.</span></div></li><li><b>04</b><div><strong>Свиток и встреча</strong><span>Житель получает Хронику и отправляется к Хранителю.</span></div></li></ol></div></div></section><section class="section section--night"><div class="shell"><div class="quote-panel"><p class="eyebrow eyebrow--light">Голос Мастера</p><blockquote>«${esc(threshold.quote)}»</blockquote><cite>Вера — о первой большой драконьей работе</cite></div></div></section><section id="meeting" class="section"><div class="shell story-strip"><figure class="story-strip__image"><img src="${esc(gift.image)}" alt="Подарочный набор с Жителями"></figure><div class="story-strip__copy"><p class="eyebrow eyebrow--light">Путь к Хранителю</p><h2>${esc(gift.title)}</h2><p>${esc(gift.body)}</p><a class="button button--light" href="/contact.html">Написать Вере</a></div></div></section></main>`;
  document.title = 'Как создаётся Житель — Мастерская Веры';
}

function createResident() {
  const baseOptions = [
    { id: 'forest', title: 'Лесной дракон', subtitle: 'Чешуя, крылья, древний лес', image: '/media/residents/forest-dragon/hero.webp' },
    { id: 'baby', title: 'Малыш-дракон', subtitle: 'Нежный образ на этапе рождения', image: '/media/residents/baby-dragon/hero.webp' },
    { id: 'horse', title: 'Сказочный спутник', subtitle: 'Дорога, грива и характер', image: '/media/residents/horse/hero.webp' }
  ];
  const palettes = [{ name: 'Лес', color: '#56765a' }, { name: 'Север', color: '#9bc8dd' }, { name: 'Янтарь', color: '#c77b3b' }, { name: 'Ночь', color: '#40324a' }];
  const eyes = [{ name: 'Лёд', color: '#9bd4ee' }, { name: 'Огонь', color: '#dd9835' }, { name: 'Мох', color: '#69a475' }, { name: 'Тайна', color: '#825fb7' }];
  app.innerHTML = `<main id="main"><section class="section section--paper"><div class="shell creation-layout"><aside class="creation-preview" data-preview><img src="${baseOptions[0].image}" alt="Пример образа будущего Жителя"><div class="creation-preview__copy"><p class="eyebrow eyebrow--light">Направление будущего образа</p><h2 data-preview-title>${baseOptions[0].title}</h2><p data-preview-note>Это не точная визуализация готовой работы, а способ поговорить с Верой об образе, цвете и деталях.</p></div></aside><div class="creation-panel"><p class="eyebrow">Индивидуальная идея</p><h1>Создать Жителя</h1><p class="lede">Выберите отправную точку. Вера создаст новую ручную работу, а не копию уже живущего Жителя.</p><div class="creation-step"><h2>1. Выберите направление</h2><div class="option-grid" data-choice="base">${baseOptions.map((option, index) => `<button class="option ${index === 0 ? 'is-selected' : ''}" type="button" data-image="${option.image}" data-title="${option.title}"><span class="option__swatch" style="background-image:url('${option.image}');background-size:cover"></span><span><b>${option.title}</b><span>${option.subtitle}</span></span></button>`).join('')}</div></div><div class="creation-step"><h2>2. Настройте настроение</h2><p class="small-note">Для будущих авторских серий эти выборы станут основой настоящего 2D/3D-превью. Сейчас они помогают точно сформулировать пожелание для ручной работы.</p><div class="option-grid" data-choice="palette">${palettes.map((option, index) => `<button class="option ${index === 0 ? 'is-selected' : ''}" type="button" data-name="${option.name}" data-color="${option.color}"><span class="option__swatch" style="background:${option.color}"></span><span><b>${option.name}</b><span>Основная палитра</span></span></button>`).join('')}</div><h2 style="margin-top:1.4rem">Взгляд</h2><div class="option-grid" data-choice="eye">${eyes.map((option, index) => `<button class="option ${index === 0 ? 'is-selected' : ''}" type="button" data-name="${option.name}" data-color="${option.color}"><span class="option__swatch" style="background:${option.color}"></span><span><b>${option.name}</b><span>Цвет глаз</span></span></button>`).join('')}</div></div><div class="creation-step"><h2>3. Расскажите Вере</h2><form class="inquiry-form" data-inquiry-form><div class="form-row"><div class="field"><label for="inquiry-name">Как к вам обращаться</label><input id="inquiry-name" name="name" required></div><div class="field"><label for="inquiry-contact">Telegram / телефон / e-mail</label><input id="inquiry-contact" name="contact" required></div></div><div class="field"><label for="inquiry-message">Идея, детали, настроение</label><textarea id="inquiry-message" name="message" required placeholder="Например: лесной дракон, холодный зелёный цвет, янтарные глаза, без короны…"></textarea></div><input type="hidden" name="selection" data-selection><button class="button button--wine" type="submit">Отправить идею Вере</button><p class="form-message" aria-live="polite" data-form-message></p></form><p class="small-note">Размер, сроки и стоимость индивидуального Жителя Вера согласует после знакомства с идеей.</p></div></div></div></section></main>`;
  document.title = 'Создать Жителя — Мастерская Веры';
  const choices = { base: baseOptions[0].title, palette: palettes[0].name, eye: eyes[0].name };
  const updateSelection = () => {
    const selection = `Направление: ${choices.base}. Палитра: ${choices.palette}. Взгляд: ${choices.eye}.`;
    document.querySelector('[data-selection]').value = selection;
    document.querySelector('[data-preview-note]').textContent = `${selection} Это направление, а не точная копия будущей ручной работы.`;
  };
  document.querySelectorAll('[data-choice]').forEach((group) => group.addEventListener('click', (event) => {
    const option = event.target.closest('.option');
    if (!option) return;
    group.querySelectorAll('.option').forEach((item) => item.classList.toggle('is-selected', item === option));
    const key = group.dataset.choice;
    choices[key] = option.dataset.title || option.dataset.name;
    if (key === 'base') {
      document.querySelector('[data-preview] img').src = option.dataset.image;
      document.querySelector('[data-preview-title]').textContent = option.dataset.title;
    }
    if (key === 'palette') document.querySelector('[data-preview]').style.boxShadow = `inset 0 -8px 0 ${option.dataset.color}, var(--shadow)`;
    updateSelection();
  }));
  updateSelection();
  bindInquiryForm();
}

function chronicle() {
  const resident = byId(content.residents, query('resident')) || content.residents[0];
  const collection = collectionFor(resident);
  const [status, className] = statusCopy(resident.availability);
  const purchaseLink = `https://t.me/vera120700?text=${encodeURIComponent(`Здравствуйте! Хочу приобрести Жителя «${resident.shortName || resident.name}» из Мастерской Веры.`)}`;
  app.innerHTML = `<main id="main" class="theme-${esc(collection.theme)}"><section class="page-hero"><div class="shell"><p class="eyebrow eyebrow--light">Хроника Жителя · ${esc(collection.name)}</p><h1>${esc(resident.name)}</h1><p class="lede">${esc(resident.excerpt)}</p></div></section><section class="section section--paper"><div class="shell resident-detail"><figure class="resident-detail__image"><img src="${esc(resident.heroImage)}" alt="${esc(resident.name)}"></figure><div class="resident-detail__copy"><span class="status ${className}">${status}</span><h1>${esc(resident.name)}</h1><p class="lede">${esc(resident.story)}</p><dl class="meta-list"><div><dt>Мир</dt><dd>${esc(collection.name)}</dd></div><div><dt>Статус работы</dt><dd>${esc(techniqueCopy(resident.technique))}</dd></div><div><dt>Характер</dt><dd>${esc(resident.character)}</dd></div><div><dt>Где обитает</dt><dd>${esc(resident.habitat)}</dd></div></dl><div class="cluster">${resident.availability === 'available' ? `<a class="button button--wine" href="${esc(purchaseLink)}" target="_blank" rel="noreferrer">Написать Вере</a>` : `<a class="button button--wine" href="/create.html">Создать нового Жителя</a>`}<a class="button button--line" href="/residents.html">Все Жители</a></div></div></div></section><section class="section"><div class="shell"><header class="section-head"><div><p class="eyebrow">Свиток Жителя</p><h2>Хроника в трёх частях</h2></div></header><div class="chronicle-grid"><div><p class="eyebrow">Истоки</p><h3>Откуда пришёл</h3><p>${esc(resident.chronicle?.origin)}</p></div><div><p class="eyebrow">Характер</p><h3>Какой он</h3><p>${esc(resident.chronicle?.character)}</p></div><div><p class="eyebrow">Путь</p><h3>Куда ведёт история</h3><p>${esc(resident.chronicle?.path)}</p></div></div></div></section><section class="section section--night"><div class="shell"><header class="section-head"><div><p class="eyebrow eyebrow--light">Галерея</p><h2>Рассмотреть ближе</h2></div></header><div class="gallery">${resident.gallery.map((media, index) => isVideo(media) ? `<div class="gallery__video">${galleryMedia(media, `${resident.name} — видео ${index + 1}`)}</div>` : `<button type="button" data-lightbox="${esc(media)}" aria-label="Открыть фото ${index + 1}">${galleryMedia(media, `${resident.name} — фотография ${index + 1}`)}</button>`).join('')}</div></div></section></main>`;
  document.title = `${resident.name} — Хроника Мастерской Веры`;
  bindLightbox();
}

function about() {
  const image = '/media/residents/forest-dragon/studio.webp';
  app.innerHTML = `<main id="main"><section class="page-hero"><div class="shell"><p class="eyebrow eyebrow--light">О Мастерской</p><h1>Там, где форма становится характером</h1><p class="lede">Вера лепит и расписывает фантазийных Жителей вручную. У каждой работы свой путь — от первого эскиза до Свитка, который отправляется к Хранителю.</p></div></section><section class="section section--paper"><div class="shell about-grid"><figure class="about-image"><img src="${image}" alt="Работа Веры над драконом" loading="lazy"></figure><div><p class="eyebrow">Руки и материал</p><h2>Работа начинается не с витрины, а с идеи и формы</h2><p class="lede">Полимерная глина, каркас из фольги и проволоки, ручная обработка, акриловая роспись, защитное покрытие и маленькие детали — путь каждого Жителя зависит от его характера.</p><div class="facts"><div class="fact"><b>От дня до месяца</b><span>в зависимости от сложности и деталей</span></div><div class="fact"><b>Лично</b><span>Вера обсуждает каждую индивидуальную идею</span></div><div class="fact"><b>Бережно</b><span>упаковка и Свиток становятся частью встречи</span></div></div><div class="cluster" style="margin-top:1.8rem"><a class="button button--wine" href="/contact.html">Написать Вере</a><a class="button button--line" href="/process.html">Посмотреть процесс</a></div></div></div></section></main>`;
  document.title = 'О Мастерской — Мастерская Веры';
}

function contact() {
  const resident = byId(content.residents, query('resident'));
  app.innerHTML = `<main id="main"><section class="page-hero"><div class="shell"><p class="eyebrow eyebrow--light">Связь с Мастерской</p><h1>Написать Вере</h1><p class="lede">Можно спросить о готовом Жителе, предложить идею будущего образа или просто рассказать, какая история вам близка.</p></div></section><section class="section section--paper"><div class="shell contact-grid"><div class="contact-card"><p class="eyebrow">Для Хранителей</p><h2>${resident ? `Житель «${esc(resident.shortName || resident.name)}»` : 'Готовые и индивидуальные работы'}</h2><p>${resident ? 'Напишите Вере, чтобы уточнить возможность встречи с этим Жителем или обсудить новый образ по настроению и характеру.' : 'Готовые Жители иногда быстро находят дом. Для индивидуальной работы Вера сначала знакомится с идеей — размер, сроки и стоимость обсуждаются после этого.'}</p><div class="contact-actions"><a class="button button--wine" href="https://t.me/vera120700" target="_blank" rel="noreferrer">Написать в Telegram</a><a class="button button--line" href="https://www.instagram.com/vera.romanycheva.23" target="_blank" rel="noreferrer">Instagram</a></div><div class="contact-details"><a href="/residents.html"><span>01</span>Посмотреть Жителей <b>→</b></a><a href="/process.html"><span>02</span>Как создаётся Житель <b>→</b></a><a href="/create.html"><span>03</span>Собрать идею образа <b>→</b></a></div></div><div class="contact-card"><p class="eyebrow">Сообщение Вере</p><h2>Начнём с вашей идеи</h2><form class="inquiry-form" data-inquiry-form><div class="form-row"><div class="field"><label for="contact-name">Как к вам обращаться</label><input id="contact-name" name="name" required></div><div class="field"><label for="contact-way">Telegram / телефон / e-mail</label><input id="contact-way" name="contact" required></div></div><div class="field"><label for="contact-message">О чём хотите поговорить</label><textarea id="contact-message" name="message" required>${resident ? `Хочу узнать о Жителе «${resident.name}». ` : ''}</textarea></div><button class="button button--wine" type="submit">Отправить сообщение</button><p class="form-message" aria-live="polite" data-form-message></p></form></div></div></section></main>`;
  document.title = 'Связаться с Верой — Мастерская Веры';
  bindInquiryForm();
}

function bindInquiryForm() {
  const form = document.querySelector('[data-inquiry-form]');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = form.querySelector('[data-form-message]');
    const submit = form.querySelector('button[type="submit"]');
    const values = Object.fromEntries(new FormData(form));
    if (values.selection) values.message = `${values.message}\n\n${values.selection}`;
    submit.disabled = true;
    if (isStaticPreview) {
      message.textContent = 'Это версия для просмотра: заявки пока не отправляются. На серверной версии они будут сохраняться в админке.';
      submit.disabled = false;
      return;
    }
    message.textContent = 'Отправляем…';
    try {
      const response = await fetch('/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не удалось отправить сообщение.');
      form.reset();
      message.textContent = 'Сообщение отправлено. Вера увидит его в админке Мастерской.';
      message.classList.add('is-success');
    } catch (error) {
      message.textContent = error.message || 'Не удалось отправить сообщение.';
      message.classList.remove('is-success');
    } finally {
      submit.disabled = false;
    }
  });
}

function bindLightbox() {
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.innerHTML = '<button type="button" aria-label="Закрыть фотографию">×</button><img alt="Увеличенная фотография Жителя">';
  document.body.append(lightbox);
  const close = () => lightbox.classList.remove('is-open');
  lightbox.addEventListener('click', (event) => { if (event.target === lightbox || event.target.matches('button')) close(); });
  document.querySelectorAll('[data-lightbox]').forEach((button) => button.addEventListener('click', () => {
    lightbox.querySelector('img').src = button.dataset.lightbox;
    lightbox.classList.add('is-open');
  }));
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
}

function notFound() {
  app.innerHTML = '<main id="main"><section class="section"><div class="shell"><p class="eyebrow">Страница не найдена</p><h1>Здесь пока нет Хроники</h1><p class="lede">Возможно, Житель ушёл в другой Мир. Вернитесь на главную и попробуйте снова.</p><p style="margin-top:1.5rem"><a class="button button--wine" href="/">На главную</a></p></div></section></main>';
}

async function boot() {
  try {
    const response = await fetch(isStaticPreview ? 'content.json' : '/api/content');
    if (!response.ok) throw new Error('Контент недоступен');
    content = await response.json();
    const active = page === 'collection' || page === 'collections' ? 'collections' : page === 'chronicle' ? 'residents' : page === 'create' ? '' : page;
    setShell(active);
    ({ home, residents, collections, collection: collectionPage, process, create: createResident, chronicle, about, contact }[page] || notFound)();
    rewritePreviewPaths();
  } catch (error) {
    setShell('');
    app.innerHTML = `<main id="main"><section class="section"><div class="shell"><p class="eyebrow">Техническая пауза</p><h1>Мастерская пока не открылась</h1><p class="lede">${esc(error.message)}. Попробуйте обновить страницу чуть позже.</p></div></section></main>`;
    rewritePreviewPaths();
  }
}

boot();

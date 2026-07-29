const root = document.querySelector('#admin-app');
let content;
let activeView = 'overview';
let editor = null;

const esc = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
const find = (items, key) => items.find((item) => item.id === key || item.slug === key);
const statusLabel = (status) => ({ available: 'Готов', 'in-progress': 'В работе', reserved: 'Выбран', archive: 'Архив', new: 'Новая', answered: 'Ответили', archived: 'Архив' }[status] || status);
const date = (value) => value ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '';

async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) } });
  if (response.status === 204) return null;
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Не удалось сохранить изменения.');
  return result;
}

function loginScreen() {
  root.innerHTML = `<main class="admin-login"><section class="login-card"><div class="login-mark">✦</div><p class="login-mark">Мастерская Веры</p><h1>Вход в админку</h1><p>Здесь добавляются Жители, фотографии, Миры, Хроники и сообщения будущих Хранителей.</p><form data-login><label>Пароль<input name="password" type="password" autocomplete="current-password" required></label><button type="submit">Войти</button><p class="login-error" data-login-error aria-live="polite"></p></form></section></main>`;
  root.querySelector('[data-login]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const error = root.querySelector('[data-login-error]');
    error.textContent = 'Проверяем…';
    try {
      await api('/api/auth/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
      await boot();
    } catch (reason) {
      error.textContent = reason.message;
    }
  });
}

function shell() {
  const nav = [['overview', 'Обзор'], ['residents', 'Жители'], ['collections', 'Коллекции'], ['stories', 'Истории'], ['inquiries', 'Заявки'], ['settings', 'Настройки']];
  root.innerHTML = `<div class="admin-shell"><aside class="admin-sidebar"><a class="admin-brand" href="/"><span>✦</span> Мастерская Веры</a><nav class="admin-nav" aria-label="Разделы админки">${nav.map(([key, label]) => `<button type="button" data-nav="${key}" class="${activeView === key ? 'is-active' : ''}">${label}<span>→</span></button>`).join('')}</nav><div class="admin-sidebar__bottom"><a href="/" target="_blank" rel="noreferrer">Открыть сайт ↗</a><button type="button" data-logout>Выйти</button></div></aside><main class="admin-main"><header class="admin-top"><div><p class="admin-chip">Админка Мастерской</p><h1 data-view-title></h1><p data-view-lead></p></div><span class="admin-chip">Данные сохранены на сервере</span></header><section data-view></section></main></div>`;
  root.querySelectorAll('[data-nav]').forEach((button) => button.addEventListener('click', () => { activeView = button.dataset.nav; editor = null; render(); }));
  root.querySelector('[data-logout]').addEventListener('click', async () => { await api('/api/auth/logout', { method: 'POST' }); loginScreen(); });
}

function setViewMeta(title, lead) {
  root.querySelector('[data-view-title]').textContent = title;
  root.querySelector('[data-view-lead]').textContent = lead;
  root.querySelectorAll('[data-nav]').forEach((button) => button.classList.toggle('is-active', button.dataset.nav === activeView));
}

function render() {
  if (!content) return;
  const views = { overview, residents, collections, stories, inquiries, settings };
  (views[activeView] || overview)();
}

function overview() {
  setViewMeta('Добро пожаловать', 'Здесь видно, что происходит в Мастерской прямо сейчас.');
  const available = content.residents.filter((resident) => resident.availability === 'available').length;
  const inProgress = content.residents.filter((resident) => resident.availability === 'in-progress').length;
  const newInquiries = content.inquiries.filter((inquiry) => inquiry.status === 'new').length;
  root.querySelector('[data-view]').innerHTML = `<div class="overview-grid"><article class="metric"><b>${content.residents.length}</b><span>Жителей в Хрониках</span></article><article class="metric"><b>${available}</b><span>Готовы к встрече</span></article><article class="metric"><b>${inProgress}</b><span>Сейчас в работе</span></article><article class="metric"><b>${newInquiries}</b><span>Новых заявок</span></article></div><section class="admin-card"><div class="admin-card__head"><div><h2>Быстрый путь</h2><p>Все действия ведут к публичному сайту автоматически.</p></div><button class="button button--primary" data-new="resident">Добавить Жителя</button></div><div class="admin-list">${content.residents.slice(0, 4).map(residentRow).join('')}</div></section><section class="admin-card"><div class="admin-card__head"><div><h2>Новые сообщения</h2><p>Заявки из формы на сайте.</p></div><button class="button button--line" data-nav-jump="inquiries">Все заявки</button></div>${content.inquiries.length ? content.inquiries.slice(0, 3).map(inquiryRow).join('') : '<p class="admin-empty">Новых сообщений пока нет. Когда путник отправит форму, она появится здесь.</p>'}</section>`;
  bindCommonActions();
}

function residentRow(resident) {
  const collection = find(content.collections, resident.collectionId);
  return `<article class="admin-row"><img src="${esc(resident.heroImage)}" alt=""><div><span class="status status--${esc(resident.availability)}">${statusLabel(resident.availability)}</span><h3>${esc(resident.name)}</h3><p>${esc(collection?.name || 'Коллекция не выбрана')} · ${esc(resident.technique === 'author-series' ? 'Авторская серия' : 'Оригинал ручной лепки')}</p></div><div class="row-actions"><button class="button button--line button--small" data-edit-resident="${esc(resident.id)}">Редактировать</button></div></article>`;
}

function residents() {
  setViewMeta('Жители', 'Добавляйте новые работы, заполняйте Хроники и загружайте фотографии в папку конкретного Жителя.');
  const view = root.querySelector('[data-view]');
  view.innerHTML = `<section class="admin-card"><div class="admin-card__head"><div><h2>Все Жители</h2><p>Публичные карточки и Хроники строятся из этих данных.</p></div><button class="button button--primary" data-new="resident">Добавить Жителя</button></div><div class="admin-list">${content.residents.map(residentRow).join('')}</div></section>${editor?.type === 'resident' ? residentEditor(editor.record) : ''}`;
  bindCommonActions();
  bindResidentForm();
}

function input(name, label, value = '', options = {}) {
  const className = options.full ? 'editor-field editor-field--full' : 'editor-field';
  if (options.type === 'textarea') return `<label class="${className}">${label}<textarea name="${name}" ${options.required ? 'required' : ''}>${esc(value)}</textarea>${options.help ? `<span class="editor-help">${options.help}</span>` : ''}</label>`;
  if (options.type === 'select') return `<label class="${className}">${label}<select name="${name}" ${options.required ? 'required' : ''}>${options.items.map(([key, text]) => `<option value="${esc(key)}" ${key === value ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select>${options.help ? `<span class="editor-help">${options.help}</span>` : ''}</label>`;
  return `<label class="${className}">${label}<input name="${name}" value="${esc(value)}" ${options.required ? 'required' : ''} ${options.placeholder ? `placeholder="${esc(options.placeholder)}"` : ''}>${options.help ? `<span class="editor-help">${options.help}</span>` : ''}</label>`;
}

function residentEditor(resident = {}) {
  const isNew = !resident.id;
  const gallery = Array.isArray(resident.gallery) ? resident.gallery.join('\n') : '';
  const collectionOptions = [['', 'Выберите Мир'], ...content.collections.map((collection) => [collection.id, collection.name])];
  return `<section class="admin-card" data-editor="resident"><div class="admin-card__head"><div><h2>${isNew ? 'Новый Житель' : `Редактирование: ${esc(resident.name)}`}</h2><p>Не указывайте выдуманные размеры или сроки: для индивидуальных работ они согласуются с Хранителем отдельно.</p></div><button class="button button--line" data-cancel>Закрыть</button></div><form class="editor" data-resident-form data-resident-id="${esc(resident.id || '')}"><div class="editor-grid editor-grid--three">${input('name', 'Имя Жителя', resident.name, { required: true })}${input('shortName', 'Короткое имя для карточки', resident.shortName)}${input('slug', 'Адрес страницы', resident.slug, { help: 'Например: forest-dragon. Можно оставить пустым — создастся из имени.' })}${input('collectionId', 'Мир', resident.collectionId, { type: 'select', items: collectionOptions, required: true })}${input('availability', 'Статус', resident.availability || 'archive', { type: 'select', items: [['available', 'Готов и ждёт встречи'], ['in-progress', 'В работе'], ['reserved', 'Уже выбрали'], ['archive', 'Нашёл Хранителя / архив']] })}${input('technique', 'Тип работы', resident.technique || 'one-of-a-kind', { type: 'select', items: [['one-of-a-kind', 'Единственный в своём роде'], ['author-series', 'Авторская серия']] })}</div><div class="editor-grid">${input('type', 'Род / тип', resident.type)}${input('creationDate', 'Дата создания или статус', resident.creationDate, { placeholder: 'Например: Создан вручную' })}${input('character', 'Характер', resident.character, { full: true })}${input('habitat', 'Где обитает', resident.habitat, { full: true })}${input('excerpt', 'Короткое описание для карточки', resident.excerpt, { type: 'textarea', full: true })}${input('story', 'Полная история', resident.story, { type: 'textarea', full: true })}${input('heroImage', 'Обложка: URL фотографии', resident.heroImage, { full: true, required: true, help: 'Загрузите фото ниже — первое изображение можно подставить одной кнопкой.' })}${input('gallery', 'Галерея: по одному URL на строку', gallery, { type: 'textarea', full: true, help: 'Поддерживаются фотографии и видео MP4 / WebM / MOV.' })}</div><div class="editor-grid editor-grid--three">${input('chronicleOrigin', 'Свиток: истоки', resident.chronicle?.origin, { type: 'textarea' })}${input('chronicleCharacter', 'Свиток: характер', resident.chronicle?.character, { type: 'textarea' })}${input('chroniclePath', 'Свиток: путь', resident.chronicle?.path, { type: 'textarea' })}</div><div class="upload-box"><strong>Загрузить фото или видео</strong><p class="editor-help">Файлы попадут в отдельную папку этого Жителя. Для нового Жителя сначала укажите адрес страницы выше, затем выберите материалы.</p><input type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime" multiple data-upload-input><div class="upload-result" data-upload-result></div></div><div class="editor-actions"><button class="button button--primary" type="submit">${isNew ? 'Создать Жителя' : 'Сохранить изменения'}</button>${!isNew ? `<button class="button button--danger" type="button" data-delete-resident="${esc(resident.id)}">Удалить Жителя</button>` : ''}<p class="admin-message" data-editor-message aria-live="polite"></p></div></form></section>`;
}

function getResidentPayload(form) {
  const data = Object.fromEntries(new FormData(form));
  return {
    ...data,
    gallery: (data.gallery || '').split('\n').map((value) => value.trim()).filter(Boolean),
    chronicle: { origin: data.chronicleOrigin, character: data.chronicleCharacter, path: data.chroniclePath }
  };
}

function bindResidentForm() {
  const form = root.querySelector('[data-resident-form]');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = form.querySelector('[data-editor-message]');
    message.textContent = 'Сохраняем…';
    try {
      const key = form.dataset.residentId;
      await api(key ? `/api/residents/${encodeURIComponent(key)}` : '/api/residents', { method: key ? 'PUT' : 'POST', body: JSON.stringify(getResidentPayload(form)) });
      await refresh();
      editor = null;
      residents();
    } catch (error) { message.textContent = error.message; }
  });
  form.querySelector('[data-upload-input]').addEventListener('change', async (event) => {
    const files = event.target.files;
    if (!files.length) return;
    const slug = form.elements.slug.value || form.elements.name.value || 'new-resident';
    const payload = new FormData();
    [...files].forEach((file) => payload.append('files', file));
    const result = form.querySelector('[data-upload-result]');
    result.textContent = 'Загружаем…';
    try {
      const uploaded = await api(`/api/media?folder=residents/${encodeURIComponent(slug)}`, { method: 'POST', body: payload });
      const urls = uploaded.files.map((file) => file.url);
      const firstImage = uploaded.files.find((file) => file.type.startsWith('image/'))?.url;
      if (!form.elements.heroImage.value && firstImage) form.elements.heroImage.value = firstImage;
      form.elements.gallery.value = [...new Set([...(form.elements.gallery.value || '').split('\n').filter(Boolean), ...urls])].join('\n');
      result.innerHTML = uploaded.files.map((file) => file.type.startsWith('image/') ? `<button type="button" data-hero-url="${esc(file.url)}">Сделать обложкой: ${esc(file.url.split('/').pop())}</button>` : `<span class="editor-help">Видео добавлено: ${esc(file.url.split('/').pop())}</span>`).join('');
      result.querySelectorAll('[data-hero-url]').forEach((button) => button.addEventListener('click', () => { form.elements.heroImage.value = button.dataset.heroUrl; }));
    } catch (error) { result.textContent = error.message; }
  });
}

function collections() {
  setViewMeta('Коллекции', 'Миры управляют цветом, атмосферой и подборкой Жителей на публичном сайте.');
  root.querySelector('[data-view]').innerHTML = `<section class="admin-card"><div class="admin-card__head"><div><h2>Миры Мастерской</h2><p>Зимняя, лесная, древняя и сказочная атмосфера задаётся у каждой коллекции отдельно.</p></div><button class="button button--primary" data-new="collection">Добавить Мир</button></div><div class="admin-list">${content.collections.map((collection) => `<article class="admin-row"><img src="${esc(collection.image)}" alt=""><div><span class="status">${esc(collection.theme)}</span><h3>${esc(collection.name)}</h3><p>${esc(collection.description)}</p></div><div class="row-actions"><button class="button button--line button--small" data-edit-collection="${esc(collection.id)}">Редактировать</button></div></article>`).join('')}</div></section>${editor?.type === 'collection' ? collectionEditor(editor.record) : ''}`;
  bindCommonActions();
  bindCollectionForm();
}

function collectionEditor(collection = {}) {
  const isNew = !collection.id;
  return `<section class="admin-card"><div class="admin-card__head"><div><h2>${isNew ? 'Новый Мир' : `Редактирование: ${esc(collection.name)}`}</h2></div><button class="button button--line" data-cancel>Закрыть</button></div><form class="editor" data-collection-form data-collection-id="${esc(collection.id || '')}"><div class="editor-grid editor-grid--three">${input('name', 'Название', collection.name, { required: true })}${input('slug', 'Адрес', collection.slug)}${input('theme', 'Атмосфера', collection.theme || 'dragons', { type: 'select', items: [['winter', 'Зимние легенды — снег'], ['forest', 'Тайны леса — светлячки'], ['dragons', 'Древние существа — туман'], ['russian', 'Русские сказки — орнамент'], ['home', 'Домашние легенды — тёплый свет']] })}</div><div class="editor-grid">${input('title', 'Заголовок Мира', collection.title, { full: true })}${input('description', 'Описание', collection.description, { type: 'textarea', full: true })}${input('image', 'Фоновое изображение (URL)', collection.image, { full: true, required: true })}</div><div class="editor-actions"><button class="button button--primary" type="submit">Сохранить Мир</button>${!isNew ? `<button type="button" class="button button--danger" data-delete-collection="${esc(collection.id)}">Удалить Мир</button>` : ''}<p class="admin-message" data-editor-message></p></div></form></section>`;
}

function bindCollectionForm() {
  const form = root.querySelector('[data-collection-form]');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = form.querySelector('[data-editor-message]');
    try {
      const key = form.dataset.collectionId;
      await api(key ? `/api/collections/${encodeURIComponent(key)}` : '/api/collections', { method: key ? 'PUT' : 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      await refresh(); editor = null; collections();
    } catch (error) { message.textContent = error.message; }
  });
}

function stories() {
  setViewMeta('Истории', 'Тексты Веры и фотографии процесса: они оживляют Мастерскую между карточками Жителей.');
  root.querySelector('[data-view]').innerHTML = `<section class="admin-card"><div class="admin-card__head"><div><h2>Истории Мастерской</h2><p>Можно публиковать процесс, новости, подарочные наборы и слова Веры.</p></div><button class="button button--primary" data-new="story">Добавить историю</button></div><div class="admin-list">${content.stories.map((story) => `<article class="admin-row"><img src="${esc(story.image)}" alt=""><div><span class="status">${story.published ? 'Опубликована' : 'Черновик'}</span><h3>${esc(story.title)}</h3><p>${esc(story.lead)}</p></div><div class="row-actions"><button class="button button--line button--small" data-edit-story="${esc(story.id)}">Редактировать</button></div></article>`).join('')}</div></section>${editor?.type === 'story' ? storyEditor(editor.record) : ''}`;
  bindCommonActions();
  bindStoryForm();
}

function storyEditor(story = {}) {
  const isNew = !story.id;
  return `<section class="admin-card"><div class="admin-card__head"><div><h2>${isNew ? 'Новая история' : `Редактирование: ${esc(story.title)}`}</h2></div><button class="button button--line" data-cancel>Закрыть</button></div><form class="editor" data-story-form data-story-id="${esc(story.id || '')}"><div class="editor-grid">${input('title', 'Заголовок', story.title, { required: true, full: true })}${input('lead', 'Короткое вступление', story.lead, { type: 'textarea', full: true })}${input('body', 'Полный текст', story.body, { type: 'textarea', full: true })}${input('quote', 'Цитата Веры', story.quote, { type: 'textarea', full: true })}${input('image', 'Фотография (URL)', story.image, { full: true })}${input('published', 'Статус', story.published === false ? 'false' : 'true', { type: 'select', items: [['true', 'Опубликовать'], ['false', 'Черновик']] })}</div><div class="editor-actions"><button class="button button--primary" type="submit">Сохранить историю</button>${!isNew ? `<button type="button" class="button button--danger" data-delete-story="${esc(story.id)}">Удалить историю</button>` : ''}<p class="admin-message" data-editor-message></p></div></form></section>`;
}

function bindStoryForm() {
  const form = root.querySelector('[data-story-form]');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = form.querySelector('[data-editor-message]');
    try {
      const payload = Object.fromEntries(new FormData(form));
      payload.published = payload.published === 'true';
      const key = form.dataset.storyId;
      await api(key ? `/api/stories/${encodeURIComponent(key)}` : '/api/stories', { method: key ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      await refresh(); editor = null; stories();
    } catch (error) { message.textContent = error.message; }
  });
}

function inquiryRow(inquiry) {
  return `<article class="inquiry"><span class="status status--${esc(inquiry.status)}">${statusLabel(inquiry.status)}</span><div><h3>${esc(inquiry.name)}</h3><time>${date(inquiry.createdAt)} · ${esc(inquiry.contact)}</time><p>${esc(inquiry.message)}</p></div><select data-inquiry-status="${esc(inquiry.id)}"><option value="new" ${inquiry.status === 'new' ? 'selected' : ''}>Новая</option><option value="in-progress" ${inquiry.status === 'in-progress' ? 'selected' : ''}>В работе</option><option value="answered" ${inquiry.status === 'answered' ? 'selected' : ''}>Ответили</option><option value="archived" ${inquiry.status === 'archived' ? 'selected' : ''}>Архив</option></select></article>`;
}

function inquiries() {
  setViewMeta('Заявки от Хранителей', 'Сообщения с сайта появляются здесь. Контакт и пожелания можно сразу скопировать в Telegram или другой канал связи.');
  root.querySelector('[data-view]').innerHTML = `<section class="admin-card"><div class="admin-card__head"><div><h2>Все сообщения</h2><p>Статус помогает не потерять ни одну идею.</p></div></div>${content.inquiries.length ? content.inquiries.map(inquiryRow).join('') : '<p class="admin-empty">Пока никто не написал. Публичные формы уже работают и будут сохранять сообщения сюда.</p>'}</section>`;
  root.querySelectorAll('[data-inquiry-status]').forEach((select) => select.addEventListener('change', async () => { try { await api(`/api/inquiries/${encodeURIComponent(select.dataset.inquiryStatus)}`, { method: 'PUT', body: JSON.stringify({ status: select.value }) }); await refresh(); inquiries(); } catch (error) { window.alert(error.message); } }));
}

function settings() {
  setViewMeta('Настройки Мастерской', 'Базовые тексты сайта. Пароль и секрет сессии меняются только в файле .env на сервере — так безопаснее.');
  root.querySelector('[data-view]').innerHTML = `<section class="admin-card"><div class="admin-card__head"><div><h2>Тексты бренда</h2><p>Меняются сразу во всех местах, где они используются.</p></div></div><form class="editor" data-settings-form><div class="editor-grid">${input('brand', 'Название Мастерской', content.settings.brand, { required: true })}${input('tagline', 'Главная формула', content.settings.tagline, { full: true })}${input('contactNote', 'Текст для связи', content.settings.contactNote, { type: 'textarea', full: true })}</div><div class="editor-actions"><button class="button button--primary" type="submit">Сохранить настройки</button><p class="admin-message" data-editor-message></p></div></form></section><section class="admin-card"><h2>Как добавлять новые фотографии</h2><p class="editor-help">Откройте «Жители» → «Добавить Жителя», сначала укажите имя и адрес страницы, затем загрузите фото. Они окажутся в папке именно этого Жителя. Для уже созданного Жителя всё работает так же.</p></section>`;
  root.querySelector('[data-settings-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = event.currentTarget.querySelector('[data-editor-message]');
    try { await api('/api/settings', { method: 'PUT', body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) }); await refresh(); message.textContent = 'Сохранено.'; message.classList.add('is-success'); } catch (error) { message.textContent = error.message; }
  });
}

function bindCommonActions() {
  root.querySelectorAll('[data-new]').forEach((button) => button.addEventListener('click', () => { editor = { type: button.dataset.new, record: {} }; render(); }));
  root.querySelectorAll('[data-edit-resident]').forEach((button) => button.addEventListener('click', () => { editor = { type: 'resident', record: find(content.residents, button.dataset.editResident) }; residents(); }));
  root.querySelectorAll('[data-edit-collection]').forEach((button) => button.addEventListener('click', () => { editor = { type: 'collection', record: find(content.collections, button.dataset.editCollection) }; collections(); }));
  root.querySelectorAll('[data-edit-story]').forEach((button) => button.addEventListener('click', () => { editor = { type: 'story', record: find(content.stories, button.dataset.editStory) }; stories(); }));
  root.querySelectorAll('[data-cancel]').forEach((button) => button.addEventListener('click', () => { editor = null; render(); }));
  root.querySelectorAll('[data-nav-jump]').forEach((button) => button.addEventListener('click', () => { activeView = button.dataset.navJump; editor = null; render(); }));
  root.querySelectorAll('[data-delete-resident]').forEach((button) => button.addEventListener('click', async () => { if (!window.confirm('Удалить Жителя из сайта? Фотографии на диске останутся, но запись и Хроника исчезнут.')) return; try { await api(`/api/residents/${encodeURIComponent(button.dataset.deleteResident)}`, { method: 'DELETE' }); await refresh(); editor = null; residents(); } catch (error) { window.alert(error.message); } }));
  root.querySelectorAll('[data-delete-collection]').forEach((button) => button.addEventListener('click', async () => { if (!window.confirm('Удалить Мир? Сначала убедитесь, что в нём нет Жителей.')) return; try { await api(`/api/collections/${encodeURIComponent(button.dataset.deleteCollection)}`, { method: 'DELETE' }); await refresh(); editor = null; collections(); } catch (error) { window.alert(error.message); } }));
  root.querySelectorAll('[data-delete-story]').forEach((button) => button.addEventListener('click', async () => { if (!window.confirm('Удалить историю?')) return; try { await api(`/api/stories/${encodeURIComponent(button.dataset.deleteStory)}`, { method: 'DELETE' }); await refresh(); editor = null; stories(); } catch (error) { window.alert(error.message); } }));
}

async function refresh() {
  content = await api('/api/admin/content');
}

async function boot() {
  try {
    const me = await api('/api/auth/me');
    if (!me.authenticated) return loginScreen();
    await refresh();
    shell();
    render();
  } catch (error) {
    root.innerHTML = `<main class="admin-login"><section class="login-card"><p class="login-mark">Мастерская Веры</p><h1>Не удалось открыть админку</h1><p>${esc(error.message)}</p><a href="/admin">Попробовать снова</a></section></main>`;
  }
}

boot();

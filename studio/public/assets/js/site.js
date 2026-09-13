import { phoneCopy, PHONE_SIZES } from './media.js';

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
  root.querySelectorAll('[href^="/"], [src^="/"], [srcset], [data-lightbox^="/"]').forEach((element) => {
    ['href', 'src', 'data-lightbox'].forEach((attribute) => {
      const value = element.getAttribute(attribute);
      if (value?.startsWith('/') && !value.startsWith('//')) {
        element.setAttribute(attribute, `${staticBasePath}${value}`);
      }
    });
    // srcset holds its own copies of the same paths — miss these and the
    // preview serves 404s to exactly the phones the small files were for.
    const set = element.getAttribute('srcset');
    if (!set) return;
    element.setAttribute('srcset', set.split(',').map((candidate) => {
      const trimmed = candidate.trim();
      return trimmed.startsWith('/') && !trimmed.startsWith('//')
        ? `${staticBasePath}${trimmed}`
        : trimmed;
    }).join(', '));
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
  if (!(price > 0)) return 'Цена по запросу';
  const note = resident?.priceNote?.trim();
  return note ? `${price.toLocaleString('ru-RU')} ₽ ${note}` : `${price.toLocaleString('ru-RU')} ₽`;
}

// "Готово: 4" — how many finished copies are on the shelf right now. Only
// worth saying for a one-of-a-kind piece that already has some ready; a
// resident still being sculpted, or one with no count entered, says nothing.
function stockLabel(resident) {
  const stock = Number(resident?.stock);
  if (resident?.availability !== 'available' || !(stock > 0)) return '';
  return `Готово: ${stock}`;
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

/* ---------------------------------------------------------------------------
   World air — a canvas ambience engine.

   One canvas per layer instead of dozens of animated DOM nodes: it draws real
   glow (shadowBlur), gives every particle its own behaviour, and crossfades
   when the reader moves between worlds. It idles at zero cost whenever the tab
   is hidden or the layer is scrolled out of view.
--------------------------------------------------------------------------- */

/* Phones should not download desktop photos.

   This bolts the srcset on after the markup is built, so every template below
   stays a plain <img src="...">  and nothing has to be threaded through by
   hand. Photos with no small copy are left exactly as they were. */
function responsive(html) {
  return html.replace(/<img\b[^>]*>/g, (tag) => {
    if (tag.includes('srcset=')) return tag;
    const src = /\ssrc="([^"]+)"/.exec(tag)?.[1];
    const small = phoneCopy(src);
    if (!small) return tag;
    return tag.replace(
      /\ssrc="/,
      ` srcset="${small} 800w, ${src} 1400w" sizes="${PHONE_SIZES}" src="`
    );
  });
}

// Every page paints through here, so the srcset rewrite applies everywhere.
function paint(target, html) {
  target.innerHTML = responsive(html);
}

const WORLD_AIR = {
  winter: {
    kind: 'snow',
    colors: ['#ffffff', '#dbeafe', '#bfdbfe'],
    count: 46,
    glow: 0
  },
  forest: {
    kind: 'firefly',
    colors: ['#f6efa4', '#d9f08a', '#fff3b0'],
    count: 26,
    glow: 12
  },
  dragons: {
    kind: 'ember',
    colors: ['#f0a462', '#e2762f', '#ffd8a8'],
    count: 30,
    glow: 10
  },
  russian: {
    kind: 'ember',
    colors: ['#ffcf87', '#e2963c', '#fff0c9'],
    count: 26,
    glow: 9
  },
  home: {
    kind: 'dust',
    colors: ['#ffe6b0', '#f7dcae', '#fff6e3'],
    count: 30,
    glow: 4
  }
};

function airConfig(theme) {
  return WORLD_AIR[theme] || WORLD_AIR.dragons;
}

/* Glow, cheaply.

   Drawing every particle with shadowBlur makes the browser blur each dot on
   every frame — the single most expensive thing canvas 2D can do, and on a
   mid-range phone it drops the page to a few frames a second. Instead each
   colour gets one small sprite, painted once, and every particle is a scaled
   copy of it. Same look, one drawImage per dot. */

const SPRITE_PX = 48;
const spriteCache = new Map();
// Typical radius per particle kind — sets how much of the sprite is solid core
// versus falloff, so the glow reads the same as the old shadowBlur did.
const AVG_RADIUS = { snow: 2.2, ember: 1.75, firefly: 2.05, dust: 1.45 };

function rgba(hex, alpha) {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const value = parseInt(full, 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function airSprite(color, core) {
  const key = `${color}|${core.toFixed(2)}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const sprite = document.createElement('canvas');
  sprite.width = SPRITE_PX;
  sprite.height = SPRITE_PX;
  const pen = sprite.getContext('2d');
  const mid = SPRITE_PX / 2;
  const gradient = pen.createRadialGradient(mid, mid, 0, mid, mid, mid);
  gradient.addColorStop(0, rgba(color, 1));
  gradient.addColorStop(Math.min(.94, core), rgba(color, core > .7 ? .96 : .55));
  gradient.addColorStop(1, rgba(color, 0));
  pen.fillStyle = gradient;
  pen.fillRect(0, 0, SPRITE_PX, SPRITE_PX);
  spriteCache.set(key, sprite);
  return sprite;
}

/* Only a couple of layers may animate at once.

   The home page stacks a full-page backdrop plus one canvas per world card, so
   a long scroll can leave five of them on screen together. Each is cheap now,
   but five is still five: the busiest two run, the rest hold a still frame. */

const AIR_MAX_LIVE = 2;
const airLayers = new Set();

function airRebalance() {
  const wanted = [...airLayers].filter((layer) => layer.wants());
  wanted.sort((a, b) => b.ratio - a.ratio);
  wanted.forEach((layer, index) => layer.apply(index < AIR_MAX_LIVE));
  airLayers.forEach((layer) => { if (!wanted.includes(layer)) layer.apply(false); });
}

// Spawn one particle. `fresh` seeds a particle mid-flight on first fill, so the
// scene starts already populated instead of raining in from the top edge.
function spawnParticle(config, width, height, fresh) {
  const rand = Math.random;
  const pick = config.colors[Math.floor(rand() * config.colors.length)];
  const base = {
    color: pick,
    phase: rand() * Math.PI * 2,
    life: 0,
    fade: 1
  };

  if (config.kind === 'snow') {
    return {
      ...base,
      x: rand() * width,
      y: fresh ? rand() * height : -20,
      r: 1 + rand() * 2.4,
      vy: 14 + rand() * 26,
      sway: 10 + rand() * 34,
      swaySpeed: .3 + rand() * .7,
      alpha: .35 + rand() * .5
    };
  }

  if (config.kind === 'ember') {
    return {
      ...base,
      x: rand() * width,
      y: fresh ? rand() * height : height + 20,
      r: .8 + rand() * 1.9,
      vy: -(16 + rand() * 30),
      sway: 8 + rand() * 26,
      swaySpeed: .4 + rand() * .9,
      alpha: .45 + rand() * .5
    };
  }

  if (config.kind === 'firefly') {
    return {
      ...base,
      x: rand() * width,
      y: rand() * height,
      r: 1.1 + rand() * 1.9,
      vx: (rand() - .5) * 16,
      vy: (rand() - .5) * 14,
      turn: (rand() - .5) * .5,
      alpha: .25 + rand() * .5,
      pulse: .6 + rand() * 1.4
    };
  }

  // dust — drifts slowly upward on a warm current
  return {
    ...base,
    x: rand() * width,
    y: rand() * height,
    r: .7 + rand() * 1.5,
    vx: (rand() - .5) * 7,
    vy: -(3 + rand() * 9),
    sway: 6 + rand() * 16,
    swaySpeed: .2 + rand() * .4,
    alpha: .2 + rand() * .4
  };
}

function stepParticle(p, config, width, height, dt, time) {
  if (config.kind === 'firefly') {
    // Wander: nudge the heading continuously so no two trace the same arc.
    p.vx += Math.cos(time * p.turn + p.phase) * 9 * dt;
    p.vy += Math.sin(time * p.turn * 1.3 + p.phase) * 8 * dt;
    p.vx = Math.max(-22, Math.min(22, p.vx));
    p.vy = Math.max(-20, Math.min(20, p.vy));
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.fade = .45 + .55 * (Math.sin(time * p.pulse + p.phase) * .5 + .5);
  } else if (config.kind === 'snow' || config.kind === 'ember') {
    p.y += p.vy * dt;
    p.x += Math.sin(time * p.swaySpeed + p.phase) * p.sway * dt;
    // Embers cool as they climb.
    p.fade = config.kind === 'ember'
      ? Math.max(0, Math.min(1, p.y / height))
      : 1;
  } else {
    p.x += (p.vx + Math.sin(time * p.swaySpeed + p.phase) * p.sway) * dt;
    p.y += p.vy * dt;
    p.fade = .5 + .5 * (Math.sin(time * .6 + p.phase) * .5 + .5);
  }

  // Wrap horizontally, respawn once a particle leaves through its exit edge.
  if (p.x < -30) p.x = width + 30;
  if (p.x > width + 30) p.x = -30;
  const gone = config.kind === 'snow'
    ? p.y > height + 30
    : config.kind === 'ember'
      ? p.y < -30
      : p.y < -40 || p.y > height + 40;
  return !gone;
}

// Starts the ambience on a canvas and returns a handle: setTheme() crossfades
// to another world, destroy() releases everything.
function startWorldAir(canvas, theme, options = {}) {
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return { setTheme() {}, destroy() {} };

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scale = options.scale || 1;
  let config = airConfig(theme);
  let particles = [];
  let sprites = new Map();
  let spread = 0;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let frame = 0;
  let last = 0;
  let visible = true;
  let onScreen = true;
  let allowed = false;   // granted a slot by the layer budget
  let booted = false;    // held back until the page has finished its first paint
  let density = 1;       // trimmed down if the device turns out to be slow
  let samples = 0;
  let elapsed = 0;
  // Crossfade state: the outgoing world dims out while the new one fades in.
  let blend = 1;

  // Ambient drift needs no more than this; the saved frames go to scrolling.
  const FRAME_MS = 1000 / 36;

  const targetCount = () => {
    // Fewer particles on a phone — same read, far less GPU.
    const narrow = width < 720;
    const capped = Math.min(50, Math.round(config.count * scale * density));
    return Math.max(4, narrow ? Math.round(capped * .55) : capped);
  };

  function buildSprites() {
    const avg = AVG_RADIUS[config.kind] || 2;
    const core = config.glow ? Math.max(.16, avg / (avg + config.glow)) : .78;
    spread = config.glow / avg;
    sprites = new Map(config.colors.map((color) => [color, airSprite(color, core)]));
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    // Soft blobs gain nothing from a full retina buffer, and it costs four
    // times the pixels to paint on a phone.
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function fill(fresh) {
    const want = targetCount();
    while (particles.length < want) particles.push(spawnParticle(config, width, height, fresh));
    if (particles.length > want) particles.length = want;
  }

  function draw(time, dt) {
    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = 'lighter';
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const p = particles[index];
      const alive = stepParticle(p, config, width, height, dt, time);
      if (!alive) {
        particles[index] = spawnParticle(config, width, height, false);
        continue;
      }
      const sprite = sprites.get(p.color);
      if (!sprite) continue;
      const extent = p.r * (1 + spread);
      context.globalAlpha = Math.max(0, p.alpha * p.fade * blend);
      context.drawImage(sprite, p.x - extent, p.y - extent, extent * 2, extent * 2);
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
  }

  // If the device cannot keep up, thin the air out rather than stutter. Two
  // strikes and the layer settles into a still frame for good.
  function watchBudget(gap) {
    elapsed += gap;
    samples += 1;
    if (samples < 90) return;
    const average = elapsed / samples;
    samples = 0;
    elapsed = 0;
    if (average < 44) return;
    if (density > .5) { density = .5; fill(false); return; }
    if (density > .25) { density = .25; fill(false); return; }
    pause();
    booted = false; // stop asking for a slot; the still frame stays on screen
    airRebalance();
  }

  function loop(now) {
    frame = requestAnimationFrame(loop);
    if (!last) last = now;
    const gap = now - last;
    if (gap < FRAME_MS) return;
    last = now;
    // Clamp dt so a backgrounded tab doesn't teleport every particle on return.
    const dt = Math.min(.05, gap / 1000);
    if (blend < 1) blend = Math.min(1, blend + dt * 1.6);
    draw(now / 1000, dt);
    watchBudget(gap);
  }

  function play() {
    if (frame) return;
    last = 0;
    frame = requestAnimationFrame(loop);
  }

  function pause() {
    if (!frame) return;
    cancelAnimationFrame(frame);
    frame = 0;
  }

  const wants = () => booted && visible && onScreen && !reduced.matches;

  const layer = {
    ratio: 0,
    wants,
    apply(grant) {
      allowed = grant;
      if (grant && wants()) play();
      else pause();
    }
  };
  airLayers.add(layer);

  const sync = () => airRebalance();

  const onVisibility = () => { visible = !document.hidden; sync(); };
  const onResize = () => { resize(); fill(true); };

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', onResize, { passive: true });
  reduced.addEventListener?.('change', sync);

  // Idle whenever the layer isn't on screen.
  let observer = null;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      onScreen = entry.isIntersecting;
      layer.ratio = entry.intersectionRatio;
      sync();
    }, { threshold: [0, .25, .6] });
    observer.observe(canvas);
  }

  resize();
  buildSprites();
  fill(true);
  draw(0, 0); // a still frame straight away, so the layer is never blank

  // Hold the animation back until the browser has drawn the page and gone
  // quiet. Nothing in the ambience is worth a slower first screen.
  let bootTimer = 0;
  const boot = () => { booted = true; sync(); };
  if (!reduced.matches) {
    if ('requestIdleCallback' in window) requestIdleCallback(boot, { timeout: 1500 });
    else bootTimer = setTimeout(boot, 600);
  }

  return {
    setTheme(next) {
      if (!next || next === theme) return;
      theme = next;
      config = airConfig(next);
      buildSprites();
      particles = [];
      blend = 0;
      fill(true);
      if (!allowed || !wants()) draw(0, 0);
      sync();
    },
    destroy() {
      pause();
      clearTimeout(bootTimer);
      airLayers.delete(layer);
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
      reduced.removeEventListener?.('change', sync);
      airRebalance();
    }
  };
}

// Tracks the live ambience so a page can retheme it without rebuilding.
let liveAir = null;

function mountWorldAir(theme) {
  liveAir?.destroy();
  document.querySelector('.world-air')?.remove();
  document.body.insertAdjacentHTML('afterbegin', worldAtmosphere(theme));
  const canvas = document.querySelector('.world-air__canvas');
  liveAir = canvas ? startWorldAir(canvas, theme) : null;
  return liveAir;
}

// Swaps the page-wide world theme with a colour crossfade on the wash and
// ornament, used when scrolling through the world atlas.
function setWorldTheme(theme) {
  const air = document.querySelector('.world-air');
  if (!air) return;
  air.className = `world-air world-air--${theme}`;
  const ornament = air.querySelector('.world-air__ornament');
  if (ornament) ornament.innerHTML = worldOrnament(theme);
  liveAir?.setTheme(theme);
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

// A sparse copy laid over a single scene photo, so the air reads as part of the
// picture. It sits under the text panels, never across them — particles behind
// type is what makes copy hard to read.
function atmosphereMarkup(theme) {
  return `<div class="atmosphere atmosphere--${esc(theme)}" aria-hidden="true"><canvas class="atmosphere__canvas" data-air-scene="${esc(theme)}"></canvas></div>`;
}

// Boots every scene-local canvas on the page (hero photos, world stages).
const sceneAir = [];
function mountSceneAir() {
  while (sceneAir.length) sceneAir.pop().destroy();
  document.querySelectorAll('[data-air-scene]').forEach((canvas) => {
    sceneAir.push(startWorldAir(canvas, canvas.dataset.airScene, { scale: .5 }));
  });
}

// The full-page ambience: this is what makes a world feel like a place you
// walked into rather than a page you opened.
function worldAtmosphere(theme) {
  return `<div class="world-air world-air--${esc(theme)}" aria-hidden="true">
    <div class="world-air__wash"></div>
    <div class="world-air__ornament">${worldOrnament(theme)}</div>
    <canvas class="world-air__canvas"></canvas>
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

  // Логотип ведёт на главную, поэтому отдельного пункта «Главная» в шапке
  // нет — он появлялся только на внутренних страницах и ломал единство.
  const shellNav = nav.filter(([id]) => id !== 'home');

  {
    header.innerHTML = `<a class="skip-link" href="#main">Перейти к содержанию</a>
      <div class="site-header home-site-header"><div class="header-inner">
        <a class="brand" href="/" aria-label="Мастерская Веры — главная">
          <img class="brand__logo" src="/media/brand/logo-mark.webp" alt="" width="96" height="96">
          <span class="brand__name">Мастерская <br>Веры</span>
        </a>
        <nav class="main-nav" id="main-nav" aria-label="Основная навигация">
          ${shellNav.map(([id, href, label]) => `<a class="${id === active ? 'is-active' : ''}"${id === active ? ' aria-current="page"' : ''} href="${href}">${label}</a>`).join('')}
        </nav>
        <div class="header-actions">
          <a class="button button--forest button--compact header-cta" href="/residents.html">Смотреть работы</a>
          <button class="menu-toggle" type="button" aria-controls="main-nav" aria-expanded="false" data-menu-toggle>
            <span></span><span></span><span></span><span class="sr-only">Открыть меню</span>
          </button>
        </div>
      </div></div>`;

    footer.innerHTML = `<footer class="site-footer home-site-footer">
      <div class="home-ornament home-ornament--footer-left" aria-hidden="true">${worldOrnament('forest')}</div>
      <div class="home-ornament home-ornament--footer-right" aria-hidden="true">${worldOrnament('forest')}</div>
      <div class="shell">
        <div class="home-footer-grid">
          <div class="home-footer-brand">
            <a class="brand" href="/">
              <img class="brand__logo" src="/media/brand/logo-mark.webp" alt="" width="96" height="96">
              <span class="brand__name">Мастерская <br>Веры</span>
            </a>
            <p>Авторские фигурки ручной работы. Каждый Житель — в единственном экземпляре.</p>
          </div>
          <nav class="home-footer-nav" aria-label="Навигация в подвале">
            <p class="home-footer-heading">Разделы</p>
            <a href="/residents.html">Жители</a>
            <a href="/collections.html">Миры</a>
            <a href="/process.html">Как создаются</a>
            <a href="/about.html">О мастерской</a>
            <a href="/contact.html">Контакты</a>
          </nav>
          <div class="home-footer-contact">
            <p class="home-footer-heading">Связь</p>
            <span>Telegram-канал</span>
            <a class="home-footer-handle" href="https://t.me/masterskayaver" target="_blank" rel="noreferrer">t.me/masterskayaver</a>
            <a class="button button--gold-outline" href="https://t.me/vera120700" target="_blank" rel="noreferrer">Написать Вере</a>
          </div>
        </div>
        <div class="home-footer-bottom">© Мастерская Веры</div>
      </div>
    </footer><button class="scroll-top" type="button" data-scroll-top aria-label="Наверх">↑</button>`;
  }

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
      <div class="resident-card__meta"><span class="status ${className}">${label}</span>${['available', 'in-progress'].includes(resident.availability) ? `<span class="price">${priceLabel(resident)}</span>` : ''}${stockLabel(resident) ? `<span class="stock">${esc(stockLabel(resident))}</span>` : ''}</div>
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
  const free = residentsInWorld.filter((resident) => resident.availability === 'available').length;
  const traits = WORLD_TRAITS[collection.theme] || {};
  const stageResident = residentsInWorld.find((resident) => resident.sceneImage) || residentsInWorld[0];
  return `<article class="world-chapter theme-${esc(collection.theme)}" data-world="${esc(collection.theme)}" data-reveal>
    <img class="world-chapter__scene" src="${esc(stageResident?.sceneImage || collection.sceneImage || collection.image)}" alt="" loading="lazy">
    <div class="world-chapter__shade"></div>
    ${atmosphereMarkup(collection.theme)}
    <a class="world-chapter__link" href="/collection.html?world=${encodeURIComponent(collection.slug)}" aria-label="Открыть мир «${esc(collection.name)}»"></a>
    <div class="world-chapter__copy">
      <span class="world-chapter__number">0${index + 1}</span>
      <p class="eyebrow eyebrow--light">Мир Мастерской</p>
      <h3>${esc(collection.name)}</h3>
      <p>${esc(collection.description)}</p>
      ${traits.gift ? `<span class="world-chapter__gift"><i aria-hidden="true"></i>${esc(traits.gift)}</span>` : ''}
      <span class="world-chapter__count">${count} ${pluralResidents(count)}${free ? ` · ${free} свободны` : ''}</span>
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
    // Anything already at or above the fold shows straight away, and without
    // the transition: it is the first screen, so fading it in only delays the
    // moment the page counts as painted.
    if (element.getBoundingClientRect().top < window.innerHeight) element.classList.add('is-visible', 'is-instant');
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

const HOME_WORLD_COPY = {
  winter: ['Зимние легенды', 'Там, где живёт волшебство зимних вечеров', '/media/scenes/nutcracker-ernst.webp', '52% center'],
  forest: ['Тайны древнего леса', 'Среди корней и мха рождаются свои истории', '/media/scenes/forest-dragon.webp', '72% center'],
  dragons: ['Древние существа', 'Те, кто помнит забытые времена', '/media/scenes/azimondias.webp', '66% center'],
  russian: ['Русские сказки', 'Любимые герои в новом воплощении', '/media/scenes/little-humpbacked-horse.webp', '70% center'],
  home: ['Домашние легенды', 'Истории, которые живут рядом', '/media/scenes/rocking-horse.webp', '66% center']
};

function homeWorldCard(collection, index) {
  const [title, description, image, focus = 'center'] = HOME_WORLD_COPY[collection.theme] || [collection.name, collection.description, collection.sceneImage || collection.image];
  const traits = WORLD_TRAITS[collection.theme] || {};
  const inWorld = content.residents.filter((resident) => resident.collectionId === collection.id);
  const free = inWorld.filter((resident) => resident.availability === 'available').length;
  // Счётчик берём из данных: он же показывает, что Мир живой и наполняется.
  const tally = [
    inWorld.length ? `${inWorld.length} ${pluralResidents(inWorld.length)}` : '',
    free ? `${free} свободны` : ''
  ].filter(Boolean).join(' · ');
  return `<article class="home-world-card theme-${esc(collection.theme)}" data-home-world-card>
    <a href="/collection.html?world=${encodeURIComponent(collection.slug)}" aria-label="Открыть мир «${esc(title)}»">
      <span class="home-world-card__frame">
        <img src="${esc(image)}" alt="${esc(title)}" fetchpriority="low" style="--home-world-focus: ${esc(focus)}">
        ${tally ? `<span class="home-world-card__tally">${esc(tally)}</span>` : ''}
      </span>
      <span class="home-world-card__copy">
        <b>${esc(title)}</b>
        <small>${esc(description)}</small>
        ${traits.lives ? `<span class="home-world-card__lives"><i aria-hidden="true"></i>${esc(traits.lives)}</span>` : ''}
        ${traits.gift ? `<span class="home-world-card__gift">${esc(traits.gift)}</span>` : ''}
        <span class="home-world-card__enter">Войти в мир <b aria-hidden="true">→</b></span>
      </span>
    </a>
  </article>`;
}

function pluralResidents(count) {
  const tail = count % 100;
  if (tail > 10 && tail < 20) return 'Жителей';
  const last = count % 10;
  if (last === 1) return 'Житель';
  if (last > 1 && last < 5) return 'Жителя';
  return 'Жителей';
}

// Иконки-гравюры: тонкая линия с проработанной деталью, а не пиктограмма
// из набора. Двойная толщина линии (основной контур 1.4, детали .9) даёт
// им вид гравировки на золоте, под стать остальной странице.
// Вопросы, которые Вере задают до покупки. Ответы — по её реальным
// условиям (см. раздел «Доставка и оплата» на странице контактов).
const HOME_FAQ = [
  ['Сколько стоит фигурка?',
   'Цена зависит от размера и сложности: от полутора тысяч за небольшую работу. У готовых Жителей цена указана в карточке, по остальным Вера называет её при обсуждении.'],
  ['Сколько ждать новую работу?',
   'Сроки всегда индивидуальные — от пары недель до нескольких месяцев. Вера назовёт свои сроки сразу, когда поймёт, о ком идёт речь, и покажет работу по ходу.'],
  ['Можно повторить фигурку, которую уже забрали?',
   'В точности — нет, и в этом её ценность: каждая лепится вручную, без форм. Но можно сделать нового Жителя в том же характере, и он будет только ваш.'],
  ['Как доставляете?',
   'По России и, по возможности, по всему миру. Доставка за счёт покупателя, стоимость и сроки считаем под ваш адрес. Упаковываем так, чтобы работа доехала целой.'],
  ['Как оплатить?',
   'Переводом, наличными при личной встрече или сделкой на Авито — как вам удобнее. Обсуждается там же, в переписке.']
];

function homeFaqItem([question, answer], index) {
  return `<details class="home-faq__item"${index === 0 ? ' open' : ''}>
    <summary><span>${esc(question)}</span><i aria-hidden="true"></i></summary>
    <div class="home-faq__answer"><p>${esc(answer)}</p></div>
  </details>`;
}

function homeFeatureIcon(type) {
  if (type === 'hand') {
    // Отпечаток пальца: и «сделано руками», и «второго такого нет».
    // Руку линией в этом размере не прочесть, а папиллярный узор — да.
    return `<svg viewBox="0 0 44 44" aria-hidden="true">
      <g class="icon-main">
        <path d="M22 7.4c-7.2 0-13.1 5.9-13.1 13.2v5.9"/>
        <path d="M35.1 20.6v6.8c0 2.6-.5 5.2-1.5 7.6"/>
        <path d="M15.2 32.9a13 13 0 0 1-1.6-6.3v-5.9c0-4.6 3.8-8.4 8.4-8.4s8.4 3.8 8.4 8.4v6.8c0 2.2-.4 4.4-1.2 6.5"/>
        <path d="M22 18.2c-1.3 0-2.4 1.1-2.4 2.4v6.4c0 2.4-.5 4.7-1.5 6.9"/>
        <path d="M24.4 20.6v6.8c0 2.4-.3 4.8-1 7.1"/>
      </g>
      <g class="icon-detail">
        <path d="M11.4 14.6a13.2 13.2 0 0 1 6.2-5.5M32.6 14.6a13.2 13.2 0 0 0-6.2-5.5"/>
      </g>
    </svg>`;
  }
  if (type === 'palette') {
    // Палитра с красками и кистью поверх неё.
    return `<svg viewBox="0 0 44 44" aria-hidden="true">
      <g class="icon-main">
        <path d="M21.6 5.5c-8.6 0-15.6 6.6-15.6 14.8 0 8.2 7 14.8 15.6 14.8 1.7 0 2.9-1.3 2.9-2.8 0-.8-.3-1.4-.8-1.9-.5-.5-.8-1.2-.8-1.9 0-1.6 1.3-2.8 2.9-2.8h3.4c5.3 0 9.6-4.1 9.6-9.2 0-6.6-7.7-11-17.2-11Z"/>
        <path d="m30.6 26.8 6.6 9.1a2.6 2.6 0 0 1-4.2 3l-6.1-9.4"/>
      </g>
      <g class="icon-detail">
        <circle cx="13.4" cy="15.4" r="1.5"/>
        <circle cx="19.6" cy="11.2" r="1.5"/>
        <circle cx="27" cy="12.4" r="1.5"/>
        <circle cx="12.2" cy="23.4" r="1.5"/>
      </g>
    </svg>`;
  }
  // Гранёный камень с бликом — единственный экземпляр.
  return `<svg viewBox="0 0 44 44" aria-hidden="true">
    <g class="icon-main">
      <path d="M13.1 7h17.8l7.1 9.6L22 38.4 6 16.6 13.1 7Z"/>
      <path d="M6 16.6h32"/>
      <path d="m13.1 7 3.6 9.6L22 38.4l5.3-21.8L30.9 7"/>
    </g>
    <g class="icon-detail">
      <path d="m16.7 16.6 5.3-9.6 5.3 9.6"/>
      <path d="M33.6 21.6c.9 1 1.4 2.3 1.4 3.6M9.4 11.6c.6-.8 1.4-1.4 2.3-1.8"/>
    </g>
  </svg>`;
}

function homeResidentCard(resident) {
  if (!resident) return '';
  const [statusText, statusClass] = statusCopy(resident.availability);
  const stock = stockLabel(resident);
  return `<article class="home-resident-card" data-home-resident data-availability="${esc(resident.availability)}">

    <a class="home-resident-card__image" href="/chronicle.html?resident=${encodeURIComponent(resident.slug)}">
      <img src="${esc(resident.sceneImage || resident.heroImage)}" alt="${esc(resident.shortName || resident.name)} в своём мире" loading="lazy">
    </a>
    <div class="home-resident-card__copy">
      <span class="status ${esc(statusClass)} home-resident-card__status">${esc(statusText)}</span>
      <p class="home-resident-card__world">${esc(collectionFor(resident).name)}</p>
      <h3>${esc(resident.shortName || resident.name)}</h3>
      ${resident.excerpt ? `<p class="home-resident-card__note">${esc(resident.excerpt)}</p>` : ''}
      <p class="home-resident-card__price">${esc(priceLabel(resident))}${stock ? ` <span>· ${esc(stock)}</span>` : ''}</p>
    </div>
    <a class="home-card-arrow" href="/chronicle.html?resident=${encodeURIComponent(resident.slug)}" aria-label="Открыть Хронику: ${esc(resident.shortName || resident.name)}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>
    </a>
  </article>`;
}

// На широком экране витрина — горизонтальная галерея, там влезают все.
// На телефоне карточки идут в столбик, и двенадцать подряд превращают
// главную в каталог — поэтому сначала показываем шесть.
const HOME_RESIDENT_PHONE_LIMIT = 6;

// Чипы над витриной прячут карточки на месте, без перерисовки и без похода
// на сервер — на главной их дюжина.
function bindHomeResidentFilters() {
  const chips = [...document.querySelectorAll('[data-home-resident-filter]')];
  const cards = [...document.querySelectorAll('[data-home-resident]')];
  if (!chips.length || !cards.length) return;
  const empty = document.querySelector('[data-home-resident-empty]');
  const more = document.querySelector('[data-home-resident-more]');
  const phone = window.matchMedia('(max-width: 50rem)');
  let filter = 'all';
  let expanded = false;

  const apply = () => {
    const limit = phone.matches && !expanded ? HOME_RESIDENT_PHONE_LIMIT : Infinity;
    let matched = 0;
    cards.forEach((card) => {
      const fits = filter === 'all' || card.dataset.availability === filter;
      if (fits) matched += 1;
      card.hidden = !fits || matched > limit;
    });
    if (empty) empty.hidden = matched > 0;
    if (more) {
      const rest = matched - limit;
      more.hidden = !(rest > 0);
      more.textContent = `Показать ещё ${rest > 0 ? rest : ''}`.trim();
    }
  };

  chips.forEach((chip) => chip.addEventListener('click', () => {
    filter = chip.dataset.homeResidentFilter;
    expanded = false;
    chips.forEach((item) => item.setAttribute('aria-pressed', String(item === chip)));
    apply();
  }));
  more?.addEventListener('click', () => { expanded = true; apply(); });
  phone.addEventListener('change', apply);
  apply();
}

// Блоки проявляются по мере прокрутки. Элементы внутри одного блока идут
// с небольшой задержкой друг за другом — карточки «разбираются» слева
// направо, а не всплывают разом. Первый экран не анимируем: он уже виден,
// когда скрипт отработал, и мигание там читалось бы как подтормаживание.
// Главная пользуется общим механизмом появления ([data-reveal] в site.css):
// здесь только расставляем метки и задержку, чтобы элементы внутри блока
// проявлялись друг за другом, а не всплывали разом.
function markHomeReveal() {
  const groups = [
    ['.home-v2-workshop__copy > *', 70],
    ['.home-process-print', 110],
    ['.home-feature', 90],
    ['.home-v2-worlds .home-v2-section-head > *', 70],
    ['.home-world-card', 85],
    ['.home-v2-residents .home-v2-section-head > *', 70],
    ['.home-resident-bar > *', 80],
    ['.home-resident-card', 55],
    ['.home-v2-chronicles .home-v2-section-head > *', 70],
    ['.home-chronicle', 80],
    ['.home-chronicle-story', 90],
    ['.home-v2-section-head--steps > *', 80],
    ['.home-step', 95],
    ['.home-steps-actions > *', 80],
    ['.home-v2-faq .home-v2-section-head > *', 70],
    ['.home-faq__item', 70],
    ['.home-v2-cta__copy > *', 90],
    ['.home-footer-grid > *', 80]
  ];
  groups.forEach(([selector, step]) => {
    [...document.querySelectorAll(selector)].forEach((element, index) => {
      element.setAttribute('data-reveal', '');
      element.style.setProperty('--reveal-delay', `${Math.min(index, 7) * step}ms`);
    });
  });
}

// Карусель едет сама, пока читатель её не трогает. После любого касания —
// пауза, чтобы лента не уезжала из-под пальца; через полминуты ход
// возобновляется. На широком экране все Миры и так лежат рядом, там ход не
// нужен, как и при отключённой анимации в системе.
const HOME_WORLD_STEP_MS = 5000;
const HOME_WORLD_RESUME_MS = 30000;

function bindHomeWorldCarousel() {
  const track = document.querySelector('[data-home-world-track]');
  if (!track) return;
  const cards = [...track.querySelectorAll('[data-home-world-card]')];
  const dots = [...document.querySelectorAll('[data-home-world-dot]')];
  let current = 0;

  const paint = () => {
    cards.forEach((card, index) => card.classList.toggle('is-current', index === current));
    dots.forEach((dot, index) => {
      dot.classList.toggle('is-active', index === current);
      dot.setAttribute('aria-current', index === current ? 'true' : 'false');
    });
  };
  const show = (next) => {
    current = (next + cards.length) % cards.length;
    // Двигаем саму ленту, а не страницу: scrollIntoView тащил к карусели
    // весь документ, и читателя выдёргивало сюда с любого места главной.
    const card = cards[current];
    track.scrollTo({
      left: card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2,
      behavior: 'smooth'
    });
    paint();
  };
  paint();

  // Лента едет там, где её есть куда листать — теперь это все размеры,
  // включая широкий экран: карточки Миров стали втрое крупнее и в ряд
  // помещаются три из пяти.
  const slidable = () => track.scrollWidth - track.clientWidth > 8;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  let stepTimer = 0;
  let resumeTimer = 0;
  const stop = () => { window.clearInterval(stepTimer); stepTimer = 0; };
  const play = () => {
    stop();
    if (!slidable() || calm.matches) return;
    stepTimer = window.setInterval(() => {
      if (document.hidden) return;
      show(current + 1);
    }, HOME_WORLD_STEP_MS);
  };
  // Пауза после ручного листания, наведения и ухода со вкладки.
  const hold = (resume = true) => {
    stop();
    window.clearTimeout(resumeTimer);
    if (resume) resumeTimer = window.setTimeout(play, HOME_WORLD_RESUME_MS);
  };

  const carousel = track.closest('.home-world-carousel') || track;
  carousel.addEventListener('pointerenter', () => hold(false));
  carousel.addEventListener('pointerleave', play);
  carousel.addEventListener('focusin', () => hold(false));
  carousel.addEventListener('focusout', play);
  track.addEventListener('pointerdown', () => hold(), { passive: true });
  track.addEventListener('touchstart', () => hold(), { passive: true });
  window.addEventListener('resize', play, { passive: true });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : play()));
  play();

  document.querySelector('[data-home-world-prev]')?.addEventListener('click', () => { hold(); show(current - 1); });
  document.querySelector('[data-home-world-next]')?.addEventListener('click', () => { hold(); show(current + 1); });
  dots.forEach((dot, index) => dot.addEventListener('click', () => { hold(); show(index); }));
  track.addEventListener('scroll', () => {
    const center = track.scrollLeft + track.clientWidth / 2;
    let nearest = 0;
    let distance = Infinity;
    cards.forEach((card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const nextDistance = Math.abs(cardCenter - center);
      if (nextDistance < distance) { nearest = index; distance = nextDistance; }
    });
    if (nearest !== current) {
      current = nearest;
      paint();
    }
  }, { passive: true });
}

// Витрина на главной — четыре свободных Жителя и два рождающихся: проданных
// сюда не берём, но показать, что работа идёт, важнее ещё двух ценников.
// Оба фильтра над витриной обязаны что-то находить, поэтому квоты жёсткие.
const HOME_SHOWCASE = [['available', 8], ['in-progress', 4]];

// Сначала по одному Жителю из каждого Мира, и только потом вторые — иначе
// витрина забивается одним Миром и выглядит уже, чем Мастерская на самом деле.
function spreadAcrossWorlds(residents, limit) {
  const seen = new Set();
  const first = [];
  const rest = [];
  residents.forEach((resident) => {
    if (seen.has(resident.collectionId)) rest.push(resident);
    else { seen.add(resident.collectionId); first.push(resident); }
  });
  return [...first, ...rest].slice(0, limit);
}

function home() {
  const residents = HOME_SHOWCASE.flatMap(([availability, limit]) => spreadAcrossWorlds(
    content.residents.filter((resident) => resident.availability === availability),
    limit
  ));
  const freeCount = content.residents.filter((resident) => resident.availability === 'available').length;
  const workCount = content.residents.filter((resident) => resident.availability === 'in-progress').length;
  const openPrices = content.residents
    .filter((resident) => resident.availability === 'available')
    .map((resident) => Number(resident.price))
    .filter((price) => price > 0);
  const keeperFound = content.residents.find((resident) => resident.availability === 'archive');
  const summary = [
    freeCount ? `Свободны сейчас: ${freeCount}` : '',
    workCount ? `Рождаются: ${workCount}` : '',
    openPrices.length ? `Цены от ${Math.min(...openPrices).toLocaleString('ru-RU')} ₽` : ''
  ].filter(Boolean).join(' · ');

  paint(app, `<main id="main" class="home-redesign">
    <section class="home-v2-hero">
      <div class="home-v2-hero__media"><picture><source media="(max-width: 50rem)" srcset="/media/hero/atelier-group-mobile.webp"><img src="/media/hero/atelier-group-desktop.webp" alt="Собрание Жителей Мастерской Веры" fetchpriority="high"></picture></div>
      <div class="home-v2-hero__shade"></div>
      <div class="shell home-v2-hero__layout">
        <div class="home-v2-hero__copy">
          <h1><span>Сказки, которые</span> <span>можно взять в руки</span></h1>
          <p>Авторские фигурки ручной работы</p>
          <div class="home-v2-actions">
            <a class="button button--forest" href="/residents.html">Смотреть готовые работы <span aria-hidden="true">→</span></a>
            <a class="button button--gold-outline" href="/contact.html">Заказать свою фигурку</a>
          </div>
          <div class="home-v2-proof">1 экземпляр <i></i> ручная лепка <i></i> авторская роспись</div>
        </div>
        <div class="home-v2-note" aria-hidden="true">Сказки<br>живут<br>здесь</div>
      </div>
    </section>

    <section id="workshop" class="home-v2-workshop">
      <div class="home-ornament home-ornament--workshop-left" aria-hidden="true">${worldOrnament('forest')}</div>
      <div class="home-ornament home-ornament--workshop-right" aria-hidden="true">${worldOrnament('forest')}</div>
      <div class="shell">
        <div class="home-v2-workshop__grid">
          <div class="home-v2-workshop__copy">
            <p class="eyebrow">Познакомьтесь с мастерской</p>
            <h2>Как рождается <br>фигурка</h2>
            <p>Вера создаёт каждого Жителя вручную — от каркаса до последнего мазка. У каждой работы есть имя, характер и собственная история.</p>
            <a class="button button--forest" href="/about.html">О мастерской <span aria-hidden="true">→</span></a>
          </div>
          <div class="home-process-prints" aria-label="Как рождается Житель">
            <figure class="home-process-print home-process-print--one"><img src="/media/process/02-foil.webp" alt="Основа будущего Жителя из проволоки и фольги" fetchpriority="low"></figure>
            <figure class="home-process-print home-process-print--two"><img src="/media/process/06-unpainted.webp" alt="Житель после ручной лепки" fetchpriority="low"></figure>
            <figure class="home-process-print home-process-print--three"><img src="/media/process/08-finished.webp" alt="Готовый сине-белый дракон" fetchpriority="low"></figure>
            <span class="home-process-note home-process-note--start" aria-hidden="true">Сначала<br>идея</span>
            <span class="home-process-note home-process-note--finish" aria-hidden="true">А потом жизнь</span>
          </div>
        </div>
        <div class="home-features">
          <div class="home-feature"><span class="home-feature__icon">${homeFeatureIcon('hand')}</span><span><b>Ручная лепка</b><small>Каждая фигурка создаётся вручную, без форм</small></span></div>
          <div class="home-feature"><span class="home-feature__icon">${homeFeatureIcon('palette')}</span><span><b>Авторская роспись</b><small>Уникальные цвета и характеры</small></span></div>
          <div class="home-feature"><span class="home-feature__icon">${homeFeatureIcon('diamond')}</span><span><b>Один экземпляр</b><small>Таких больше не будет</small></span></div>
        </div>
      </div>
    </section>

    <section id="worlds" class="home-v2-worlds">
      <div class="home-ornament home-ornament--worlds-left" aria-hidden="true">${worldOrnament('forest')}</div>
      <div class="home-ornament home-ornament--worlds-right" aria-hidden="true">${worldOrnament('forest')}</div>
      <div class="shell">
        <header class="home-v2-section-head home-v2-section-head--dark">
          <div><p class="eyebrow eyebrow--light">Где живут Жители</p><h2>Миры Мастерской</h2></div>
          <a href="/collections.html">Открыть все Миры <span aria-hidden="true">→</span></a>
        </header>
        <div class="home-world-carousel">
          <button class="home-world-control home-world-control--prev" type="button" data-home-world-prev aria-label="Предыдущий Мир">‹</button>
          <div class="home-world-track" data-home-world-track>${content.collections.map(homeWorldCard).join('')}</div>
          <button class="home-world-control home-world-control--next" type="button" data-home-world-next aria-label="Следующий Мир">›</button>
        </div>
        <div class="home-world-dots" aria-label="Выбор Мира">${content.collections.map((collection, index) => `<button class="${index === 0 ? 'is-active' : ''}" type="button" data-home-world-dot aria-label="${esc(collection.name)}" aria-current="${index === 0 ? 'true' : 'false'}"></button>`).join('')}</div>
        <a class="button button--forest home-world-all" href="/collections.html">Открыть все Миры <span aria-hidden="true">→</span></a>
      </div>
    </section>

    <section id="residents" class="home-v2-residents">
      <div class="home-ornament home-ornament--residents-left" aria-hidden="true">${worldOrnament('forest')}</div>
      <div class="home-ornament home-ornament--residents-right" aria-hidden="true">${worldOrnament('forest')}</div>
      <div class="shell">
        <header class="home-v2-section-head home-v2-section-head--residents">
          <div>
            <h2>Кто ждёт своего Хранителя</h2>
            <p>Больше, чем декор — это истории, которые остаются</p>
          </div>
          <a href="/residents.html">Смотреть всех жителей <span aria-hidden="true">→</span></a>
        </header>
        <div class="home-resident-bar">
          <p class="home-resident-summary">${esc(summary)}</p>
          <div class="home-resident-filters" role="group" aria-label="Показать Жителей">
            <button class="home-chip" type="button" aria-pressed="true" data-home-resident-filter="all">Все</button>
            <button class="home-chip" type="button" aria-pressed="false" data-home-resident-filter="available">Можно приобрести</button>
            <button class="home-chip" type="button" aria-pressed="false" data-home-resident-filter="in-progress">В работе</button>
          </div>
        </div>
        <div class="home-resident-grid">${residents.map(homeResidentCard).join('')}</div>
        <p class="home-resident-empty" data-home-resident-empty hidden>Здесь сейчас пусто — посмотрите всех Жителей Мастерской.</p>
        <button class="home-resident-more" type="button" data-home-resident-more hidden>Показать ещё</button>
        <a class="button button--forest home-resident-all" href="/residents.html">Смотреть всех жителей <span aria-hidden="true">→</span></a>
      </div>
    </section>

    <section id="chronicles" class="home-v2-chronicles">
      <div class="shell">
        <header class="home-v2-section-head home-v2-section-head--dark">
          <div>
            <p class="eyebrow eyebrow--light">Истории, которые остались</p>
            <h2>Хроники Мастерской</h2>
          </div>
          <a href="/residents.html">Все Жители <span aria-hidden="true">→</span></a>
        </header>
        <div class="home-chronicles">
          ${keeperFound ? `<article class="home-chronicle home-chronicle--keeper">
            <a class="home-chronicle__image" href="/chronicle.html?resident=${encodeURIComponent(keeperFound.slug)}">
              <img src="${esc(keeperFound.sceneImage || keeperFound.heroImage)}" alt="${esc(keeperFound.shortName || keeperFound.name)} — Житель, нашедший Хранителя" loading="lazy">
              <span class="status status--archive home-chronicle__status">Нашёл Хранителя</span>
            </a>
            <div class="home-chronicle__copy">
              <h3>${esc(keeperFound.shortName || keeperFound.name)}</h3>
              <p class="home-chronicle__quote">${esc(keeperFound.chronicle?.character || keeperFound.excerpt || '')}</p>
              <a class="text-link text-link--light" href="/chronicle.html?resident=${encodeURIComponent(keeperFound.slug)}">Читать Хронику <b aria-hidden="true">↗</b></a>
            </div>
          </article>` : ''}
          <div class="home-chronicle-stories">
            ${content.stories.slice(0, 2).map((story) => `<article class="home-chronicle-story">
              <h3>${esc(story.title)}</h3>
              <p>${esc(story.lead)}</p>
              <a class="text-link text-link--light" href="/process.html">Как это было <b aria-hidden="true">↗</b></a>
            </article>`).join('')}
            <p class="home-chronicle-note">Каждого Жителя, который уехал к своему Хранителю, Мастерская запоминает: повторить его нельзя, но история остаётся здесь.</p>
          </div>
        </div>
      </div>
    </section>

    <section id="order" class="home-v2-steps">
      <div class="home-ornament home-ornament--steps-left" aria-hidden="true">${worldOrnament('forest')}</div>
      <div class="shell">
        <header class="home-v2-section-head home-v2-section-head--steps">
          <div>
            <p class="eyebrow">Как это работает</p>
            <h2>Путь от письма <br>до вашей полки</h2>
          </div>
          <p class="home-steps-lede">Никаких форм заказа и менеджеров: вы пишете Вере, она отвечает сама. Готового Жителя можно забрать сразу, нового — обсудить и дождаться.</p>
        </header>
        <ol class="home-steps">
          <li class="home-step">
            <span class="home-step__number">01</span>
            <h3>Вы пишете</h3>
            <p>В Telegram или через страницу контактов. Расскажите, кто вам приглянулся или кого хочется — можно просто настроением.</p>
          </li>
          <li class="home-step">
            <span class="home-step__number">02</span>
            <h3>Обсуждаем</h3>
            <p>Вера отвечает лично: наличие, цена, сроки. Для новой работы — характер, цвета, размер и детали.</p>
          </li>
          <li class="home-step">
            <span class="home-step__number">03</span>
            <h3>Вера лепит</h3>
            <p>От каркаса до последнего мазка, вручную. По пути показывает, как идёт работа, — вы видите, каким получается ваш Житель.</p>
          </li>
          <li class="home-step">
            <span class="home-step__number">04</span>
            <h3>Отправляем</h3>
            <p>Упаковываем так, чтобы доехал целым, и отправляем — по России и за её пределы. Сроки и стоимость считаем под ваш адрес.</p>
          </li>
        </ol>
        <div class="home-steps-actions">
          <a class="button button--forest" href="https://t.me/vera120700" target="_blank" rel="noreferrer">Написать Вере <span aria-hidden="true">→</span></a>
          <a class="button button--quiet" href="/create.html">Обсудить будущего Жителя</a>
        </div>
      </div>
    </section>

    <section id="faq" class="home-v2-faq">
      <div class="shell">
        <header class="home-v2-section-head home-v2-section-head--dark">
          <div>
            <p class="eyebrow eyebrow--light">Прежде чем писать</p>
            <h2>Частые вопросы</h2>
          </div>
          <a href="/contact.html">Все условия <span aria-hidden="true">→</span></a>
        </header>
        <div class="home-faq">${HOME_FAQ.map(homeFaqItem).join('')}</div>
      </div>
    </section>

    <section class="home-v2-cta">
      <div class="home-v2-cta__media" aria-hidden="true"></div>
      <div class="home-v2-cta__shade" aria-hidden="true"></div>
      <div class="shell home-v2-cta__copy">
        <h2>Найти своего Жителя</h2>
        <p>Возможно, он уже ждёт вас в Мастерской.</p>
        <a class="button button--forest" href="https://t.me/vera120700" target="_blank" rel="noreferrer">Написать Вере</a>
      </div>
    </section>
  </main>`);
  document.title = 'Мастерская Веры — авторские фигурки ручной работы';
  bindHomeWorldCarousel();
  bindHomeResidentFilters();
  markHomeReveal();
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
        <div><p class="eyebrow eyebrow--light">Мир Мастерской</p><h2>${esc(collection.name)}</h2><p>${esc(collection.description)}</p></div>
        <a class="button button--light" href="/collection.html?world=${encodeURIComponent(collection.slug)}">Войти в мир</a>
      </header>
      <div class="resident-grid">${residentsInWorld.map(residentCard).join('')}</div>
    </div>
  </section>`;
}

function residents() {
  paint(app, `<main id="main">
    <section class="page-hero page-hero--residents"><div class="shell"><p class="eyebrow eyebrow--light">Все работы Веры</p><h1>Жители Мастерской</h1><p class="lede lede--light">Свободных можно забрать сразу, будущие рождаются прямо сейчас, а проданные остаются в Хрониках.</p></div></section>
    <div class="filter-dock"><div class="shell filters" data-filters>
      <button class="filter-button" aria-pressed="true" data-filter="all">Все Миры</button>
      ${content.collections.map((collection) => `<button class="filter-button" aria-pressed="false" data-filter="${esc(collection.id)}">${esc(collection.name)}</button>`).join('')}
      <button class="filter-button" aria-pressed="false" data-filter="available">Можно приобрести</button>
      <button class="filter-button" aria-pressed="false" data-filter="in-progress">В работе</button>
      <button class="filter-button" aria-pressed="false" data-filter="archive">Архив</button>
    </div></div>
    <div data-resident-worlds>${content.collections.map(residentWorldSection).join('')}</div>
    <section class="section section--paper"><div class="shell empty-state" hidden data-empty>В этом разделе пока нет Жителей. Выберите другой Мир или напишите Вере.</div></section>
  </main>`);
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
  paint(app, `<main id="main">
    <section class="page-hero page-hero--atlas"><div class="shell"><p class="eyebrow eyebrow--light">Атлас Мастерской</p><h1>Миры Мастерской</h1><p class="lede lede--light">Не фильтры каталога, а отдельные сцены: лес дышит мхом и огоньками, зима — снегом, русская сказка — деревом и вязью. У каждого Мира свои Жители, свой воздух и свой повод стать подарком.</p></div></section>
    <section class="section section--night worlds-section"><div class="shell"><div class="world-atlas world-atlas--full">${content.collections.map(worldCard).join('')}</div></div></section>
  </main>`);
  document.title = 'Миры Мастерской — Мастерская Веры';
  enableAtmosphereMotion();
  bindWorldWalk();
}

// Scrolling the atlas walks the reader through the worlds: whichever world
// card is nearest the middle of the screen sets the page's air. This is what
// makes the atlas feel like moving between places rather than reading a list.
// Card micro-interactions. Pointer-only: a tilt that follows a finger just
// fights the scroll on a phone, so touch devices get the plain card.
function bindCardMotion() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.querySelectorAll('.resident-card, .world-chapter').forEach((card) => {
    let raf = 0;
    const move = (event) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const box = card.getBoundingClientRect();
        const px = (event.clientX - box.left) / box.width - .5;
        const py = (event.clientY - box.top) / box.height - .5;
        // Kept deliberately shallow — a craft shop, not a gadget store.
        card.style.setProperty('--tilt-x', `${(-py * 4).toFixed(2)}deg`);
        card.style.setProperty('--tilt-y', `${(px * 5).toFixed(2)}deg`);
        card.style.setProperty('--tilt-lift', '-4px');
      });
    };
    const reset = () => {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
      card.style.setProperty('--tilt-lift', '0px');
    };
    card.addEventListener('pointermove', move);
    card.addEventListener('pointerleave', reset);
  });
}

// The header condenses once the reader leaves the first screen.
function bindHeaderShrink() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  let compact = false;
  const check = () => {
    const next = window.scrollY > 80;
    if (next === compact) return;
    compact = next;
    header.classList.toggle('is-compact', next);
  };
  check();
  window.addEventListener('scroll', check, { passive: true });
}

function bindWorldWalk() {
  const cards = [...document.querySelectorAll('[data-world]')];
  if (!cards.length || !('IntersectionObserver' in window)) return;

  mountWorldAir(cards[0].dataset.world);
  document.body.classList.add('world-walk');

  let current = cards[0].dataset.world;
  const observer = new IntersectionObserver((entries) => {
    // Pick the most-visible card rather than the first to cross the line, so a
    // fast scroll settles on what the reader is actually looking at.
    let best = null;
    entries.forEach((entry) => {
      if (entry.isIntersecting && (!best || entry.intersectionRatio > best.intersectionRatio)) best = entry;
    });
    const next = best?.target?.dataset?.world;
    if (!next || next === current) return;
    current = next;
    setWorldTheme(next);
  }, { threshold: [.35, .6], rootMargin: '-20% 0px -20% 0px' });

  cards.forEach((card) => observer.observe(card));
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
  // В шапку Мира берём кадр его Жителя: сцены из media/worlds — пустые
  // декорации без фигурок, а человек открывает Мир, чтобы увидеть работы.
  const stageResident = residentsInWorld.find((resident) => resident.availability === 'available' && resident.sceneImage)
    || residentsInWorld.find((resident) => resident.sceneImage);
  document.body.classList.add(`theme-${collection.theme}`, 'world-page');
  mountWorldAir(collection.theme);

  paint(app, `<main id="main">
    <section class="world-stage theme-${esc(collection.theme)}" style="--world-accent:${esc(collection.accent)}" data-parallax>
      <img class="world-stage__scene" src="${esc(stageResident?.sceneImage || collection.sceneImage || collection.image)}" alt="${stageResident ? esc(`${stageResident.shortName || stageResident.name} в мире «${collection.name}»`) : ''}" fetchpriority="high">
      <div class="world-stage__shade"></div>
      ${atmosphereMarkup(collection.theme)}
      <div class="shell world-stage__intro">
        <a class="world-back" href="/collections.html">← Все Миры</a>
        <p class="eyebrow eyebrow--light">Мир Мастерской</p>
        <h1>${esc(collection.name)}</h1>
        <p>${esc(collection.description)}</p>
        <div class="world-stage__facts">
          <span class="world-badge">${residentsInWorld.length} ${residentWord(residentsInWorld.length)}</span>
          ${available.length ? `<span class="world-badge world-badge--free">${available.length} можно забрать домой</span>` : ''}
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
  </main>`);
  document.title = `${collection.name} — Мастерская Веры`;
  setCanonical(`world=${encodeURIComponent(collection.slug || collection.id)}`);
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

  // Warm the other slides once the page is quiet. Deferring matters twice
  // over: reading .src now would catch the paths before rewritePreviewPaths()
  // has stitched the Pages subfolder back in (a 404 per slide on the preview),
  // and the warm-up would be racing the photo the reader is actually looking
  // at for bandwidth.
  const warmSlides = () => slides.slice(1).forEach((slide) => {
    const source = slide.querySelector('.world-resident__scene img');
    if (!source) return;
    const image = new Image();
    image.src = source.currentSrc || source.src;
  });
  if ('requestIdleCallback' in window) requestIdleCallback(warmSlides, { timeout: 2000 });
  else setTimeout(warmSlides, 800);

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
  paint(app, `<main id="main">
    <section class="page-hero page-hero--process"><div class="shell"><p class="eyebrow eyebrow--light">От проволоки до характера</p><h1>Как создаётся Житель</h1><p class="lede lede--light">Не разрозненный коллаж, а настоящий путь Азимондиаса — восемь последовательных этапов ручной работы.</p></div></section>
    <section class="section section--paper process-chronicle"><div class="shell">
      <header class="process-chronicle__head"><div><p class="eyebrow">Рождение формы</p><h2>Азимондиас.<br>Шаг за шагом.</h2></div><p class="lede">${esc(azimondias.story)}</p></header>
      <ol class="process-sequence">${stages.map(([number, title, description, image], index) => `<li class="process-stage ${index % 2 ? 'process-stage--reverse' : ''}" data-reveal>
        <figure class="process-stage__image"><img src="${image}" alt="${esc(title)} — этап создания Азимондиаса" loading="lazy"><figcaption>${number} / 08</figcaption></figure>
        <div class="process-stage__copy"><span>${number}</span><p class="eyebrow">Этап создания</p><h3>${esc(title)}</h3><p>${esc(description)}</p></div>
      </li>`).join('')}</ol>
    </div></section>
    <section class="section section--night"><div class="shell quote-panel"><p class="eyebrow eyebrow--light">Голос Мастера</p><blockquote>«${esc(threshold.quote)}»</blockquote><cite>Вера — о первой большой драконьей работе</cite></div></section>
  </main>`);
  document.title = 'Как создаётся Житель — Мастерская Веры';
  enableAtmosphereMotion();
}

function createResident() {
  const baseOptions = [
    { title: 'Лесной дракон', note: 'Мох, кора и природная палитра', image: '/media/residents/forest-dragon/studio.webp' },
    { title: 'Малыш-дракон', note: 'Новый характер, который ещё появляется', image: '/media/residents/baby-dragon/hero.webp' },
    { title: 'Сказочный спутник', note: 'Дорога, движение и собственная легенда', image: '/media/residents/horse/hero.webp' }
  ];
  paint(app, `<main id="main">
    <section class="page-hero page-hero--create"><div class="shell"><p class="eyebrow eyebrow--light">Будущая работа</p><h1>Обсудить идею с Верой</h1><p class="lede lede--light">Не конструктор готовой копии, а разговор о характере, форме, цвете и деталях нового Жителя.</p></div></section>
    <section class="section section--paper"><div class="shell creation-layout">
      <aside class="creation-preview">
        <img src="${baseOptions[0].image}" alt="Пример направления будущей работы" data-preview-image>
        <div class="creation-preview__copy"><p class="eyebrow eyebrow--light">Направление образа</p><h2 data-preview-title>${baseOptions[0].title}</h2><p data-preview-note>${baseOptions[0].note}</p></div>
      </aside>
      <div class="creation-panel"><p class="eyebrow">Первый разговор</p><h2>С чего может начаться новый Житель</h2><p class="lede">Выберите близкое настроение. Это не обещание точной копии, а отправная точка для разговора с Верой.</p>
        <div class="option-grid" data-choice="base">${baseOptions.map((option, index) => `<button class="option ${index === 0 ? 'is-selected' : ''}" type="button" data-title="${option.title}" data-note="${option.note}" data-image="${option.image}"><img src="${option.image}" alt=""><span><b>${option.title}</b><small>${option.note}</small></span></button>`).join('')}</div>
        <p class="creation-note">Размер, материалы, сроки и стоимость Вера обсуждает лично после знакомства с идеей.</p>
        <div class="contact-actions"><a class="button button--wine" href="https://t.me/vera120700" target="_blank" rel="noreferrer">Написать в Telegram</a><a class="button button--line" href="https://t.me/masterskayaver" target="_blank" rel="noreferrer">Канал Мастерской</a></div>
      </div>
    </div></section>
  </main>`);
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
    primaryAction = `<a class="button button--forest" href="${esc(purchaseLink(resident))}" target="_blank" rel="noreferrer">Написать Вере</a>`;
  } else if (resident.availability === 'in-progress') {
    primaryAction = `<a class="button button--forest" href="/contact.html?resident=${encodeURIComponent(resident.slug)}">Узнать о работе</a>`;
  }

  paint(app, `<main id="main" class="theme-${esc(collection.theme)}">
    <section class="chronicle-hero">
      <img class="chronicle-hero__scene" src="${esc(resident.sceneImage || collection.sceneImage || collection.image)}" alt="${esc(resident.name)} в мире «${esc(collection.name)}»">
      <div class="chronicle-hero__shade"></div>${atmosphereMarkup(collection.theme)}
      <div class="shell">
        <p class="eyebrow eyebrow--light">Хроника Жителя · ${esc(collection.name)}</p>
        <h1>${esc(resident.name)}</h1>
        <p class="lede lede--light">${esc(resident.excerpt)}</p>
        <div class="chronicle-hero__offer">
          <span class="status ${className}">${status}</span>
          ${['available', 'in-progress'].includes(resident.availability) ? `<span class="chronicle-hero__price">${esc(priceLabel(resident))}</span>` : ''}
          ${stockLabel(resident) ? `<span class="chronicle-hero__stock">${esc(stockLabel(resident))}</span>` : ''}
        </div>
        ${primaryAction ? `<div class="chronicle-hero__actions">${primaryAction}</div>` : ''}
      </div>
    </section>
    ${primaryAction ? `<div class="chronicle-dock" data-chronicle-dock hidden>
      <div class="shell chronicle-dock__inner">
        <div class="chronicle-dock__copy">
          <b>${esc(resident.shortName || resident.name)}</b>
          <span>${esc(['available', 'in-progress'].includes(resident.availability) ? priceLabel(resident) : status)}</span>
        </div>
        ${primaryAction}
      </div>
    </div>` : ''}
    <section class="section section--paper"><div class="shell resident-detail">
      <figure class="resident-detail__image"><img src="${esc(resident.heroImage)}" alt="${esc(resident.name)}"></figure>
      <div class="resident-detail__copy"><span class="status ${className}">${status}</span><h2>${esc(resident.name)}</h2><p class="lede">${esc(resident.story)}</p>
        <dl class="meta-list"><div><dt>Мир</dt><dd>${esc(collection.name)}</dd></div>${['available', 'in-progress'].includes(resident.availability) ? `<div><dt>Стоимость</dt><dd>${esc(priceLabel(resident))}</dd></div>` : ''}${stockLabel(resident) ? `<div><dt>В наличии</dt><dd>${esc(stockLabel(resident))}</dd></div>` : ''}<div><dt>Работа</dt><dd>${esc(techniqueCopy(resident.technique))}</dd></div><div><dt>Характер</dt><dd>${esc(resident.character)}</dd></div><div><dt>Где обитает</dt><dd>${esc(resident.habitat)}</dd></div></dl>
        <div class="cluster">${primaryAction}<a class="button button--line" href="/residents.html">Все Жители</a></div>
      </div>
    </div></section>
    <section class="section"><div class="shell"><header class="section-head"><div><p class="eyebrow">Свиток Жителя</p><h2>Хроника в трёх частях</h2></div></header><div class="chronicle-grid"><div><p class="eyebrow">Истоки</p><h3>Откуда пришёл</h3><p>${esc(resident.chronicle?.origin)}</p></div><div><p class="eyebrow">Характер</p><h3>Какой он</h3><p>${esc(resident.chronicle?.character)}</p></div><div><p class="eyebrow">Путь</p><h3>Куда ведёт история</h3><p>${esc(resident.chronicle?.path)}</p></div></div></div></section>
    <section class="section section--night"><div class="shell"><header class="section-head section-head--light"><div><p class="eyebrow eyebrow--light">Настоящие фотографии</p><h2>Рассмотреть ближе</h2></div></header><div class="gallery">${resident.gallery.map((media, index) => isVideo(media) ? `<div class="gallery__video">${galleryMedia(media, `${resident.name} — видео ${index + 1}`)}</div>` : `<button type="button" data-lightbox="${esc(media)}" aria-label="Открыть фото ${index + 1}">${galleryMedia(media, `${resident.name} — фотография ${index + 1}`)}</button>`).join('')}</div></div></section>
    ${chronicleNextStep(resident, collection)}
  </main>`);
  document.title = `${resident.name} — Хроника Мастерской Веры`;
  setCanonical(`resident=${encodeURIComponent(resident.slug || resident.id)}`);
  bindLightbox();
  bindChronicleDock();
  enableAtmosphereMotion();
}

// Цена и кнопка живут в первом экране, но стоит его пролистать — и решение
// принимать не на чем. Панель снизу поднимает их обратно, как только
// предложение из героя ушло за верхний край.
function bindChronicleDock() {
  const dock = document.querySelector('[data-chronicle-dock]');
  const offer = document.querySelector('.chronicle-hero__offer');
  if (!dock || !offer) return;
  if (!('IntersectionObserver' in window)) { dock.hidden = false; return; }
  const observer = new IntersectionObserver(([entry]) => {
    dock.hidden = entry.isIntersecting;
  }, { rootMargin: '-20% 0px 0px 0px' });
  observer.observe(offer);
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
  // Цифры считаются из данных: страница о мастерской не должна обещать
  // больше, чем в ней на самом деле живёт.
  const total = content.residents.length;
  const free = content.residents.filter((resident) => resident.availability === 'available').length;
  const worlds = content.collections.length;
  const keepers = content.residents.filter((resident) => resident.availability === 'archive').length;

  paint(app, `<main id="main">
    <section class="page-hero page-hero--about"><div class="shell"><p class="eyebrow eyebrow--light">О Мастерской</p><h1>Там, где форма становится характером</h1><p class="lede lede--light">Вера лепит и расписывает фантазийных Жителей вручную — от первого каркаса до финального взгляда.</p></div></section>

    <section class="section section--paper"><div class="shell about-grid" data-reveal><figure class="about-image"><img src="/media/residents/forest-dragon/studio.webp?v=20260805g" alt="Готовая работа Веры" loading="lazy"></figure><div><p class="eyebrow">Руки и материал</p><h2>Работа начинается не с витрины, а с идеи и формы</h2><p class="lede">Полимерная глина, каркас из фольги и проволоки, ручная обработка, акриловая роспись, защитное покрытие и маленькие детали — путь каждого Жителя зависит от его характера.</p><div class="facts"><div class="fact"><b>Вручную</b><span>каждый этап проходит через руки Веры</span></div><div class="fact"><b>Лично</b><span>идеи и заказы обсуждаются напрямую</span></div><div class="fact"><b>Без копий</b><span>повторить работу один в один нельзя</span></div></div><div class="cluster cluster--top"><a class="button button--forest" href="/contact.html">Написать Вере</a><a class="button button--line" href="/process.html">Посмотреть процесс</a></div></div></div></section>

    <section class="section section--night about-tally"><div class="shell">
      <header class="section-head section-head--light" data-reveal><div><p class="eyebrow eyebrow--light">Мастерская сегодня</p><h2>Из чего она состоит</h2></div></header>
      <dl class="about-numbers" data-reveal>
        <div><dt>${total}</dt><dd>Жителей уже рождены и описаны в Хрониках</dd></div>
        <div><dt>${worlds}</dt><dd>${pluralWorlds(worlds)} — у каждого свой воздух и свои истории</dd></div>
        <div><dt>${free}</dt><dd>свободны сейчас и ждут своего Хранителя</dd></div>
        ${keepers ? `<div><dt>${keepers}</dt><dd>уже уехали к Хранителям — повторить их нельзя</dd></div>` : ''}
      </dl>
    </div></section>

    <section class="section section--paper about-principles"><div class="shell">
      <header class="section-head" data-reveal><div><p class="eyebrow">Как здесь работают</p><h2>Три вещи, которые не меняются</h2></div></header>
      <div class="about-principle-grid">
        <article class="about-principle" data-reveal><span class="about-principle__number">01</span><h3>Никаких форм и тиражей</h3><p>Каждый Житель лепится заново, поэтому двух одинаковых не бывает даже у одного персонажа: поза, взгляд и оттенки всегда получаются своими.</p></article>
        <article class="about-principle" data-reveal><span class="about-principle__number">02</span><h3>Разговор вместо конструктора</h3><p>Вера отвечает сама — без менеджеров и анкет. Будущего Жителя обсуждают словами: характер, настроение, цвет, повод.</p></article>
        <article class="about-principle" data-reveal><span class="about-principle__number">03</span><h3>У работы есть история</h3><p>Каждый Житель получает имя, характер и Хронику. Она остаётся на сайте и после того, как он уедет к своему Хранителю.</p></article>
      </div>
      <div class="cluster cluster--top" data-reveal><a class="button button--forest" href="/residents.html">Посмотреть Жителей <span aria-hidden="true">→</span></a><a class="button button--quiet" href="/create.html">Обсудить будущего Жителя</a></div>
    </div></section>
  </main>`);
  document.title = 'О Мастерской — Мастерская Веры';
  enableAtmosphereMotion();
}

function pluralWorlds(count) {
  const tail = count % 100;
  if (tail > 10 && tail < 20) return 'Миров';
  const last = count % 10;
  if (last === 1) return 'Мир';
  if (last > 1 && last < 5) return 'Мира';
  return 'Миров';
}

function contact() {
  const resident = byId(content.residents, query('resident'));
  const telegramText = resident
    ? encodeURIComponent(`Здравствуйте! Хочу узнать о Жителе «${resident.name}».`)
    : encodeURIComponent('Здравствуйте! Хочу узнать о работах Мастерской Веры.');
  paint(app, `<main id="main">
    <section class="page-hero page-hero--contact"><div class="shell"><p class="eyebrow eyebrow--light">Связь с Мастерской</p><h1>Написать Вере</h1><p class="lede lede--light">О готовой работе, будущем Жителе или доставке — без посредников.</p></div></section>
    <section class="section section--paper"><div class="shell contact-grid">
      <div class="contact-card"><p class="eyebrow">Telegram</p><h2>Самый быстрый способ</h2><p>${resident ? `Вы спрашиваете о работе «${esc(resident.name)}». Сообщение уже будет подготовлено.` : 'Вера лично ответит на вопросы о наличии, стоимости, сроках и индивидуальной работе.'}</p><div class="contact-actions"><a class="button button--wine" href="https://t.me/vera120700?text=${telegramText}" target="_blank" rel="noreferrer">Открыть Telegram</a><a class="button button--line" href="https://t.me/masterskayaver" target="_blank" rel="noreferrer">Канал Мастерской</a></div><p class="contact-channel">В канале — готовые работы и процесс, в личных сообщениях — ответы на вопросы.</p></div>
      <div class="contact-card contact-card--dark"><p class="eyebrow eyebrow--light">Что можно уточнить</p><ul class="contact-list"><li><span>01</span>Есть ли Житель в наличии</li><li><span>02</span>Стоимость и доставка</li><li><span>03</span>Идея индивидуальной работы</li><li><span>04</span>Подарочный набор</li></ul></div>
    </div></section>
    <section id="write" class="section section--paper contact-form-section"><div class="shell">
      <header class="section-head" data-reveal><div><p class="eyebrow">Если удобнее письмом</p><h2>Оставьте сообщение</h2><p class="lede">Вера прочитает его сама и ответит тем способом, который вы укажете. Это то же самое письмо, что в Telegram, — просто без мессенджера.</p></div></header>
      <form class="contact-form" data-inquiry-form novalidate data-reveal>
        <div class="contact-form__row">
          <label class="field">
            <span class="field__label">Как вас зовут</span>
            <input class="field__input" type="text" name="name" required maxlength="120" autocomplete="name" placeholder="Имя">
          </label>
          <label class="field">
            <span class="field__label">Как ответить</span>
            <input class="field__input" type="text" name="contact" required maxlength="250" placeholder="Telegram, почта или телефон">
          </label>
        </div>
        <label class="field">
          <span class="field__label">О ком или о чём речь</span>
          <textarea class="field__input field__input--area" name="message" required maxlength="3000" rows="5" placeholder="${resident ? `Хочу узнать о Жителе «${esc(resident.name)}»` : 'Расскажите, кто приглянулся или кого хочется — можно просто настроением'}">${resident ? `Здравствуйте! Хочу узнать о Жителе «${esc(resident.name)}».` : ''}</textarea>
        </label>
        <div class="contact-form__foot">
          <button class="button button--forest" type="submit" data-inquiry-submit>Отправить Вере</button>
          <p class="contact-form__note" data-inquiry-note role="status" aria-live="polite">Ответит Вера лично — она читает все письма сама.</p>
        </div>
      </form>
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
  </main>`);
  document.title = 'Связаться с Верой — Мастерская Веры';
  bindInquiryForm();
  enableAtmosphereMotion();
}

// Форма писала прямо в админку и до сих пор была единственным, чего на
// сайте не хватало: сервер принимал заявки, админка их показывала, а
// отправить их было неоткуда.
function bindInquiryForm() {
  const form = document.querySelector('[data-inquiry-form]');
  if (!form) return;
  const note = form.querySelector('[data-inquiry-note]');
  const submit = form.querySelector('[data-inquiry-submit]');
  const idle = note.textContent;

  const say = (text, state) => {
    note.textContent = text;
    note.dataset.state = state || '';
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const payload = {
      name: String(data.get('name') || '').trim(),
      contact: String(data.get('contact') || '').trim(),
      message: String(data.get('message') || '').trim()
    };
    // Проверяем на месте: у сервера тот же набор обязательных полей, но
    // ждать ответа ради «заполните имя» незачем.
    const missing = Object.entries(payload).find(([, value]) => !value);
    if (missing) {
      say('Заполните имя, способ связи и сообщение — иначе Вере будет некуда ответить.', 'error');
      form.querySelector(`[name="${missing[0]}"]`)?.focus();
      return;
    }

    submit.disabled = true;
    say('Отправляем…', '');
    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Не получилось отправить.');
      }
      form.reset();
      say('Письмо у Веры. Она ответит тем способом, который вы указали.', 'done');
    } catch (error) {
      // Сайт может стоять на статическом хостинге, где принимать заявки
      // некому, — тогда честно отправляем человека в Telegram.
      say(`${error.message} Напишите Вере в Telegram — так точно дойдёт.`, 'error');
    } finally {
      submit.disabled = false;
      window.setTimeout(() => note.dataset.state === 'done' && say(idle, ''), 9000);
    }
  });
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
    // Take the address off the thumbnail rather than the data- attribute: the
    // thumbnail's src is already absolute and already carries the Pages
    // subfolder, and .src (not .currentSrc) is the full-size photo, not the
    // small copy a phone is showing in the grid.
    const thumbnail = button.querySelector('img');
    const source = thumbnail?.src || button.dataset.lightbox;
    if (!source) return;
    const photo = picture_();
    photo.alt = thumbnail?.alt || 'Увеличенная фотография Жителя';
    photo.src = source;
    lightbox.classList.add('is-open');
    // Stop the page behind the overlay from scrolling under it.
    document.body.classList.add('menu-open');
  }));
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
}

function notFound() {
  paint(app, '<main id="main"><section class="section"><div class="shell"><p class="eyebrow">Страница не найдена</p><h1>Здесь пока нет Хроники</h1><p class="lede">Вернитесь на главную или откройте атлас Миров.</p><p class="cluster cluster--top"><a class="button button--wine" href="/">На главную</a></p></div></section></main>');
}

// Try the live API first (the real Express server); on any static host —
// GitHub Pages, Beget, a future domain — that 404s, so fall back to the
// content.json snapshot the build step generates. This way the frontend
// doesn't need to know in advance which kind of host it's running on.
/* The canonical has to be an absolute URL, and on chronicle.html?resident=X
   and collection.html?world=Y it has to carry the query: those are a separate
   page per Житель and per Мир, and a canonical pointing at the bare file would
   tell a search engine that all sixteen Жители are the same page. The shell
   ships one with the origin filled in at build time; this rewrites it from the
   address actually open, which also repairs it on a host the build did not
   know about. */
function setCanonical(query) {
  const link = document.querySelector('link[rel="canonical"]');
  if (!link) return;
  const url = new URL(window.location.pathname, window.location.origin);
  if (query) url.search = query;
  link.setAttribute('href', url.href);
}

async function loadContent() {
  // A file host has no /api/content behind it. The build stamps data-static
  // on <body> so those pages go straight to the snapshot instead of spending
  // a round trip on a 404 first. Anywhere else, ask the live API and fall
  // back if there is nobody home.
  if (!document.body.dataset.static) {
    try {
      const response = await fetch('/api/content');
      if (response.ok) return await response.json();
    } catch { /* no server here — fall through to the static snapshot */ }
  }
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
    if (!document.querySelector('link[rel="canonical"][href*="?"]')) setCanonical();
    rewritePreviewPaths();
    mountSceneAir();
    bindCardMotion();
    bindHeaderShrink();
  } catch (error) {
    setShell('');
    paint(app, `<main id="main"><section class="section"><div class="shell"><p class="eyebrow">Техническая пауза</p><h1>Мастерская пока не открылась</h1><p class="lede">${esc(error.message)}. Попробуйте обновить страницу чуть позже.</p></div></section></main>`);
    rewritePreviewPaths();
  }
}

boot();

const pageName = document.body.dataset.page || 'home';
const staticPreview = window.location.hostname.endsWith('.github.io');
const staticRoot = staticPreview ? `/${window.location.pathname.split('/').filter(Boolean)[0] || ''}`.replace(/\/$/, '') : '';
const mobileQuery = window.matchMedia('(max-width: 48rem)');
const mediaUrl = (value = '') => (!value || !value.startsWith('/') || !staticPreview) ? value : `${staticRoot}${value}`;
const contentUrl = staticPreview ? new URL('content.json', window.location.href).href : '/api/content';
const normalize = (value = '') => String(value).trim().toLocaleLowerCase('ru-RU');

const worldImageOverrides = {
  'azimondias': { heroImage: '/media/residents/azimondias/final.webp', focus: '73% center' },
  'nutcracker-ernst': { heroImage: '/media/residents/nutcracker/studio.webp', focus: '72% center' },
  'girl-with-nutcracker': { heroImage: '/media/residents/girl-with-nutcracker/hero.avif', focus: '70% center' },
  'mouse-queen': { heroImage: '/media/residents/mouse-queen/hero.webp', focus: '71% center', availability: 'available' },
  'mouse-king': { heroImage: '/media/residents/mouse-king/hero.webp', focus: '73% center' },
  'gorynych-amber': { heroImage: '/media/residents/gorynych/amber-hero.webp', focus: '72% center' },
  'gorynych-green': { heroImage: '/media/residents/gorynych-green/hero.webp', focus: '72% center' },
  'forest-dragon': { heroImage: '/media/residents/forest-dragon/studio.webp', focus: '73% center' },
  'forest-mushrooms': { heroImage: '/media/residents/mushrooms/hero.webp', focus: '72% center' },
  'baby-dragon': { heroImage: '/media/residents/baby-dragon/hero.webp', focus: '72% center' },
  'soul-regan': { heroImage: '/media/residents/soul-regan/hero.avif', focus: '72% center' },
  'chicken-sun': { heroImage: '/media/residents/chicken/hero.webp', focus: '71% center' },
  'rocking-horse': { heroImage: '/media/residents/rocking-horse/hero.avif', focus: '71% center' },
  'sirin': { heroImage: '/media/residents/sirin/cinematic.avif', focus: '66% center', mobileFocus: '60% center' },
  'mermaid': { heroImage: '/media/residents/mermaid/hero.webp', focus: '72% center', hideUntilFinished: true },
  'little-humpbacked-horse': { heroImage: '/media/residents/horse/cinematic.avif', focus: '71% center' }
};

const collectionRepresentative = {
  'Зимние легенды': 'nutcracker-ernst',
  'Тайны древнего леса': 'forest-dragon',
  'Древние существа': 'azimondias',
  'Русские сказки': 'sirin',
  'Домашние легенды': 'rocking-horse'
};

function applyWorldOverrides(data) {
  data.residents = data.residents.map((resident) => {
    const override = worldImageOverrides[resident.id] || worldImageOverrides[resident.slug];
    return override ? { ...resident, ...override, gallery: [override.heroImage] } : resident;
  });
  return data;
}
function statusClass(status) { return { available:'status--available','in-progress':'status--in-progress',reserved:'status--reserved',archive:'status--archive' }[status] || ''; }
function statusText(status) { return { available:'Можно приобрести','in-progress':'В работе',reserved:'Уже выбрали',archive:'Нашёл Хранителя' }[status] || 'Хроника Мастерской'; }
function residentLookup(data) {
  const map = new Map();
  data.residents.forEach((resident) => [resident.id,resident.slug,resident.name,resident.shortName].filter(Boolean).forEach((key) => map.set(normalize(key), resident)));
  return map;
}
function chooseImage(resident) { return mediaUrl(mobileQuery.matches && resident.mobileImage ? resident.mobileImage : resident.heroImage); }
function setResidentImage(image,resident) {
  if (!image || !resident) return;
  image.dataset.desktopSrc = mediaUrl(resident.heroImage);
  image.dataset.mobileSrc = mediaUrl(resident.mobileImage || resident.heroImage);
  image.src = chooseImage(resident);
  image.style.setProperty('--resident-focus', resident.focus || '72% center');
  image.style.setProperty('--resident-focus-mobile', resident.mobileFocus || resident.focus || '72% center');
  image.decoding = 'async';
}
function upgradeCards(data,lookup) {
  document.querySelectorAll('.resident-card').forEach((card) => {
    const resident = lookup.get(normalize(card.querySelector('h3')?.textContent));
    if (!resident) return;
    if (resident.hideUntilFinished) { card.hidden = true; return; }
    card.dataset.resident = resident.id;
    card.style.setProperty('--resident-focus',resident.focus || '72% center');
    card.style.setProperty('--resident-focus-mobile',resident.mobileFocus || resident.focus || '72% center');
    setResidentImage(card.querySelector('.resident-card__image img'),resident);
    const badge=card.querySelector('.status');
    if (badge) { badge.className=`status ${statusClass(resident.availability)}`; badge.textContent=statusText(resident.availability); }
  });
  document.querySelectorAll('.world-resident').forEach((slide) => {
    const resident=lookup.get(normalize(slide.querySelector('h2')?.textContent));
    if (!resident) return;
    if (resident.hideUntilFinished) { slide.hidden=true; return; }
    slide.dataset.resident=resident.id;
    slide.style.setProperty('--resident-focus',resident.focus || '72% center');
    setResidentImage(slide.querySelector('.world-resident__photo img'),resident);
  });
  document.querySelectorAll('.world-slider__rail button').forEach((button) => {
    const resident=lookup.get(normalize(button.querySelector('span')?.textContent));
    if (resident?.hideUntilFinished) { button.hidden=true; return; }
    if (resident) setResidentImage(button.querySelector('img'),resident);
  });
}
function upgradeChronicle(data,lookup) {
  if (pageName!=='chronicle') return;
  const key=new URLSearchParams(window.location.search).get('resident');
  const resident=lookup.get(normalize(key)) || data.residents[0];
  if (!resident) return;
  const hero=document.querySelector('.chronicle-hero'); const scene=hero?.querySelector('.chronicle-hero__scene'); const shell=hero?.querySelector('.shell');
  if (!hero || !scene || !shell) return;
  hero.dataset.resident=resident.id;
  hero.style.setProperty('--hero-focus',resident.focus || '72% center');
  hero.style.setProperty('--hero-focus-mobile',resident.mobileFocus || resident.focus || '72% center');
  setResidentImage(scene,resident); scene.alt=`${resident.name} в своём мире`; scene.fetchPriority='high'; scene.loading='eager';
  if (!shell.querySelector('.chronicle-hero__status')) { const badge=document.createElement('span'); badge.className=`status ${statusClass(resident.availability)} chronicle-hero__status`; badge.textContent=statusText(resident.availability); shell.prepend(badge); }
  const actions=document.querySelector('.resident-detail__copy .cluster');
  if (actions && !shell.querySelector('.chronicle-hero__actions')) { const clone=actions.cloneNode(true); clone.classList.add('chronicle-hero__actions'); shell.append(clone); }
  document.querySelectorAll('.resident-detail,.gallery').forEach((section)=>{ section.style.setProperty('--resident-focus',resident.focus || '72% center'); section.style.setProperty('--resident-focus-mobile',resident.mobileFocus || resident.focus || '72% center'); });
  document.querySelectorAll('.resident-detail__image img,.gallery img').forEach((image)=>setResidentImage(image,resident));
}
function replaceGenericResidentImages(data,lookup) { const forest=lookup.get('forest-dragon'); document.querySelectorAll('.manifesto-portrait img,.about-image img').forEach((image)=>setResidentImage(image,forest)); }
function upgradeCollectionCards(lookup) { document.querySelectorAll('.world-chapter').forEach((chapter)=>{ const name=chapter.querySelector('.world-chapter__copy h3')?.textContent?.trim(); const resident=lookup.get(normalize(collectionRepresentative[name])); if (resident) setResidentImage(chapter.querySelector('.world-chapter__resident img'),resident); }); }
function refreshResponsiveImages() { document.querySelectorAll('img[data-desktop-src]').forEach((image)=>{ image.src=mobileQuery.matches ? image.dataset.mobileSrc : image.dataset.desktopSrc; }); }
async function runUpgrade() {
  const response=await fetch(contentUrl,{cache:'no-store'}); if (!response.ok) return;
  const data=applyWorldOverrides(await response.json()); const lookup=residentLookup(data);
  const apply=()=>{ if (!document.querySelector('#app main')) return false; upgradeCards(data,lookup); upgradeChronicle(data,lookup); replaceGenericResidentImages(data,lookup); upgradeCollectionCards(lookup); refreshResponsiveImages(); document.documentElement.classList.add('resident-worlds-ready'); return true; };
  if (!apply()) { const observer=new MutationObserver(()=>{ if (apply()) observer.disconnect(); }); observer.observe(document.querySelector('#app'),{childList:true,subtree:true}); }
  mobileQuery.addEventListener?.('change',refreshResponsiveImages);
}
runUpgrade().catch(()=>{});

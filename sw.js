// SkillHUB Assistant - Service Worker (offline-first)
// ВАЖЛИВО: при кожному релізі міняйте VERSION - тоді всі пристрої підтягнуть нові файли.
const VERSION = 'v5-img';
const SHELL_CACHE = 'skillhub-shell-' + VERSION;   // "оболонка": сторінки, іконки, бібліотеки
const RUNTIME_CACHE = 'skillhub-runtime-v1';       // шрифти, картинки досягнень та інше, що завантажується під час роботи

const SHELL = [
  "./",
  "./index.html",
  "./Education.html",
  "./Simulator.html",
  "./manifest.json",
  "./Achievement/1.webp",
  "./Achievement/2.webp",
  "./Achievement/3.webp",
  "./Achievement/4.webp",
  "./Achievement/5.webp",
  "./Achievement/6.webp",
  "./Achievement/7.webp",
  "./Achievement/8.webp",
  "./Achievement/9.webp",
  "./Achievement/10.webp",
  "./Achievement/11.webp",
  "./Achievement/17.webp",
  "./icon-192.png",
  "./icon-512.png",
  "./lib/chart.umd.js",
  "./education/Achievement.svg",
  "./education/Course.svg",
  "./education/Education.svg",
  "./education/Enroll%20in%20a%20course.svg",
  "./education/Exit.svg",
  "./education/Meet.svg",
  "./education/My%20statistic.svg",
  "./education/Statistic.svg",
  "./education/Test.svg",
  "./education/Time.svg",
  "./education/Update.svg",
  "./education/filters.svg",
  "./education/info.svg",
  "./education/save.svg",
  "./icons_skillHUB/Check.svg",
  "./icons_skillHUB/Discount.svg",
  "./icons_skillHUB/Favorite.svg",
  "./icons_skillHUB/Klochkivska.svg",
  "./icons_skillHUB/SkillHUB.svg",
  "./icons_skillHUB/Smart.svg",
  "./icons_skillHUB/add.svg",
  "./icons_skillHUB/aim.svg",
  "./icons_skillHUB/analytics.svg",
  "./icons_skillHUB/calculator.svg",
  "./icons_skillHUB/change.svg",
  "./icons_skillHUB/chat.svg",
  "./icons_skillHUB/check-mark.svg",
  "./icons_skillHUB/conditioning.svg",
  "./icons_skillHUB/discounting.svg",
  "./icons_skillHUB/education.svg",
  "./icons_skillHUB/education1.svg",
  "./icons_skillHUB/exchange.svg",
  "./icons_skillHUB/information.svg",
  "./icons_skillHUB/install.svg",
  "./icons_skillHUB/password-protection.svg",
  "./icons_skillHUB/puzzle.svg",
  "./icons_skillHUB/rating.svg",
  "./icons_skillHUB/refresh-time.svg",
  "./icons_skillHUB/rozetka-image.svg",
  "./icons_skillHUB/settings.svg",
  "./icons_skillHUB/shuffle.svg",
  "./icons_skillHUB/statistics.svg",
  "./icons_skillHUB/test.svg",
  "./icons_skillHUB/website.svg",
  "./Client.svg",
  "./Rezerv.svg",
  "./bulb.svg",
  "./chat.svg",
  "./conditioning.svg",
  "./edu.svg",
  "./education.svg",
  "./medal.svg",
  "./rozetka.svg",
  "./search.svg",
  "./settings.svg",
  "./ukraine.svg"
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // кожен файл окремо: один відсутній файл не ламає встановлення
    await Promise.all(SHELL.map(async (url) => {
      try { await cache.add(new Request(url, { cache: 'reload' })); }
      catch (e) { console.warn('SW: не вдалося закешувати', url, e); }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => {
      const oldShell = (k.startsWith('skillhub-shell-') && k !== SHELL_CACHE) || k.startsWith('skillhub-test-cache');
      return oldShell ? caches.delete(k) : null;
    }));
    await self.clients.claim();
  })());
});

function isCacheable(res) {
  return res && (res.status === 200 || res.type === 'opaque');
}

// сторінки: спершу мережа (щоб бачити оновлення), але не довше 3 с - далі кеш
async function networkFirstWithTimeout(request, timeoutMs) {
  const cache = await caches.open(SHELL_CACHE);
  const fromCache = () => cache.match(request, { ignoreSearch: true });
  try {
    const res = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
    ]);
    if (isCacheable(res)) cache.put(request, res.clone());
    return res;
  } catch (e) {
    return (await fromCache()) || (await cache.match('./index.html')) || Response.error();
  }
}

// решта: миттєво з кешу, а в фоні оновлюємо
async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL_CACHE);
  const runtime = await caches.open(RUNTIME_CACHE);
  const cached = (await cache.match(request)) || (await runtime.match(request));
  const network = fetch(request).then((res) => {
    if (isCacheable(res)) runtime.put(request, res.clone());
    return res;
  }).catch(() => null);
  if (cached) { network.catch(() => {}); return cached; }
  return (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;                              // POST (збереження результатів) - напряму
  if (req.headers.has('range')) return;                          // відео/аудіо
  const url = new URL(req.url);
  if (url.hostname === 'script.google.com' || url.hostname === 'script.googleusercontent.com') return; // API: кешує сам застосунок (IndexedDB)

  if (req.mode === 'navigate') {
    event.respondWith(networkFirstWithTimeout(req, 3000));
    return;
  }
  event.respondWith(staleWhileRevalidate(req));
});

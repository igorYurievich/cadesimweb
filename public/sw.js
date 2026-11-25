/*
 * Service worker Web Cade (PWA): программа работает без интернета и открывается мгновенно.
 * - При установке скачиваются все файлы сборки (PRECACHE): основной файл, языки, примеры, ПЛК / GRAFCET /
 *   лифт, экспорт — всё, что программа подгружает по запросу, есть и без сети.
 * - Страница (навигация): сначала сеть — чтобы сразу видеть новую версию; без сети — из кэша.
 * - Файлы сборки с хешем в имени (assets/…) не меняются: из кэша, а при промахе — из сети.
 * - Остальные файлы своего сайта (иконки, манифест): из кэша, а в фоне — обновление из сети.
 *
 * BUILD_ID и PRECACHE подставляет сборка (tools/sw-precache.ts): у каждой версии свой кэш webcade-<BUILD_ID>.
 * При активации новой версии кэши старых версий удаляются (остаётся только предыдущий — для вкладок,
 * открытых до обновления, им ещё могут понадобиться их файлы). Раньше кэш был один на все версии
 * («webcade-v1») и копил файлы всех сборок без очистки.
 */
const BUILD_ID = 'dev';
const PRECACHE = [];
const CACHE_PREFIX = 'webcade-';
const CACHE = `${CACHE_PREFIX}${BUILD_ID}`;
const LEGACY_CACHE = 'webcade-v1';
const SHELL = ['./', './manifest.webmanifest', './pwa/icon-192.png', './pwa/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll([...new Set([...SHELL, ...PRECACHE])]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        // Порядок ключей — порядок создания кэшей: последний из старых — предыдущая версия, её оставляем.
        // Прежний общий кэш «webcade-v1» удаляем сразу: старая версия была одним файлом, ей он не нужен.
        const old = keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE && key !== LEGACY_CACHE);
        const remove = [...old.slice(0, -1), ...keys.filter((key) => key === LEGACY_CACHE)];
        return Promise.all(remove.map((key) => caches.delete(key)));
      })
      .then(() => self.clients.claim()),
  );
});

const isHashedAsset = (url) => /\/assets\/[^/]+-[\w-]{8,}\.\w+$/.test(url.pathname);

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          if (response.ok) caches.open(CACHE).then((cache) => cache.put('./', copy));
          return response;
        })
        .catch(() => caches.match('./', { ignoreVary: true })),
    );
    return;
  }

  event.respondWith(
    // ignoreVary: сервер может отвечать «Vary: Origin», а модули (import()) запрашиваются с заголовком Origin,
    // которого не было при скачивании в install — без этого офлайн их бы не нашёл.
    caches.match(request, { ignoreVary: true }).then((cached) => {
      if (cached && isHashedAsset(url)) return cached;
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached ?? Response.error());
      return cached ?? network;
    }),
  );
});

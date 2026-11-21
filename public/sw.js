/*
 * Service worker Web Cade (PWA): программа работает без интернета и открывается мгновенно.
 * - Страница (навигация): сначала сеть — чтобы сразу видеть новую версию; без сети — из кэша.
 * - Остальные файлы своего сайта (JS, CSS, иконки, примеры): из кэша, а в фоне — обновление из сети.
 * Новая версия программы подхватывается при следующем запуске. CACHE меняют только при смене этой логики.
 */
const CACHE = 'webcade-v1';
const SHELL = ['./', './manifest.webmanifest', './pwa/icon-192.png', './pwa/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

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
          caches.open(CACHE).then((cache) => cache.put('./', copy));
          return response;
        })
        .catch(() => caches.match('./')),
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached ?? network;
    }),
  );
});

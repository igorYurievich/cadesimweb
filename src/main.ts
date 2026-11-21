import { mountApp } from '@ui/app';

const root = document.getElementById('app');
if (!root) throw new Error('#app not found');
mountApp(root);

// PWA: service worker (public/sw.js) — установка как приложение и работа без интернета.
// Только в собранной версии: в `npm run dev` кэш мешал бы мгновенным обновлениям Vite.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => { /* Без PWA программа работает как обычно. */ });
  });
}

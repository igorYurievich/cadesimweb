import { mountApp } from '@ui/app';
import { loadInterfaceText } from '@ui/i18n';
import { readInterfaceLanguage } from '@ui/settings';
import { preloadAllFeatures } from '@ui/features/loader';

const root = document.getElementById('app');
if (!root) throw new Error('#app not found');
const appRoot: HTMLElement = root;

// Тексты интерфейса — отдельные куски сборки: перед запуском скачиваем только сохранённый язык.
// Если не вышло (нет сети и кэша), пробуем испанский — он нужен как запасной вариант.
loadInterfaceText(readInterfaceLanguage())
  .catch(() => loadInterfaceText('es'))
  .then(() => {
    mountApp(appRoot);
    // ПЛК / GRAFCET / лифт / редкие 2D-устройства докачиваются в фоне, когда программа уже на экране.
    preloadAllFeatures();
  });

// PWA: service worker (public/sw.js) — установка как приложение и работа без интернета.
// Только в собранной версии: в `npm run dev` кэш мешал бы мгновенным обновлениям Vite.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => { /* Без PWA программа работает как обычно. */ });
  });
}

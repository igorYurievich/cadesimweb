/**
 * Тексты интерфейса на пяти языках. Каждый язык — отдельный кусок сборки: на старте скачивается
 * только выбранный (main.ts ждёт его перед запуском программы), остальные — при переключении языка.
 * Сохранённый в localStorage язык (INTERFACE_LANGUAGE_KEY) читается как раньше; неизвестный код
 * (например, 'ar' от старой версии) — испанский.
 */
import type ru from './ru';
import { loadCatalogTranslations } from '@model/catalog';

/** Ключи словаря задаёт ru.ts; остальные языки объявлены через `satisfies InterfaceText`, поэтому
 * TypeScript ругается и на недостающий, и на лишний ключ в любом языке. */
export type TextKey = keyof typeof ru;
export type InterfaceText = Readonly<Record<TextKey, string>>;
export type InterfaceLang = 'es' | 'en' | 'it' | 'ru' | 'fr';

type LangModule = { default: InterfaceText };
const LOADERS: Readonly<Record<InterfaceLang, () => Promise<LangModule>>> = {
  es: () => import('./es'),
  en: () => import('./en'),
  it: () => import('./it'),
  ru: () => import('./ru'),
  fr: () => import('./fr'),
};

const loaded = new Map<InterfaceLang, InterfaceText>();
let activeLang: InterfaceLang = 'es';

export function isInterfaceLang(value: string): value is InterfaceLang {
  return Object.prototype.hasOwnProperty.call(LOADERS, value);
}

/** Скачать тексты языка (повторный вызов — мгновенно, из памяти). Неизвестный код — испанский. */
export async function loadInterfaceText(lang: string): Promise<InterfaceText> {
  const key: InterfaceLang = isInterfaceLang(lang) ? lang : 'es';
  const ready = loaded.get(key);
  if (ready) return ready;
  // Для ru / fr заодно скачиваем автопереводы названий элементов палитры.
  const [module] = await Promise.all([LOADERS[key](), loadCatalogTranslations(key)]);
  loaded.set(key, module.default);
  return module.default;
}

/**
 * Тексты уже скачанного языка — синхронно, для отрисовки. Если язык ещё качается,
 * временно отдаём любой уже скачанный (испанский, если он есть), чтобы интерфейс не падал.
 */
export function interfaceText(lang: string): InterfaceText {
  const key = isInterfaceLang(lang) ? lang : 'es';
  const text = loaded.get(key) ?? loaded.get('es') ?? loaded.values().next().value;
  if (!text) throw new Error(`Тексты интерфейса (${lang}) ещё не загружены: вызовите loadInterfaceText`);
  return text;
}

/** Язык интерфейса, выбранный сейчас (app-setup-base меняет его вместе с выбором в меню «Язык»). */
export function setActiveInterfaceLang(lang: string): void {
  activeLang = isInterfaceLang(lang) ? lang : 'es';
}

/** Тексты выбранного сейчас языка: для сообщений в строке состояния и подсказок без своих зависимостей. */
export function currentText(): InterfaceText {
  return interfaceText(activeLang);
}

/** Подставить значения в шаблон словаря: «Добавлен {name}» + { name: 'KM1' } → «Добавлен KM1». */
export function fillText(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in values ? String(values[name]) : whole));
}

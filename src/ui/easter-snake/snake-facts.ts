/**
 * Факты об ПЛК и асинхронных двигателях для таблички «Короткое замыкание» (после каждого проигрыша).
 * Каждый язык — отдельный маленький кусок сборки (i18n/snake-facts/*.ts), скачивается при первом проигрыше.
 */
import type { InterfaceLang } from '../i18n';
import type { Random } from './snake-logic';

type FactsModule = { default: readonly string[] };
const LOADERS: Readonly<Record<InterfaceLang, () => Promise<FactsModule>>> = {
  es: () => import('../i18n/snake-facts/es'),
  en: () => import('../i18n/snake-facts/en'),
  it: () => import('../i18n/snake-facts/it'),
  ru: () => import('../i18n/snake-facts/ru'),
  fr: () => import('../i18n/snake-facts/fr'),
};

export async function loadSnakeFacts(lang: InterfaceLang): Promise<readonly string[]> {
  return (await LOADERS[lang]()).default;
}

/** Номер случайного факта, не равный предыдущему (чтобы один и тот же не выпадал два раза подряд). */
export function pickFactIndex(count: number, previous: number | undefined, random: Random = Math.random): number {
  if (count <= 1) return 0;
  const skip = previous !== undefined && previous >= 0 && previous < count;
  const index = Math.min(count - (skip ? 2 : 1), Math.floor(random() * (skip ? count - 1 : count)));
  return skip && index >= previous ? index + 1 : index;
}

/**
 * Отдельно загружаемые части программы: ПЛК, GRAFCET, лифт и редкие 2D-устройства. Их символы, анимация
 * в симуляции, поля свойств и сообщения диагностики лежат в своих кусках сборки и не входят в стартовую загрузку.
 *
 * Кусок скачивается, как только на листе (или в предпросмотре вставки) появляется его элемент:
 * пока он качается, элемент рисуется рамкой-заглушкой, а после загрузки схема перерисовывается
 * (onFeatureLoaded). Через пару секунд после запуска все куски докачиваются в фоне
 * (preloadAllFeatures), чтобы потом работать мгновенно и без сети. Движок симуляции ПЛК / GRAFCET /
 * лифта остаётся в основной сборке: он вплетён в цикл реле (engine/relay-loop.ts).
 */
import type { EngineState } from '@engine/types';
import type { Schema, SchemaElement } from '@model/types';
import type { InterfaceText } from '../i18n';
import type { SimulationState } from '../simulation/types';
import type { DetectorFieldDeps } from '../detector-properties';
import { featureOfType, type FeatureKey } from './feature-codes';

export { featureOfType, type FeatureKey };

export interface FeatureHooks {
  /** Подсветка элемента в симуляции (вызывается для каждого элемента в каждом кадре). */
  applyVisuals?(
    state: SimulationState, element: SchemaElement, node: SVGGElement, schema: Schema, text: InterfaceText,
  ): void;
  /** Сообщения об аварии в окне симуляции. */
  faultMessages?(schema: Schema, result: EngineState, text: InterfaceText): string[];
  /** Предупреждения в строке состояния симуляции. */
  warnings?(schema: Schema, result: EngineState, text: InterfaceText): string[];
  /** Свои поля свойств вместо стандартных (GRAFCET). true — поля добавлены, стандартные не нужны. */
  replaceProperties?(schema: Schema, element: SchemaElement, deps: DetectorFieldDeps): boolean;
  /** Дополнительные поля свойств элемента (лифт, ПЛК). */
  appendProperties?(schema: Schema, element: SchemaElement, deps: DetectorFieldDeps): void;
}

type FeatureModule = { hooks: FeatureHooks };

const LOADERS: Readonly<Record<FeatureKey, () => Promise<FeatureModule>>> = {
  plc: () => import('./plc-feature'),
  grafcet: () => import('./grafcet-feature'),
  lift: () => import('./lift-feature'),
  devices2d: () => import('./devices-2d-feature'),
};

const loaded = new Map<FeatureKey, FeatureHooks>();
const pending = new Map<FeatureKey, Promise<void>>();
const listeners = new Set<(key: FeatureKey) => void>();

/** Хуки уже скачанных частей. */
export function loadedFeatureHooks(): IterableIterator<FeatureHooks> {
  return loaded.values();
}

/** Сообщения об авариях от скачанных частей (лифт). */
export function featureFaultMessages(schema: Schema, result: EngineState, text: InterfaceText): string[] {
  return [...loaded.values()].flatMap((hooks) => hooks.faultMessages?.(schema, result, text) ?? []);
}

/** Предупреждения от скачанных частей (лифт). */
export function featureWarnings(schema: Schema, result: EngineState, text: InterfaceText): string[] {
  return [...loaded.values()].flatMap((hooks) => hooks.warnings?.(schema, result, text) ?? []);
}

export function isFeatureLoaded(key: FeatureKey): boolean {
  return loaded.has(key);
}

/** Скачать часть программы (повторный вызов возвращает тот же промис). */
export function loadFeature(key: FeatureKey): Promise<void> {
  const running = pending.get(key);
  if (running) return running;
  const task = LOADERS[key]().then((module) => {
    loaded.set(key, module.hooks);
    for (const listener of listeners) listener(key);
  });
  // Без сети кусок не скачался: даём попробовать снова при следующей отрисовке.
  task.catch(() => pending.delete(key));
  pending.set(key, task);
  return task;
}

/** Элемент из незагруженной части: начать загрузку. true — символ пока нужно рисовать заглушкой. */
export function requestFeatureForType(typeCode: number): boolean {
  const key = featureOfType(typeCode);
  if (!key || loaded.has(key)) return false;
  loadFeature(key).catch(() => undefined);
  return true;
}

/** Скачать все части, нужные элементам схемы. */
export function ensureSchemaFeatures(schema: Schema): Promise<void> {
  const keys = new Set<FeatureKey>();
  for (const element of schema.elements) {
    const key = featureOfType(element.typeCode);
    if (key && !loaded.has(key)) keys.add(key);
  }
  return Promise.all([...keys].map(loadFeature)).then(() => undefined);
}

/** Подписка: часть программы скачана (например, чтобы перерисовать схему). */
export function onFeatureLoaded(listener: (key: FeatureKey) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Фоновая докачка всех частей после запуска: дальше всё работает мгновенно и офлайн. */
export function preloadAllFeatures(delayMs = 2000): void {
  if (typeof window === 'undefined') return;
  const start = (): void => {
    for (const key of Object.keys(LOADERS) as FeatureKey[]) loadFeature(key).catch(() => undefined);
  };
  window.setTimeout(() => {
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    if (idle) idle(start); else start();
  }, delayMs);
}

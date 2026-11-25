/**
 * Каталог элементов CADe_SIMU 4.2.
 *
 * Источник данных: src/data/components.json (извлечён из exe оригинала).
 * Ключ элемента: числовой код команды MFC (`id`). Это НЕ тот же код, что
 * хранится в файлах .cad (там, например, 9000 = катушка): соответствие
 * команда -> тип в .cad устанавливается на шаге 4 (парсер .cad).
 */

import rawCatalog from '../data/components.json';

export type Lang = 'es' | 'en' | 'it' | 'ru' | 'fr';

/** Версия продукта, в которую входит элемент. */
export type Release = 'v1' | 'v2';

export type GroupKey =
  | 'power-sources'
  | 'fuses'
  | 'protection'
  | 'contactors'
  | 'motors'
  | 'power-electronics'
  | 'aux-contacts'
  | 'manual-controls'
  | 'mechanisms'
  | 'installations'
  | 'sensors'
  | 'coils-signaling'
  | 'electronic-relays'
  | 'logic'
  | 'ladder'
  | 'grafcet'
  | 'io-plc'
  | 'pneumatics'
  | 'wiring'
  | 'realistic-2d'
  | 'realistic-3d';

/** Строка из components.json: [commandId, es, en, it, ru]. */
export type RawRow = [number, string | null, string | null, string | null, (string | null)?];

export interface RawGroup {
  name: string;
  toolbar: number;
  items: RawRow[];
}

export interface RawCatalog {
  groups: RawGroup[];
}

export type Names = Record<Lang, string | null>;

export interface ComponentGroup {
  key: GroupKey;
  /** Название группы на испанском, как в оригинале. */
  name: string;
  /** Код панели инструментов в оригинале. */
  toolbar: number;
  /** Версия по умолчанию для элементов группы. */
  release: Release;
  /** Id элементов в порядке панели оригинала. */
  componentIds: number[];
}

export interface ComponentDef {
  /** Код команды MFC. */
  id: number;
  names: Names;
  /** Группы, где элемент встречается (первая = основная). */
  groups: GroupKey[];
  release: Release;
}

/**
 * Группы в порядке, в котором они идут в оригинале.
 * Названия групп из данных сопоставляются по префиксу.
 *
 * Версии: Ladder и Lógica во второй версии (подтверждено автором).
 * Остальное по умолчанию: GRAFCET, PLC/IO и «реалистичные» символы во второй,
 * пневматика во второй (решение автором не подтверждено).
 */
const GROUP_DEFS: ReadonlyArray<{ prefix: string; key: GroupKey; release: Release }> = [
  { prefix: 'Alimentaciones y fuentes', key: 'power-sources', release: 'v1' },
  { prefix: 'Fusibles y seccionadores', key: 'fuses', release: 'v1' },
  { prefix: 'Automáticos, diferenciales', key: 'protection', release: 'v1' },
  { prefix: 'Contactores e interruptores', key: 'contactors', release: 'v1' },
  { prefix: 'Motores', key: 'motors', release: 'v1' },
  { prefix: 'Potencia:', key: 'power-electronics', release: 'v2' },
  { prefix: 'Contactos auxiliares', key: 'aux-contacts', release: 'v1' },
  { prefix: 'Accionamientos', key: 'manual-controls', release: 'v1' },
  { prefix: 'Mecanismos', key: 'mechanisms', release: 'v1' },
  { prefix: 'Instalaciones', key: 'installations', release: 'v1' },
  { prefix: 'Detectores', key: 'sensors', release: 'v1' },
  { prefix: 'Bobinas, temporizadores', key: 'coils-signaling', release: 'v1' },
  { prefix: 'Relés electrónicos', key: 'electronic-relays', release: 'v1' },
  { prefix: 'Lógica', key: 'logic', release: 'v2' },
  { prefix: 'Ladder', key: 'ladder', release: 'v2' },
  { prefix: 'GRAFCET', key: 'grafcet', release: 'v2' },
  { prefix: 'Entrada/Salida', key: 'io-plc', release: 'v2' },
  { prefix: 'Actuadores neumáticos', key: 'pneumatics', release: 'v2' },
  { prefix: 'Cables y conexiones', key: 'wiring', release: 'v1' },
  { prefix: 'Símbolos realistas — barra A', key: 'realistic-2d', release: 'v2' },
  { prefix: 'Símbolos realistas — barra B', key: 'realistic-3d', release: 'v2' },
];

/**
 * Исключения из версии группы (по коду команды).
 * Основание: modelo_circuito_y_elementos.md (раздел 11.4: частотники,
 * электронные пускатели, регуляторы DC и шаговые двигатели во второй очереди;
 * резисторы и автотрансформатор моделируются как проводящие рёбра в первой).
 */
const RELEASE_OVERRIDES: Readonly<Record<number, Release>> = {
  33002: 'v1', // Resistencia I
  33003: 'v1', // Resistencia III
  33004: 'v1', // Autotransformador III
  33295: 'v2', // Motor paso a paso unipolar
  33296: 'v2', // Motor paso a paso bipolar
  33257: 'v2', // Actuador lineal eléctrico
};

export interface Catalog {
  readonly groups: readonly ComponentGroup[];
  readonly components: readonly ComponentDef[];
  /** Количество кнопок в панелях оригинала (с повторами между панелями). */
  readonly slotCount: number;
  getById(id: number): ComponentDef | undefined;
  getGroup(key: GroupKey): ComponentGroup | undefined;
  /** Элементы группы в порядке панели оригинала. */
  inGroup(key: GroupKey): ComponentDef[];
  /** Элементы заданной версии продукта. */
  byRelease(release: Release): ComponentDef[];
  /** Название с запасными языками: lang -> es -> en -> it -> id. */
  label(def: ComponentDef, lang?: Lang): string;
  /** Поиск по названиям на всех языках без учёта регистра и диакритики. */
  search(query: string): ComponentDef[];
  /** Дописать названия fr (словарь catalog-localization.ts скачивается отдельно). */
  applyTranslations(translate: (source: string, lang: 'fr') => string): void;
  /** Дописать автоперевод на русский (catalog-localization-ru.ts скачивается отдельно). */
  applyRussian(translate: (source: string, id: number) => string): void;
}

const FALLBACK: readonly Lang[] = ['es', 'en', 'it'];


export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildCatalog(raw: RawCatalog): Catalog {
  const groups: ComponentGroup[] = [];
  const byId = new Map<number, ComponentDef>();
  let slotCount = 0;
  // Исходное название (es → en → it) для перевода на fr: словарь подключается позже (applyTranslations).
  const translationSources = new Map<number, string>();
  // Без русского названия в данных: автоперевод с этого текста (catalog-localization-ru.ts).
  const ruSources = new Map<number, string>();

  for (const rg of raw.groups) {
    const def = GROUP_DEFS.find((d) => rg.name.startsWith(d.prefix));
    if (!def) throw new Error(`Unknown component group in data: "${rg.name}"`);

    const group: ComponentGroup = {
      key: def.key,
      name: rg.name,
      toolbar: rg.toolbar,
      release: def.release,
      componentIds: [],
    };

    for (const [id, es, en, it, ru] of rg.items) {
      slotCount += 1;
      group.componentIds.push(id);

      const existing = byId.get(id);
      if (existing) {
        // Один и тот же код команды в нескольких панелях: объединяем.
        if (!existing.groups.includes(def.key)) existing.groups.push(def.key);
        // Дозаполняем перевод, если в первой панели его не было.
        if (existing.names.es === null && es !== null) existing.names.es = es;
        if (existing.names.en === null && en !== null) existing.names.en = en;
        if (existing.names.it === null && it !== null) existing.names.it = it;
        if (!existing.names.ru && !ruSources.has(id)) {
          if (ru) existing.names.ru = ru; else ruSources.set(id, es ?? en ?? it ?? '');
        }
        const sourceName = (es?.trim() ? es : en ?? it) ?? '';
        if (!translationSources.has(id) && sourceName) translationSources.set(id, sourceName);
        continue;
      }
      const sourceName = (es?.trim() ? es : en ?? it) ?? '';
      if (sourceName) translationSources.set(id, sourceName);
      if (ru == null) ruSources.set(id, sourceName);
      byId.set(id, {
        id, names: { es, en, it, ru: ru ?? null, fr: null }, groups: [def.key], release: 'v2',
      });
    }
    groups.push(group);
  }

  // Версия элемента: v1, если хотя бы одна его группа v1; затем исключения.
  const groupByKey = new Map(groups.map((g) => [g.key, g]));
  for (const c of byId.values()) {
    const inV1 = c.groups.some((k) => groupByKey.get(k)?.release === 'v1');
    c.release = RELEASE_OVERRIDES[c.id] ?? (inV1 ? 'v1' : 'v2');
  }

  const components = [...byId.values()];

  const label = (def: ComponentDef, lang: Lang = 'es'): string => {
    for (const l of [lang, ...FALLBACK]) {
      const v = def.names[l];
      if (typeof v === 'string' && v.trim() !== '') return v;
    }
    return String(def.id);
  };

  return {
    groups,
    components,
    slotCount,
    getById: (id) => byId.get(id),
    getGroup: (key) => groupByKey.get(key),
    inGroup: (key) => {
      const g = groupByKey.get(key);
      if (!g) return [];
      const seen = new Set<number>();
      const out: ComponentDef[] = [];
      for (const id of g.componentIds) {
        const c = byId.get(id);
        if (c && !seen.has(id)) {
          seen.add(id);
          out.push(c);
        }
      }
      return out;
    },
    byRelease: (release) => components.filter((c) => c.release === release),
    label,
    search: (query) => {
      const q = normalizeText(query);
      if (q === '') return [];
      return components.filter((c) =>
        (Object.keys(c.names) as Lang[]).some((l) => {
          const n = c.names[l];
          return n !== null && normalizeText(n).includes(q);
        }),
      );
    },
    applyRussian: (translate) => {
      for (const [id, source] of ruSources) {
        const names = byId.get(id)?.names;
        if (names && !names.ru) names.ru = translate(source, id);
      }
    },
    applyTranslations: (translate) => {
      for (const [id, source] of translationSources) {
        const names = byId.get(id)?.names;
        if (!names) continue;
        names.fr ??= translate(source, 'fr');
      }
    },
  };
}

/** Каталог, собранный из встроенных данных. */
export const catalog: Catalog = buildCatalog(rawCatalog as unknown as RawCatalog);

const catalogTranslations = new Map<'ru' | 'fr', Promise<void>>();

/**
 * Автопереводы названий элементов: на fr (catalog-localization.ts) и на русский для элементов без
 * русского названия в данных (catalog-localization-ru.ts). Это отдельные куски сборки: скачиваются вместе
 * с интерфейсом на этом языке (ui/i18n). До этого — испанские названия. Другие языки — сразу готово.
 */
export function loadCatalogTranslations(lang: Lang): Promise<void> {
  if (lang !== 'ru' && lang !== 'fr') return Promise.resolve();
  const key = lang;
  let task = catalogTranslations.get(key);
  if (!task) {
    task = key === 'ru'
      ? import('./catalog-localization-ru').then((module) => catalog.applyRussian(module.translateRussian))
      : import('./catalog-localization').then((module) => catalog.applyTranslations(module.translateCatalogName));
    task.catch(() => catalogTranslations.delete(key));
    catalogTranslations.set(key, task);
  }
  return task;
}

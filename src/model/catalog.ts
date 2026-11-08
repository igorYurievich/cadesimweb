/**
 * Каталог элементов CADe_SIMU 4.2.
 *
 * Источник данных: src/data/components.json (извлечён из exe оригинала).
 * Ключ элемента: числовой код команды MFC (`id`). Это НЕ тот же код, что
 * хранится в файлах .cad (там, например, 9000 = катушка): соответствие
 * команда -> тип в .cad устанавливается на шаге 4 (парсер .cad).
 */

import rawCatalog from '../data/components.json';
import { translateCatalogName } from './catalog-localization';

export type Lang = 'es' | 'en' | 'it' | 'ru' | 'fr' | 'ar';

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
}

const FALLBACK: readonly Lang[] = ['es', 'en', 'it'];

const RU_PHRASES: ReadonlyArray<readonly [string, string]> = [
  ['Proteccion contra sobretensiones permanentes', 'Защита от постоянных перенапряжений'],
  ['Protección contra sobretensiones permanentes', 'Защита от постоянных перенапряжений'],
  ['Contactor de estado sólido', 'Твердотельный контактор'],
  ['Contactor inversor de estado sólido', 'Реверсивный твердотельный контактор'],
  ['Relé de falta de fase', 'Реле контроля наличия фаз'],
  ['Relé de secuencia de fase', 'Реле контроля чередования фаз'],
  ['Relé estado sólido SSR DC', 'Твердотельное реле постоянного тока SSR'],
  ['Relé estado sólido SSR AC', 'Твердотельное реле переменного тока SSR'],
  ['Interruptor automático', 'Автоматический выключатель'],
  ['Interruptor diferencial', 'Устройство защитного отключения'],
  ['Limitador sobretensiones', 'Ограничитель перенапряжения'],
  ['Motor trifásico como monofásico', 'Трёхфазный двигатель в однофазном режиме'],
  ['Motor trifásico rotor bobinado', 'Трёхфазный двигатель с фазным ротором'],
  ['Motor cc. de imán permanente', 'Двигатель постоянного тока с постоянными магнитами'],
  ['Motor cc. de independiente', 'Двигатель постоянного тока с независимым возбуждением'],
  ['Motor paso a paso unipolar', 'Униполярный шаговый двигатель'],
  ['Motor paso a paso bipolar', 'Биполярный шаговый двигатель'],
  ['Motor trifásico', 'Трёхфазный двигатель'],
  ['Motor monofásico', 'Однофазный двигатель'],
  ['Motor Dahalander', 'Двигатель Даландера'],
  ['Motor Dahalander', 'Двигатель Даландера'],
  ['Motor II Veloc', 'Двухскоростной двигатель'],
  ['Variador velocidad c.c.', 'Преобразователь скорости двигателя постоянного тока'],
  ['Variador velocidad c.a.', 'Преобразователь частоты переменного тока'],
  ['Control variador velocidad c.c.', 'Управление преобразователем скорости постоянного тока'],
  ['Control variador velocidad c.a.', 'Управление преобразователем частоты'],
  ['Control arrancador electrónico c.a.', 'Управление электронным пускателем переменного тока'],
  ['Control inversor electrónico c.a.', 'Управление электронным инвертором переменного тока'],
  ['Arrancador electónico c.a.', 'Электронный пускатель переменного тока'],
  ['Arrancador electrónico c.a.', 'Электронный пускатель переменного тока'],
  ['Contacto auxiliar relé térmico', 'Вспомогательный контакт теплового реле'],
  ['Contacto temporizado a la conexión desconexión', 'Контакт с задержкой включения и отключения'],
  ['Contacto temporizado a la deconexión', 'Контакт с задержкой отключения'],
  ['Contacto temporizado a la conexión', 'Контакт с задержкой включения'],
  ['Contacto biestable', 'Бистабильный контакт'],
  ['Contacto', 'Контакт'],
  ['Final de carrera', 'Концевой выключатель'],
  ['Barrera fotoeléctica', 'Фотоэлектрический барьер'],
  ['Barrera fotoeléctrica', 'Фотоэлектрический барьер'],
  ['Barrera emisor', 'Излучатель фотоэлектрического барьера'],
  ['Barrera receptor', 'Приёмник фотоэлектрического барьера'],
  ['Det. inductivo', 'Индуктивный датчик'],
  ['Det. capacitivo', 'Ёмкостный датчик'],
  ['Det. magnético', 'Магнитный датчик'],
  ['Temporizador a la conexión desconexión', 'Реле времени с задержкой включения и отключения'],
  ['Temporizador a la desconexión', 'Реле времени с задержкой отключения'],
  ['Temporizador a la conexión', 'Реле времени с задержкой включения'],
  ['Temporizador pulso conexión', 'Реле времени импульсного включения'],
  ['Bobina biestable', 'Бистабильная катушка'],
  ['Bobina electroválvula', 'Катушка электромагнитного клапана'],
  ['Bobina contactor', 'Катушка контактора'],
  ['Bobina', 'Катушка'],
  ['Contacto auxiliar', 'Вспомогательный контакт'],
  ['Piloto señalización intermitente', 'Мигающая сигнальная лампа'],
  ['Piloto señalización', 'Сигнальная лампа'],
  ['Toma de corriente', 'Розетка'],
  ['Fuente de alimentación', 'Источник питания'],
  ['Alimentación', 'Питание'],
  ['Fusible seccionable', 'Предохранитель-разъединитель'],
  ['Fusible', 'Предохранитель'],
  ['Transformador', 'Трансформатор'],
  ['Rectificador', 'Выпрямитель'],
  ['Diodo', 'Диод'],
  ['Bateria', 'Аккумулятор'],
  ['Batería', 'Аккумулятор'],
  ['Resistencia', 'Резистор'],
  ['Autotransformador', 'Автотрансформатор'],
  ['Actuador lineal eléctrico', 'Электрический линейный привод'],
  ['Actuador doble efecto', 'Двусторонний пневмоцилиндр'],
  ['Actuador simple efecto', 'Односторонний пневмоцилиндр'],
  ['Actuador sin vástago magnético', 'Бесштоковый магнитный пневмоцилиндр'],
  ['Actuador sin vástago', 'Бесштоковый пневмоцилиндр'],
  ['Actuador giro', 'Поворотный пневмопривод'],
  ['Pinza doble efecto', 'Двусторонний пневмозахват'],
  ['Pinza simple efecto', 'Односторонний пневмозахват'],
  ['Motor neumático reversible', 'Реверсивный пневмодвигатель'],
  ['Motor neumático', 'Пневмодвигатель'],
  ['Entrada mangueral', 'Ввод пневмолинии'],
  ['Entrada manguera', 'Ввод пневмолинии'],
  ['Cables y conexiones', 'Провода и соединения'],
  ['Cable protección', 'Защитный провод PE'],
  ['Cable neutro', 'Нейтральный провод'],
  ['Cable fase', 'Фазный провод'],
  ['Cable positivo', 'Положительный провод'],
  ['Cable negativo', 'Отрицательный провод'],
  ['Cable III vertical', 'Трёхфазный вертикальный провод'],
  ['Cable III horizontal', 'Трёхфазный горизонтальный провод'],
  ['Cable color', 'Цветной провод'],
  ['Conexión de salida', 'Выходное соединение'],
  ['Conexión de entrada', 'Входное соединение'],
  ['Conexión', 'Соединение'],
  ['Borne cuadrado', 'Квадратная клемма'],
  ['Borne redondo', 'Круглая клемма'],
  ['Manguera', 'Пневмолиния'],
  ['Actuador', 'Привод'],
  ['Vacuostato', 'Вакуумное реле'],
  ['Presostato', 'Реле давления'],
  ['Termostato', 'Термостат'],
  ['Seta', 'грибовидная кнопка'],
  ['Pulsador', 'Кнопка'],
  ['Botón pulsador', 'Кнопка'],
  ['Botonera', 'Пульт кнопочный'],
  ['Interruptor', 'Выключатель'],
  ['Conmutador', 'Переключатель'],
  ['Seccionador', 'Разъединитель'],
  ['Contactor', 'Контактор'],
  ['Enclavamiento', 'Механическая блокировка'],
  ['Relé térmico', 'Тепловое реле'],
  ['Relé intermitente', 'Реле-прерыватель'],
  ['Telerruptor', 'Импульсное реле'],
  ['Generador de pulsos', 'Генератор импульсов'],
  ['Contador ascendente-descendente', 'Реверсивный счётчик'],
  ['Contador 4 bits decadas', 'Декадный 4-битный счётчик'],
  ['Contador 4 bits ASC/DES', 'Реверсивный 4-битный счётчик'],
  ['Contador 4 bits', '4-битный счётчик'],
  ['Contador de pulsos', 'Счётчик импульсов'],
  ['Contador', 'Счётчик'],
  ['Divisor Binario', 'Двоичный делитель'],
  ['Decodificador 7 segmentos', 'Декодер семисегментного индикатора'],
  ['Preselctor', 'Предустановленный селектор'],
  ['Preselектор', 'Предустановленный селектор'],
  ['Visualiza', 'Индикатор'],
  ['Prueba', 'Тест'],
  ['Biestable', 'Триггер'],
  ['Etapa inicial', 'Начальный шаг'],
  ['Etapa', 'Шаг'],
  ['Transición', 'Переход'],
  ['Acción', 'Действие'],
  ['Divergencia en "O"', 'Разветвление «ИЛИ»'],
  ['Convergencia en "O"', 'Слияние «ИЛИ»'],
  ['Divergencia en "Y"', 'Разветвление «И»'],
  ['Convergencia en "Y"', 'Слияние «И»'],
  ['Macro etapa', 'Макрошаг'],
  ['Línea enlace', 'Линия связи'],
  ['Enlace de entrada', 'Входная связь'],
  ['Enlace de salida', 'Выходная связь'],
  ['Intercambio entradas PC_SIMU', 'Обмен входами с PC_SIMU'],
  ['Intercambio salidas PC_SIMU', 'Обмен выходами с PC_SIMU'],
  ['Módulo lógico', 'Логический модуль'],
  ['Entrada digital PLC', 'Цифровой вход ПЛК'],
  ['Salida digital PLC', 'Цифровой выход ПЛК'],
  ['CPU PLC', 'ЦПУ ПЛК'],
  ['Alimentación I/O digital PLC', 'Питание цифровых входов и выходов ПЛК'],
  ['Componente tamaño pequeño', 'Компонент малого размера'],
  ['Componente tamaño medio', 'Компонент среднего размера'],
  ['Componente tamaño grande', 'Компонент большого размера'],
  ['Relé', 'Реле'],
  ['Protección', 'Защита'],
  ['Proteccion', 'Защита'],
  ['Fase', 'фаза'],
  ['Neutro', 'нейтраль'],
  ['Positivo', 'положительный'],
  ['Negativo', 'отрицательный'],
  ['Variador', 'Преобразователь'],
  ['velocidad', 'скорости'],
  ['Control', 'Управление'],
  ['electónico', 'электронный'],
  ['electrónico', 'электронный'],
  ['eléctrico', 'электрический'],
  ['trifásico', 'трёхфазный'],
  ['monofásico', 'однофазный'],
  ['unipolar', 'униполярный'],
  ['bipolar', 'биполярный'],
  ['inductivo', 'индуктивный'],
  ['capacitivo', 'ёмкостный'],
  ['magnético', 'магнитный'],
  ['sobretensiones', 'перенапряжения'],
  ['permanentes', 'постоянные'],
  ['térmico', 'тепловой'],
  ['intermitente', 'циклический'],
  ['señalización', 'сигнальный'],
  ['positivo', 'положительный'],
  ['negativo', 'отрицательный'],
  ['Protección', 'защитный'],
  ['NA-NC', 'НО-НЗ'],
  ['NA+NC', 'НО+НЗ'],
  ['NA', 'НО'],
  ['NC', 'НЗ'],
  ['COM', 'общий'],
  ['CON', 'переключающий'],
];

function translateRussian(source: string, id: number): string {
  if (!source) return `Элемент ${id}`;
  let text = source;
  for (const [from, to] of RU_PHRASES) {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(escaped, 'gi'), to);
  }
  text = text
    .replace(/\bAND\b/gi, 'И').replace(/\bOR\b/gi, 'ИЛИ').replace(/\bINV\b/gi, 'НЕ')
    .replace(/\bEXOR\b/gi, 'ИСКЛ. ИЛИ').replace(/\bNAND\b/gi, 'И-НЕ').replace(/\bNOR\b/gi, 'ИЛИ-НЕ')
    .replace(/\bSSR\b/gi, 'SSR').replace(/\bPLC\b/gi, 'ПЛК').replace(/\bLOGO\b/gi, 'LOGO')
    .replace(/\bFirst Scan\b/gi, 'Первый цикл').replace(/\bSet\b/gi, 'Установить').replace(/\bReset\b/gi, 'Сброс')
    .replace(/\bAS?C\/?DES\b/gi, 'ВВЕРХ/ВНИЗ').replace(/\bCLK\b/gi, 'ТАКТ').replace(/\bDIR\b/gi, 'НАПР')
    .replace(/\bI\/?O\b/gi, 'В/В').replace(/\bIII\b/g, 'III').replace(/\bIN\b/g, 'IN')
    .replace(/\bc\.a\.\b/gi, 'перем. тока').replace(/\bc\.c\.\b/gi, 'пост. тока')
    .replace(/\bNA-NC\b/gi, 'НО-НЗ').replace(/\bNA\+NC\b/gi, 'НО+НЗ').replace(/\bNA\b/gi, 'НО').replace(/\bNC\b/gi, 'НЗ')
    .replace(/\s+/g, ' ').trim();
  return text || `Элемент ${id}`;
}

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
        if (!existing.names.ru) existing.names.ru = ru ?? translateRussian(es ?? en ?? it ?? '', id);
        const sourceName = (es?.trim() ? es : en ?? it) ?? '';
        if (existing.names.fr === null && sourceName) existing.names.fr = translateCatalogName(sourceName, 'fr');
        if (existing.names.ar === null && sourceName) existing.names.ar = translateCatalogName(sourceName, 'ar');
        continue;
      }
      const sourceName = (es?.trim() ? es : en ?? it) ?? '';
      byId.set(id, { id, names: { es, en, it, ru: ru ?? translateRussian(sourceName, id), fr: sourceName ? translateCatalogName(sourceName, 'fr') : null, ar: sourceName ? translateCatalogName(sourceName, 'ar') : null }, groups: [def.key], release: 'v2' });
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
  };
}

/** Каталог, собранный из встроенных данных. */
export const catalog: Catalog = buildCatalog(rawCatalog as unknown as RawCatalog);

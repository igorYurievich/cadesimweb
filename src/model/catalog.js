/**
 * Каталог элементов CADe_SIMU 4.2.
 *
 * Источник данных: src/data/components.json (извлечён из exe оригинала).
 * Ключ элемента: числовой код команды MFC (`id`). Это НЕ тот же код, что
 * хранится в файлах .cad (там, например, 9000 = катушка): соответствие
 * команда -> тип в .cad устанавливается на шаге 4 (парсер .cad).
 */
import rawCatalog from '../data/components.json';
/**
 * Группы в порядке, в котором они идут в оригинале.
 * Названия групп из данных сопоставляются по префиксу.
 *
 * Версии: Ladder и Lógica во второй версии (подтверждено автором).
 * Остальное по умолчанию: GRAFCET, PLC/IO и «реалистичные» символы во второй,
 * пневматика во второй (решение автором не подтверждено).
 */
const GROUP_DEFS = [
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
const RELEASE_OVERRIDES = {
    33002: 'v1', // Resistencia I
    33003: 'v1', // Resistencia III
    33004: 'v1', // Autotransformador III
    33295: 'v2', // Motor paso a paso unipolar
    33296: 'v2', // Motor paso a paso bipolar
    33257: 'v2', // Actuador lineal eléctrico
};
const FALLBACK = ['es', 'en', 'it'];
export function normalizeText(s) {
    return s
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}
export function buildCatalog(raw) {
    const groups = [];
    const byId = new Map();
    let slotCount = 0;
    for (const rg of raw.groups) {
        const def = GROUP_DEFS.find((d) => rg.name.startsWith(d.prefix));
        if (!def)
            throw new Error(`Unknown component group in data: "${rg.name}"`);
        const group = {
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
                if (!existing.groups.includes(def.key))
                    existing.groups.push(def.key);
                // Дозаполняем перевод, если в первой панели его не было.
                if (existing.names.es === null && es !== null)
                    existing.names.es = es;
                if (existing.names.en === null && en !== null)
                    existing.names.en = en;
                if (existing.names.it === null && it !== null)
                    existing.names.it = it;
                if ((existing.names.ru == null || existing.names.ru === '') && ru != null)
                    existing.names.ru = ru;
                continue;
            }
            byId.set(id, { id, names: { es, en, it, ru: ru ?? null }, groups: [def.key], release: 'v2' });
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
    const label = (def, lang = 'es') => {
        for (const l of [lang, ...FALLBACK]) {
            const v = def.names[l];
            if (typeof v === 'string' && v.trim() !== '')
                return v;
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
            if (!g)
                return [];
            const seen = new Set();
            const out = [];
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
            if (q === '')
                return [];
            return components.filter((c) => ['es', 'en', 'it', 'ru'].some((l) => {
                const n = c.names[l];
                return typeof n === 'string' && normalizeText(n).includes(q);
            }));
        },
    };
}
/** Каталог, собранный из встроенных данных. */
export const catalog = buildCatalog(rawCatalog);

/**
 * Низкоуровневый разбор и запись текстового формата .cad (CADe_SIMU 4.x).
 * Здесь нет знаний об элементах: только грамматика файла. Смысл кодов типов
 * и геометрия клемм лежат в cad-types.ts и cad-import.ts.
 *
 * Грамматика (выведена из четырёх образцов Actividad 1.x):
 *
 *   файл    = "CADe_SIMU" запись* подвал
 *   запись  = "*" id "*" тип ("#" текст){10} "*" число ("*" число){22} "#"
 *   подвал  = "$$$" ("*" число)+ "&&&" ("*" поле)* "$$$&&&"
 *
 * Всё, что идёт после первого подвала, это остаток предыдущего, более длинного
 * сохранения (программа перезаписывает файл без усечения). Читать это нельзя:
 * там встречаются обрывки записей и устаревшие подвалы. Парсер останавливается
 * на первом подвале и сообщает о хвосте предупреждением.
 */
export const CAD_HEADER = 'CADe_SIMU';
export const CAD_TEXT_FIELDS = 10;
export const CAD_NUM_FIELDS = 23;
export class CadParseError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CadParseError';
    }
}
/** Запись начинается на "*" сразу после предыдущей записи или заголовка. */
const RECORD_RE = new RegExp('\\*(-?\\d+)\\*(\\d+)((?:#[^#*]*){' +
    CAD_TEXT_FIELDS +
    '})\\*(-?\\d+(?:\\.\\d+)?(?:\\*-?\\d+(?:\\.\\d+)?){' +
    (CAD_NUM_FIELDS - 1) +
    '})#', 'y');
const FOOTER_OPEN = '$$$';
const FOOTER_SPLIT = '&&&';
const FOOTER_CLOSE = '$$$&&&';
/** Короткий фрагмент вокруг позиции для сообщений об ошибках. */
function snippet(text, at) {
    return JSON.stringify(text.slice(at, at + 40));
}
export function parseCad(text) {
    if (!text.startsWith(CAD_HEADER)) {
        throw new CadParseError(`Не файл CADe_SIMU: нет заголовка "${CAD_HEADER}".`);
    }
    const records = [];
    const warnings = [];
    const seen = new Set();
    let footer = null;
    let ignoredTailLength = 0;
    let pos = CAD_HEADER.length;
    while (pos < text.length) {
        if (text.startsWith(FOOTER_OPEN, pos)) {
            const parsed = parseFooter(text, pos, warnings);
            if (parsed) {
                footer = parsed.footer;
                ignoredTailLength = text.length - parsed.end;
                if (ignoredTailLength > 0) {
                    warnings.push({
                        code: 'trailing-data',
                        message: `После подвала остался хвост из ${ignoredTailLength} символов (остаток старого сохранения), он пропущен.`,
                        offset: parsed.end,
                    });
                }
            }
            return { records, footer, warnings, ignoredTailLength };
        }
        RECORD_RE.lastIndex = pos;
        const m = RECORD_RE.exec(text);
        if (!m) {
            warnings.push({
                code: 'bad-record',
                message: `Не удалось прочитать запись на позиции ${pos}: ${snippet(text, pos)}. Дальше файл не читается.`,
                offset: pos,
            });
            ignoredTailLength = text.length - pos;
            return { records, footer, warnings, ignoredTailLength };
        }
        const id = Number(m[1]);
        const texts = m[3].split('#').slice(1);
        const nums = m[4].split('*').map(Number);
        if (seen.has(id)) {
            warnings.push({
                code: 'duplicate-id',
                message: `Повторный id записи: ${id}.`,
                offset: pos,
            });
        }
        seen.add(id);
        records.push({ id, type: Number(m[2]), texts, nums });
        pos = RECORD_RE.lastIndex;
    }
    warnings.push({
        code: 'missing-footer',
        message: 'Файл закончился без подвала ($$$...&&&): штамп и настройки листа не найдены.',
        offset: text.length,
    });
    return { records, footer, warnings, ignoredTailLength };
}
function parseFooter(text, at, warnings) {
    const split = text.indexOf(FOOTER_SPLIT, at);
    if (split < 0) {
        warnings.push({ code: 'bad-footer', message: 'В подвале нет "&&&".', offset: at });
        return null;
    }
    const settingsRaw = text.slice(at + FOOTER_OPEN.length, split);
    const settings = settingsRaw
        .split('*')
        .slice(1)
        .map((s) => Number(s));
    if (settings.some((n) => Number.isNaN(n))) {
        warnings.push({
            code: 'bad-footer',
            message: `Настройки листа не числа: ${JSON.stringify(settingsRaw)}.`,
            offset: at,
        });
    }
    const bodyStart = split + FOOTER_SPLIT.length;
    const close = text.indexOf(FOOTER_CLOSE, bodyStart);
    let body;
    let end;
    if (close < 0) {
        warnings.push({
            code: 'bad-footer',
            message: 'Подвал не закрыт "$$$&&&", взят весь остаток файла.',
            offset: at,
        });
        body = text.slice(bodyStart);
        end = text.length;
    }
    else {
        body = text.slice(bodyStart, close);
        end = close + FOOTER_CLOSE.length;
    }
    // Тело начинается с "*": первый пустой токен отбрасываем.
    const fields = body.split('*').slice(1);
    return { footer: { settings, fields }, end };
}
/** Записывает файл обратно. Для чистого файла результат совпадает с исходным текстом до первого подвала. */
export function serializeCad(file) {
    const parts = [CAD_HEADER];
    for (const r of file.records) {
        if (r.texts.length !== CAD_TEXT_FIELDS || r.nums.length !== CAD_NUM_FIELDS) {
            throw new CadParseError(`Запись ${r.id}: нужно ${CAD_TEXT_FIELDS} текстовых и ${CAD_NUM_FIELDS} числовых полей, а не ${r.texts.length} и ${r.nums.length}.`);
        }
        parts.push(`*${r.id}*${r.type}${r.texts.map((t) => '#' + t).join('')}*${r.nums.join('*')}#`);
    }
    if (file.footer) {
        const f = file.footer;
        parts.push(FOOTER_OPEN +
            f.settings.map((n) => '*' + n).join('') +
            FOOTER_SPLIT +
            f.fields.map((x) => '*' + x).join('') +
            FOOTER_CLOSE);
    }
    return parts.join('');
}

/**
 * Низкоуровневый разбор и запись текстового формата .cad (CADe_SIMU 4.x).
 * Здесь нет знаний об элементах: только грамматика файла. Смысл кодов типов
 * и геометрия клемм лежат в cad-types.ts и cad-import.ts.
 *
 * Грамматика (выведена из четырёх образцов Actividad 1.x):
 *
 *   файл    = "CADe_SIMU" запись* подвал
 *   запись  = "*" id "*" тип ("#" текст){10,} "*" число ("*" число){22,} "#" хвост
 *   хвост   = текст без "#", "*" и "$" (чаще пустой)
 *   подвал  = "$$$" ("*" число)+ "&&&" ("*" поле)* "$$$&&&"
 *
 * Всё, что идёт после первого подвала, это остаток предыдущего, более длинного
 * сохранения (программа перезаписывает файл без усечения). Читать это нельзя:
 * там встречаются обрывки записей и устаревшие подвалы. Парсер останавливается
 * на первом подвале и сообщает о хвосте предупреждением.
 */

export const CAD_HEADER = 'CADe_SIMU';
/** Минимум текстовых и числовых полей записи; у части элементов их больше (см. FORMATO_CAD.md §3). */
export const CAD_TEXT_FIELDS = 10;
export const CAD_NUM_FIELDS = 23;
/** Чисел в записи после флагов клемм: x y, конец, смещение подписи, размер, поворот и остальное. Флагов = чисел − 15. */
export const CAD_NUMS_AFTER_FLAGS = 15;

/** Сколько флагов клемм в записи (8 у обычных, 9 у автотрансформатора 1052). */
export function flagCountOf(record: Pick<CadRecord, 'nums'>): number {
  return Math.max(0, record.nums.length - CAD_NUMS_AFTER_FLAGS);
}

/** Запись-продолжение: тип -1 сразу после записи элемента, у которого клемм больше, чем слотов флагов в одной записи. */
export function isContinuationType(type: number): boolean {
  return type < 0;
}

/** Одна запись файла: элемент, провод, соединение или служебный объект. */
export interface CadRecord {
  id: number;
  /** Код типа в файле: 1000 = мотор, 4000 = провод фазы и т. д. */
  type: number;
  /** Не меньше 10 текстовых полей: имя, функция, метки клемм и параметры (у 1052 их 11). */
  texts: string[];
  /** Не меньше 23 чисел: флаги клемм, координаты, смещения, размеры, кэш связей (у 1052 их 24). */
  nums: number[];
  /** Текст после закрывающего «#» записи (до следующей «*» или подвала). Нужен для 1062, 1063, 1056 и других; смысл не разгадан. */
  tail?: string;
}

/** Подвал: настройки листа и штамп. Поля хранятся как есть, с пробелами-заполнителями. */
export interface CadFooter {
  /** Числа между "$$$" и "&&&" (последние два: ширина и высота листа, мм). */
  settings: number[];
  /** Поля между "&&&" и "$$$&&&": 10 текстовых (штамп), затем флаги. */
  fields: string[];
}

export type CadWarningCode =
  | 'bad-record'
  | 'missing-footer'
  | 'trailing-data'
  | 'bad-footer'
  | 'duplicate-id';

export interface CadWarning {
  code: CadWarningCode;
  message: string;
  /** Смещение в исходном тексте. */
  offset: number;
}

export interface CadFile {
  records: CadRecord[];
  footer: CadFooter | null;
  warnings: CadWarning[];
  /** Сколько символов после первого подвала проигнорировано. */
  ignoredTailLength: number;
}

export class CadParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CadParseError';
  }
}

/** Запись начинается на "*" сразу после предыдущей записи или заголовка. Полей может быть больше минимума, после "#" возможен хвост. */
const RECORD_RE = new RegExp(
  '\\*(-?\\d+)\\*(-?\\d+)((?:#[^#*]*){' +
    CAD_TEXT_FIELDS +
    ',})\\*(-?\\d+(?:\\.\\d+)?(?:\\*-?\\d+(?:\\.\\d+)?){' +
    (CAD_NUM_FIELDS - 1) +
    ',})#([^#*$]*)',
  'y',
);

const FOOTER_OPEN = '$$$';
const FOOTER_SPLIT = '&&&';
const FOOTER_CLOSE = '$$$&&&';

/** Короткий фрагмент вокруг позиции для сообщений об ошибках. */
function snippet(text: string, at: number): string {
  return JSON.stringify(text.slice(at, at + 40));
}

export function parseCad(text: string): CadFile {
  if (!text.startsWith(CAD_HEADER)) {
    throw new CadParseError(`Не файл CADe_SIMU: нет заголовка "${CAD_HEADER}".`);
  }

  const records: CadRecord[] = [];
  const warnings: CadWarning[] = [];
  const seen = new Set<number>();
  let footer: CadFooter | null = null;
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
    const texts = (m[3] as string).split('#').slice(1);
    const nums = (m[4] as string).split('*').map(Number);
    if (seen.has(id)) {
      warnings.push({
        code: 'duplicate-id',
        message: `Повторный id записи: ${id}.`,
        offset: pos,
      });
    }
    seen.add(id);
    const tail = m[5] as string;
    records.push(tail === '' ? { id, type: Number(m[2]), texts, nums } : { id, type: Number(m[2]), texts, nums, tail });
    pos = RECORD_RE.lastIndex;
  }

  warnings.push({
    code: 'missing-footer',
    message: 'Файл закончился без подвала ($$$...&&&): штамп и настройки листа не найдены.',
    offset: text.length,
  });
  return { records, footer, warnings, ignoredTailLength };
}

function parseFooter(
  text: string,
  at: number,
  warnings: CadWarning[],
): { footer: CadFooter; end: number } | null {
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
  let body: string;
  let end: number;
  if (close < 0) {
    warnings.push({
      code: 'bad-footer',
      message: 'Подвал не закрыт "$$$&&&", взят весь остаток файла.',
      offset: at,
    });
    body = text.slice(bodyStart);
    end = text.length;
  } else {
    body = text.slice(bodyStart, close);
    end = close + FOOTER_CLOSE.length;
  }
  // Тело начинается с "*": первый пустой токен отбрасываем.
  const fields = body.split('*').slice(1);
  return { footer: { settings, fields }, end };
}

/** Записывает файл обратно. Для чистого файла результат совпадает с исходным текстом до первого подвала. */
export function serializeCad(file: Pick<CadFile, 'records' | 'footer'>): string {
  const parts: string[] = [CAD_HEADER];
  for (const r of file.records) {
    if (r.texts.length < CAD_TEXT_FIELDS || r.nums.length < CAD_NUM_FIELDS) {
      throw new CadParseError(
        `Запись ${r.id}: нужно не меньше ${CAD_TEXT_FIELDS} текстовых и ${CAD_NUM_FIELDS} числовых полей, а не ${r.texts.length} и ${r.nums.length}.`,
      );
    }
    parts.push(
      `*${r.id}*${r.type}${r.texts.map((t) => '#' + t).join('')}*${r.nums.join('*')}#${r.tail ?? ''}`,
    );
  }
  if (file.footer) {
    const f = file.footer;
    parts.push(
      FOOTER_OPEN +
        f.settings.map((n) => '*' + n).join('') +
        FOOTER_SPLIT +
        f.fields.map((x) => '*' + x).join('') +
        FOOTER_CLOSE,
    );
  }
  return parts.join('');
}

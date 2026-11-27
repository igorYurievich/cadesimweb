// Раскладка текста в ячейках штампа: перенос по словам и уменьшение шрифта.
export const STAMP_LINE_HEIGHT = 1.15;
/** Ширина текста в единицах листа при данном кегле. */
export type MeasureText = (text: string, size: number) => number;
/** Ниже этой доли исходного кегля текст уже плохо читается при печати на A4. */
const MIN_SCALE = 0.55;
const SCALE_STEP = 0.9;

/** Грубая оценка без DOM: средняя ширина символа Arial с запасом. */
export const estimateTextWidth: MeasureText = (text, size) => text.length * size * 0.56;

export interface StampTextLayout { lines: string[]; size: number }

/** Обрезает строку до maxWidth и ставит многоточие, если она не помещается. */
export function fitStampLine(value: string, maxWidth: number, size: number, measure = estimateTextWidth): string {
  if (measure(value, size) <= maxWidth) return value;
  let end = value.length - 1;
  while (end > 1 && measure(`${value.slice(0, end)}…`, size) > maxWidth) end -= 1;
  return `${value.slice(0, Math.max(1, end))}…`;
}

/** Переносит по словам; слово, которое не влезает даже одно, режется на части. */
export function wrapStampWords(value: string, fits: (line: string) => boolean): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of value.trim().split(/\s+/).filter(Boolean)) {
    const joined = line ? `${line} ${word}` : word;
    if (fits(joined)) { line = joined; continue; }
    if (line) lines.push(line);
    line = word;
    while (line.length > 1 && !fits(line)) {
      let cut = line.length - 1;
      while (cut > 1 && !fits(line.slice(0, cut))) cut -= 1;
      lines.push(line.slice(0, cut)); line = line.slice(cut);
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Подбирает строки и кегль для многострочной ячейки: сначала переносит по словам,
 * а если строк всё равно больше, чем помещается по высоте, уменьшает шрифт.
 * На минимальном кегле лишнее обрезается многоточием на последней строке.
 */
export function layoutStampText(
  value: string,
  maxWidth: number,
  maxHeight: number,
  baseSize: number,
  measure: MeasureText = estimateTextWidth,
): StampTextLayout {
  const minSize = baseSize * MIN_SCALE;
  let size = baseSize;
  for (;;) {
    const lines = wrapStampWords(value, (line) => measure(line, size) <= maxWidth);
    const maxLines = Math.max(1, Math.floor(maxHeight / (size * STAMP_LINE_HEIGHT)));
    if (lines.length <= maxLines) return { lines, size };
    const next = size * SCALE_STEP;
    if (next < minSize) {
      const kept = lines.slice(0, maxLines);
      const last = `${kept[maxLines - 1] ?? ''} ${lines[maxLines] ?? ''}`;
      kept[maxLines - 1] = fitStampLine(last, maxWidth, size, measure);
      return { lines: kept, size };
    }
    size = next;
  }
}

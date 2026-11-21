import { group, label, path, rect } from "./svg-primitives";

// ── Экран LOGO! 10202 в режиме RUN ─────────────────────────────────────────────────────────────
// Как на настоящем дисплее: строки «I 1…8» с клетками входов, ниже клетки выходов и строки «Q 1…4», справа «RUN».
// С расширениями DM8 на листе экран показывает и их адреса (I9…I12, Q5…Q8 с одним DM8): по 8 в строке,
// строки и шрифт ужимаются, чтобы всё влезло в стекло (x 5…45, y 32…62).
// Цвета — мятные на тёмном стекле, шрифт моноширинный, как на LCD.
// Клетка — .logo-led-<операнд>: её закрашивает тот же код, что и лампочки у клемм (simulation/element-plc.ts),
// класс logo-cell делает закраску сплошной. Весь экран — группа .logo-run: виден, только пока модуль запитан.

export interface ScreenIo { inputs: readonly string[]; outputs: readonly string[] }

const TEXT = "#c9f2d0";
const ACCENT = "#7ee08f";
const PER_ROW = 8;
/** Центры столбцов: 8 в строке, справа остаётся место под «RUN». */
const column = (k: number): number => 10.4 + 3.3 * k;
const TOP = 33.5;
const HEIGHT = 27;
const GAP = 2;

const lcd = (value: string, x: number, y: number, rotation: number, size: number, fill = TEXT,
  anchor: "start" | "middle" | "end" = "middle"): SVGTextElement => {
  const text = label(value, x, y, { size, anchor, upright: rotation, fill });
  text.setAttribute("font-family", "Consolas, 'Lucida Console', 'Courier New', monospace");
  return text;
};

const cell = (name: string, x: number, y: number, size: number): SVGRectElement =>
  rect(x - size / 2, y - size / 2, size, size, {
    class: `logo-led logo-cell logo-led-${name}`, fill: ACCENT, "fill-opacity": 0,
    stroke: ACCENT, "stroke-width": 0.3, rx: 0.3,
  });

const rowsOf = (names: readonly string[]): string[][] =>
  Array.from({ length: Math.ceil(names.length / PER_ROW) }, (_, r) => names.slice(r * PER_ROW, (r + 1) * PER_ROW));

interface RowStyle { rotation: number; h: number; font: number; box: number }

/** Строка входов: номера сверху, клетки снизу; у первой строки — буква «I». */
function inputRow(names: string[], top: number, first: boolean, s: RowStyle): SVGElement[] {
  const textY = top + s.h * 0.32;
  const boxY = top + s.h * 0.72;
  return [
    ...(first ? [lcd("I", 7.2, textY, s.rotation, s.font)] : []),
    ...names.flatMap((name, k) => [
      lcd(name.slice(1), column(k), textY, s.rotation, name.length > 2 ? s.font * 0.8 : s.font),
      cell(name, column(k), boxY, s.box),
    ]),
  ];
}

/** Строка выходов зеркально: клетки сверху, номера снизу; у последней строки — буква «Q». */
function outputRow(names: string[], top: number, last: boolean, s: RowStyle): SVGElement[] {
  const boxY = top + s.h * 0.28;
  const textY = top + s.h * 0.68;
  return [
    ...(last ? [lcd("Q", 7.2, textY, s.rotation, s.font)] : []),
    ...names.flatMap((name, k) => [
      cell(name, column(k), boxY, s.box),
      lcd(name.slice(1), column(k), textY, s.rotation, name.length > 2 ? s.font * 0.8 : s.font),
    ]),
  ];
}

export function logoScreen(rotation: number, io: ScreenIo): SVGGElement {
  const inputs = rowsOf(io.inputs);
  const outputs = rowsOf(io.outputs);
  const h = Math.min(9, (HEIGHT - GAP) / Math.max(1, inputs.length + outputs.length));
  const s: RowStyle = { rotation, h, font: Math.min(2.6, h * 0.32), box: Math.min(2.8, h * 0.36) };
  const top = TOP + (HEIGHT - (inputs.length + outputs.length) * h - GAP) / 2;
  const split = top + inputs.length * h + GAP / 2;
  const outTop = (r: number): number => split + GAP / 2 + r * h;
  const runY = outTop(Math.max(0, outputs.length - 1)) + h * 0.68;
  return group(
    "logo-run",
    ...inputs.flatMap((names, r) => inputRow(names, top + r * h, r === 0, s)),
    path(`M 6.5 ${split} H 43.5`, 0.25, { stroke: ACCENT, "stroke-opacity": 0.35 }),
    ...outputs.flatMap((names, r) => outputRow(names, outTop(r), r === outputs.length - 1, s)),
    lcd("RUN", 44.2, runY, rotation, Math.min(3, s.font * 1.15), ACCENT, "end"),
  );
}

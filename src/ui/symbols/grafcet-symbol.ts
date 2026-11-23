import type { SchemaElement } from "@model/types";
import {
  BAR_PITCH, GRAFCET, TABLE_ROW_H, decodeTableRows, isGrafcetAndBar, isGrafcetBar, isGrafcetStep,
} from "@model/grafcet";

import { INK, NAME_COLOR, label, path, rect, shape } from "./svg-primitives";

// ── Символы GRAFCET (model/grafcet.ts) ────────────────────────────────────────────────────────────────
// В симуляции (element-grafcet.ts): активный этап — класс is-grafcet-active (зелёная заливка и метка-точка),
// истинное условие перехода — is-grafcet-true (зелёная черта), действие активного этапа — is-grafcet-active,
// строка таблицы с включённым операндом — is-on.

/** Подписи таблицы назначений на языке интерфейса (cadesimu-language). */
const TABLE_TEXT: Readonly<Record<string, readonly [string, string, string, string]>> = {
  es: ["Tabla de asignaciones", "Entradas", "Salidas", "Sin operandos"],
  en: ["Assignment table", "Inputs", "Outputs", "No operands"],
  it: ["Tabella delle assegnazioni", "Ingressi", "Uscite", "Nessun operando"],
  ru: ["Таблица назначений", "Входы", "Выходы", "Нет операндов"],
  fr: ["Table d’affectation", "Entrées", "Sorties", "Aucun opérande"],
  ar: ["جدول التخصيص", "المداخل", "المخارج", "لا توجد معاملات"],
};

function tableText(): readonly [string, string, string, string] {
  let lang = "es";
  try { lang = localStorage.getItem("cadesimu-language") ?? "es"; } catch { /* Язык по умолчанию. */ }
  return TABLE_TEXT[lang] ?? TABLE_TEXT.es!;
}

/** Размер шрифта, при котором text помещается в width (оценка ширины символа 0,58 кегля). */
const fitSize = (text: string, width: number, max: number): number =>
  Math.max(1.4, Math.min(max, width / Math.max(1, text.length * 0.58)));

const FRAME = { fill: "#fff", stroke: INK, "stroke-width": 0.8, "vector-effect": "non-scaling-stroke" } as const;

/** Подпись по центру точки, прямо при любом повороте элемента. */
const centered = (size: number, rotation = 0) =>
  ({ size, anchor: "middle" as const, fill: NAME_COLOR, upright: rotation });

const barEnd = (element: SchemaElement): number =>
  Math.max(0, (element.terminals.length || Math.round(element.size.w / BAR_PITCH)) - 1) * BAR_PITCH;

function drawStep(g: SVGGElement, element: SchemaElement, rotation: number): void {
  g.append(rect(0, 0, 12, 12, { class: "grafcet-box", ...FRAME }));
  if (element.typeCode === GRAFCET.initialStep) {
    g.append(rect(1.3, 1.3, 9.4, 9.4, { ...FRAME, fill: "none", "stroke-width": 0.7 }));
  }
  g.append(shape("circle", { class: "grafcet-token", cx: 6, cy: 9.4, r: 1.1, fill: "#16a34a" }));
  const number = element.name.trim();
  if (number) g.append(label(number, 6, 5.6, centered(fitSize(number, 8, 4.6), rotation)));
}

function drawTransition(g: SVGGElement, element: SchemaElement, rotation: number): void {
  g.append(path("M 3 0 V 6"), path("M 0.4 3 H 5.6", 1.6, { class: "grafcet-bar", "stroke-linecap": "butt" }));
  const text = element.name.trim();
  if (text) g.append(label(text, 7, 3.1, { size: 2.7, fill: NAME_COLOR, halo: true, upright: rotation }));
}

function drawAction(g: SVGGElement, element: SchemaElement, rotation: number): void {
  g.append(rect(0, 0, 24, 6, { class: "grafcet-box", ...FRAME }));
  const text = element.name.trim();
  if (text) g.append(label(text, 12, 3.1, centered(fitSize(text, 22, 2.8), rotation)));
}

function drawBar(g: SVGGElement, element: SchemaElement): void {
  const end = barEnd(element);
  const line = (y: number): SVGPathElement => path(`M -1.5 ${y} H ${end + 1.5}`, 0.9, { class: "grafcet-line" });
  if (isGrafcetAndBar(element.typeCode)) g.append(line(-0.9), line(0.9));
  else g.append(line(0));
}

function drawLink(g: SVGGElement): void {
  g.append(path("M 0 0 V 12"), shape("path", { d: "M -1.3 7.2 L 0 4.6 L 1.3 7.2 Z", fill: INK, stroke: "none" }));
}

function drawTable(g: SVGGElement, element: SchemaElement): void {
  const [title, inputsTitle, outputsTitle, empty] = tableText();
  const rows = decodeTableRows(element.func);
  const width = element.size.w;
  const keyWidth = Math.min(16, width * 0.25);
  const stroke = { stroke: "#536273", "stroke-width": 0.5, "vector-effect": "non-scaling-stroke" };
  const lines: SVGElement[] = [];
  let y = 0;
  const band = (text: string, fill: string, bold = true): void => {
    lines.push(rect(0, y, width, TABLE_ROW_H, { fill, ...stroke }));
    lines.push(label(text, width / 2, y + TABLE_ROW_H / 2, centered(bold ? 2.6 : 2.2)));
    y += TABLE_ROW_H;
  };
  band(title, "#e8eef5");
  const section = (kind: "I" | "Q", heading: string): void => {
    const list = rows.filter((row) => row.kind === kind);
    if (!list.length) return;
    band(heading, "#f4f6f9", false);
    for (const row of list) {
      const line = shape("g", { class: "grafcet-table-row", "data-operand": row.name });
      const mid = y + TABLE_ROW_H / 2;
      line.append(
        rect(0, y, width, TABLE_ROW_H, { class: "grafcet-row-bg", fill: "#fff", ...stroke }),
        shape("path", { d: `M ${keyWidth} ${y} V ${y + TABLE_ROW_H}`, fill: "none", ...stroke }),
        label(row.name, keyWidth / 2, mid, centered(fitSize(row.name, keyWidth - 1.5, 2.5))),
        label(row.text, keyWidth + 1.2, mid, { size: fitSize(row.text, width - keyWidth - 2.4, 2.4), fill: "#263342" }),
      );
      lines.push(line);
      y += TABLE_ROW_H;
    }
  };
  section("I", inputsTitle);
  section("Q", outputsTitle);
  if (!rows.length) band(empty, "#fff", false);
  g.append(...lines);
}

export function drawGrafcet(g: SVGGElement, element: SchemaElement, rotation: number): void {
  if (isGrafcetStep(element.typeCode)) drawStep(g, element, rotation);
  else if (element.typeCode === GRAFCET.transition) drawTransition(g, element, rotation);
  else if (element.typeCode === GRAFCET.action) drawAction(g, element, rotation);
  else if (isGrafcetBar(element.typeCode)) drawBar(g, element);
  else if (element.typeCode === GRAFCET.link) drawLink(g);
  else if (element.typeCode === GRAFCET.table) drawTable(g, element);
}

/** Область захвата: рамка символа (у черты — полоса по её длине). */
export function grafcetHitFrame(element: SchemaElement): { x: number; y: number; w: number; h: number } | undefined {
  if (isGrafcetStep(element.typeCode)) return { x: 0, y: 0, w: 12, h: 12 };
  if (element.typeCode === GRAFCET.transition) {
    return { x: 0, y: -0.5, w: 6 + Math.min(20, element.name.length * 1.7), h: 7 };
  }
  if (element.typeCode === GRAFCET.action) return { x: 0, y: 0, w: 24, h: 6 };
  if (isGrafcetBar(element.typeCode)) return { x: -2, y: -2, w: barEnd(element) + 4, h: 4 };
  if (element.typeCode === GRAFCET.link) return { x: -1.5, y: 0, w: 3, h: 12 };
  if (element.typeCode === GRAFCET.table) return { x: 0, y: 0, w: element.size.w, h: element.size.h };
  return undefined;
}

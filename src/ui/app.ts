import { importCad } from '@model/cad-import';
import { buildTerminals, frameSize, terminalPosition } from '@model/geometry';
import { getCadType } from '@model/cad-types';
import { cadTypeForCommand } from '@model/cad-types';
import { catalog } from '@model/catalog';
import type { GroupKey, Lang } from '@model/catalog';
import { createEmptySchema } from '@model/index';
import { exportCad } from '@model/cad-export';
import { parseSchemaJson, serializeSchemaJson } from '@model/schema-json';
import { schemaBounds } from '@model/geometry';
import { EXAMPLES } from '../data/examples';
import type { Schema, SchemaElement, SheetInfo, WireKind, WireSegment } from '@model/types';
import { createEmptyInputs, createEmptyMemory, simulate } from '@engine/simulate';
import { terminalKey } from '@engine/types';
import { POSITION_SPECS, currentPosition, getBehavior, nextPosition } from '@engine/behaviors';
import { auxContactActive } from '@engine/switching';
import { buildWireLinks, pointOnSegment } from '@engine/wire-links';
import type { EngineMemory, EngineState, PotentialLabel, TerminalKey, UserInputs } from '@engine/types';
import { canRedo, canUndo, commitHistory, createHistory, redoHistory, undoHistory } from './history';
import { createElementSymbol } from './symbols';
import { clampDeltaToSheet, clampElementPosition, clampPointToSheet, elementExtent } from './bounds';
import { fitViewport, panBy, screenToSheet, snapPointToGrid, zoomAt } from './viewport';
import type { Point, Viewport } from './viewport';
import { detectBundleLayout, isWireInteriorPoint, offsetRoute, orthogonalize, simplifyRoute, snapDrawingPoint } from './wire-routing';
import './viewport.css';

const FALLBACK_VIEWPORT = { width: 1000, height: 700 };
const AUTOSAVE_KEY = 'cadesimu-web:autosave:v1';
const OPTIONAL_GROUP_STORAGE_KEY = 'cadesimu-visible-optional-groups:v1';
const OPTIONAL_PALETTE_GROUPS = ['grafcet', 'ladder', 'logic', 'realistic-2d', 'realistic-3d', 'wiring', 'pneumatics', 'io-plc', 'power-electronics', 'electronic-relays'] as const satisfies readonly GroupKey[];
function readOptionalPaletteGroups(): GroupKey[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(OPTIONAL_GROUP_STORAGE_KEY) ?? '[]');
    return Array.isArray(raw) ? OPTIONAL_PALETTE_GROUPS.filter((key) => raw.includes(key)) : [];
  } catch { return []; }
}
function readAutosavedSchema(): Schema | undefined {
  try {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    return saved ? parseSchemaJson(saved) : undefined;
  } catch { return undefined; }
}
const CAD_GRID_STEP = 6;
const SVG_NS = 'http://www.w3.org/2000/svg';
const WIRE_COLORS = { phase: '#9e1b16', neutral: '#1749e8', protection: '#13852c', junction: '#263342' } as const;
const POTENTIAL_COLORS: Record<PotentialLabel, string> = {
  L1: '#b4541a', L2: '#1b2430', L3: '#8e99a8', N: '#1f6fe0', PE: '#1fa355', '+': '#d93a3a', '-': '#2f5fb8',
};
/** Цвет проводов без потенциала: спокойный, чтобы подсветка под напряжением читалась сразу. */
const IDLE_WIRE_COLORS = { phase: '#7a8798', neutral: '#6f93c9', protection: '#6fae86', junction: '#5b6878' } as const;
const CONFLICT_COLOR = '#e5322d';
/** Нижняя полоса листа под штамп: она вне поля рисования. */
function stampMetrics(width: number, height: number) {
  const margin = Math.min(5, width * 0.03, height * 0.03);
  const rowH = Math.min(7, Math.max(4.5, height * 0.03));
  const gap = 2.5;
  const stampHeight = rowH * 3;
  return { margin, rowH, gap, stampWidth: Math.max(0, width - margin * 2), stampHeight, footerHeight: stampHeight + gap * 2 };
}
function fullSheet(sheet: { width: number; height: number }) {
  return { width: sheet.width, height: sheet.height + stampMetrics(sheet.width, sheet.height).footerHeight };
}
type StampKey = 'drawnDate' | 'author' | 'drawnSign' | 'checkedDate' | 'checkedName' | 'checkedSign' | 'entity' | 'title' | 'date' | 'number' | 'total' | 'fileName';
/** Ячейки штампа во всю ширину листа: x0/x1 — доли ширины, r0/r1 — строки (из 3). */
const STAMP_CELLS: ReadonlyArray<{ key?: StampKey; label?: string; x0: number; x1: number; r0: number; r1: number; hint?: string }> = [
  { label: 'Fecha', x0: 0.075, x1: 0.15, r0: 0, r1: 1 }, { label: 'Nombre', x0: 0.15, x1: 0.25, r0: 0, r1: 1 }, { label: 'Firmas', x0: 0.25, x1: 0.35, r0: 0, r1: 1 },
  { label: 'Dibujado', x0: 0, x1: 0.075, r0: 1, r1: 2 }, { label: 'Comprobado', x0: 0, x1: 0.075, r0: 2, r1: 3 },
  { key: 'drawnDate', x0: 0.075, x1: 0.15, r0: 1, r1: 2, hint: 'Дата (Dibujado)' }, { key: 'author', x0: 0.15, x1: 0.25, r0: 1, r1: 2, hint: 'Автор (Dibujado)' }, { key: 'drawnSign', x0: 0.25, x1: 0.35, r0: 1, r1: 2, hint: 'Подпись (Dibujado)' },
  { key: 'checkedDate', x0: 0.075, x1: 0.15, r0: 2, r1: 3, hint: 'Дата (Comprobado)' }, { key: 'checkedName', x0: 0.15, x1: 0.25, r0: 2, r1: 3, hint: 'Проверил (Comprobado)' }, { key: 'checkedSign', x0: 0.25, x1: 0.35, r0: 2, r1: 3, hint: 'Подпись (Comprobado)' },
  { key: 'entity', label: 'Entidad', x0: 0.35, x1: 0.54, r0: 0, r1: 3, hint: 'Организация' },
  { key: 'title', label: 'Título', x0: 0.54, x1: 0.79, r0: 0, r1: 3, hint: 'Название схемы' },
  { key: 'date', label: 'Fecha', x0: 0.79, x1: 0.895, r0: 0, r1: 1, hint: 'Дата' }, { key: 'number', label: 'Núm', x0: 0.895, x1: 0.945, r0: 0, r1: 1, hint: 'Номер листа' }, { key: 'total', label: 'de', x0: 0.945, x1: 1, r0: 0, r1: 1, hint: 'Всего листов' },
  { key: 'fileName', label: 'Archivo', x0: 0.79, x1: 1, r0: 1, r1: 3, hint: 'Имя файла' },
];
function stampValue(sheet: SheetInfo, key: StampKey): string { return (sheet[key] ?? '') as string; }
const POTENTIAL_ORDER: readonly PotentialLabel[] = ['L1', 'L2', 'L3', 'N', 'PE', '+', '-'];
/** Автоматы, выключатели и защиты с ручным включением; при старте симуляции все выключены. */
const latchedTypes = new Set([2003, 2004, 2005, 2007, 5005, 5006, 5007, 5008, 5009, 6000, 6001, 6002, 6003, 6004, 6005, 6006, 6007, 6008, 6009, 6010, 6011, 6012]);
/** Тепловая защита двигателя 6007 при старте симуляции уже взведена (включена); остальные аппараты включает пользователь. */
const armedByDefaultTypes = new Set([6007]);
const startsOpen = (typeCode: number): boolean => latchedTypes.has(typeCode) && !armedByDefaultTypes.has(typeCode);
const PLACEABLE_TYPES = [1000, 1001, 1002, 1008, 1010, 1003, 1005, 1004, 1006, 1007, 1011, 1012, 1009, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 3000, 3001, 3002, 3003, 3011, 3004, 3005, 3006, 3007, 3008, 3009, 3010, 3015, 3012, 3017, 3016, 3013, 3014, 3018, 3019, 3020, 5000, 5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008, 5009, 6000, 6001, 6002, 6003, 6004, 6005, 6006, 6007, 6008, 6009, 6010, 6011, 6012, 6013, 6014, 7000, 7001, 7002, 7003, 7004, 7005, 7006, 7007, 7008, 7009, 7010, 7011, 7012, 7013, 7014, 7015, 8000, 8001, 8002, 8003, 8004, 8005, 8006, 8007, 8008, 8009, 8010, 8011, 8012, 8013, 8014, 8015, 8016, 8017, 8019, 8020, 8021, 8022, 8023, 8018, 9000, 9001, 9002, 9003, 9004, 9005, 9006, 9007, 9015, 9014, 9016, 9008, 9009, 9010, 9011, 9012, 9013];
const PLACE_DEFAULTS: Record<number, { prefix: string; size: { w: number; h: number }; labels: string[] }> = {
  1000: { prefix: 'M', size: { w: 24, h: 12 }, labels: ['U1', 'V1', 'W1', 'PE'] },
  1001: { prefix: 'M', size: { w: 24, h: 27 }, labels: ['U1', 'V1', 'W1', 'PE', 'W2', 'U2', 'V2'] },
  // Остальные двигатели панели «Motores»: размеры и метки из образца motores-elementos.cad.
  1002: { prefix: 'M', size: { w: 24, h: 24 }, labels: ['U1', 'V1', 'PE'] },
  1008: { prefix: 'M', size: { w: 24, h: 30 }, labels: ['U1', 'V1', 'PE', 'U2', 'V2'] },
  1010: { prefix: 'M', size: { w: 24, h: 30 }, labels: ['U1', 'V1', 'W1', 'PE'] },
  1003: { prefix: 'M', size: { w: 24, h: 27 }, labels: ['U1', 'V1', 'W1', 'PE', 'U2', 'V2', 'W2'] },
  1005: { prefix: 'M', size: { w: 24, h: 27 }, labels: ['U1', 'V1', 'W1', 'PE', 'U2', 'V2', 'W2'] },
  1004: { prefix: 'M', size: { w: 24, h: 27 }, labels: ['U1', 'V1', 'W1', 'PE', 'K', 'L', 'M'] },
  1006: { prefix: 'M', size: { w: 24, h: 15 }, labels: ['A1', 'A2', 'PE'] },
  1007: { prefix: 'M', size: { w: 24, h: 15 }, labels: ['A1', 'A2', 'PE', 'F1', 'F2'] },
  1011: { prefix: 'M', size: { w: 24, h: 27 }, labels: ['1', '2', '3', '4', '5', '6'] },
  1012: { prefix: 'M', size: { w: 24, h: 27 }, labels: ['1', '2', '3', '4'] },
  1009: { prefix: 'Fr', size: { w: 21, h: 15 }, labels: ['U1', 'V1', 'PE'] },
  // Контакторы и выключатели: размеры и метки из образца elementos_contactores.cad (рамка высотой 15, у 2008 — 30).
  2006: { prefix: 'KM', size: { w: 6, h: 15 }, labels: ['1', '2'] },
  2000: { prefix: 'KM', size: { w: 12, h: 15 }, labels: ['1', '3', '2', '4'] },
  2001: { prefix: 'KM', size: { w: 18, h: 15 }, labels: ['1', '3', '5', '2', '4', '6'] },
  2002: { prefix: 'KM', size: { w: 24, h: 15 }, labels: ['1', '3', '5', '7', '2', '4', '6', '8'] },
  2008: { prefix: 'KM', size: { w: 18, h: 30 }, labels: ['1', '3', '5', '2', '4', '6'] },
  2007: { prefix: 'S', size: { w: 6, h: 15 }, labels: ['1', '2'] },
  2003: { prefix: 'S', size: { w: 12, h: 15 }, labels: ['1', '3', '2', '4'] },
  2004: { prefix: 'S', size: { w: 18, h: 15 }, labels: ['1', '3', '5', '2', '4', '6'] },
  2005: { prefix: 'S', size: { w: 24, h: 15 }, labels: ['1', '3', '5', '7', '2', '4', '6', '8'] },
  2009: { prefix: '', size: { w: 24, h: 3 }, labels: [] },
  3000: { prefix: 'X', size: { w: 6, h: 3 }, labels: ['L'] },
  3001: { prefix: 'X', size: { w: 6, h: 3 }, labels: ['N'] },
  3002: { prefix: 'X', size: { w: 6, h: 3 }, labels: ['PE'] },
  3003: { prefix: 'X', size: { w: 12, h: 3 }, labels: ['L', 'N'] },
  3011: { prefix: 'X', size: { w: 18, h: 3 }, labels: ['L', 'N', 'PE'] },
  3004: { prefix: 'X', size: { w: 18, h: 3 }, labels: ['L1', 'L2', 'L3'] },
  3005: { prefix: 'X', size: { w: 24, h: 3 }, labels: ['L1', 'L2', 'L3', 'PE'] },
  3006: { prefix: 'X', size: { w: 24, h: 3 }, labels: ['L1', 'L2', 'L3', 'N'] },
  3007: { prefix: 'X', size: { w: 30, h: 3 }, labels: ['L1', 'L2', 'L3', 'N', 'PE'] },
  3008: { prefix: 'X', size: { w: 6, h: 3 }, labels: ['+'] },
  3009: { prefix: 'X', size: { w: 6, h: 3 }, labels: ['-'] },
  3010: { prefix: 'X', size: { w: 12, h: 3 }, labels: ['+', '-'] },
  3015: { prefix: '', size: { w: 8, h: 8 }, labels: ['PE'] },
  3012: { prefix: 'T', size: { w: 15, h: 18 }, labels: ['1', '2', '3', '4'] },
  3017: { prefix: 'T', size: { w: 18, h: 18 }, labels: ['1', '2', '3', '4', '5', '6'] },
  3016: { prefix: 'D', size: { w: 6, h: 15 }, labels: ['1', '2'] },
  3013: { prefix: 'V', size: { w: 15, h: 21 }, labels: ['1', '2', '3', '4'] },
  3014: { prefix: 'V', size: { w: 15, h: 21 }, labels: ['1', '2', '3', '4', 'PE'] },
  3018: { prefix: 'V', size: { w: 21, h: 21 }, labels: ['1', '2', '3', '4', '5', 'PE'] },
  3019: { prefix: 'V', size: { w: 9, h: 12 }, labels: ['+', '-'] },
  3020: { prefix: 'TC', size: { w: 9, h: 15 }, labels: [] },
  5000: { prefix: 'F', size: { w: 6, h: 15 }, labels: ['1', '2'] },
  5001: { prefix: 'F', size: { w: 12, h: 15 }, labels: ['1', '3', '2', '4'] },
  5002: { prefix: 'F', size: { w: 12, h: 15 }, labels: ['1', '3', '2', '4'] },
  5003: { prefix: 'F', size: { w: 18, h: 15 }, labels: ['1', '3', '5', '2', '4', '6'] },
  5004: { prefix: 'F', size: { w: 24, h: 15 }, labels: ['1', '3', '5', '7', '2', '4', '6', '8'] },
  5005: { prefix: 'F', size: { w: 6, h: 15 }, labels: ['1', '2'] },
  5006: { prefix: 'F', size: { w: 12, h: 15 }, labels: ['1', '3', '2', '4'] },
  5007: { prefix: 'F', size: { w: 12, h: 15 }, labels: ['1', '3', '2', '4'] },
  5008: { prefix: 'F', size: { w: 18, h: 15 }, labels: ['1', '3', '5', '2', '4', '6'] },
  5009: { prefix: 'F', size: { w: 24, h: 15 }, labels: ['1', '3', '5', '7', '2', '4', '6', '8'] },
  6000: { prefix: 'F', size: { w: 6, h: 15 }, labels: ['1', '2'] },
  6001: { prefix: 'F', size: { w: 12, h: 15 }, labels: ['1', '3', '2', '4'] },
  6002: { prefix: 'F', size: { w: 12, h: 15 }, labels: ['1', '3', '2', '4'] },
  6003: { prefix: 'F', size: { w: 18, h: 15 }, labels: ['1', '3', '5', '2', '4', '6'] },
  6004: { prefix: 'F', size: { w: 24, h: 15 }, labels: ['1', '3', '5', '7', '2', '4', '6', '8'] },
  6005: { prefix: 'F', size: { w: 12, h: 21 }, labels: ['1', '3', '2', '4'] },
  6006: { prefix: 'F', size: { w: 24, h: 21 }, labels: ['1', '3', '5', '7', '2', '4', '6', '8'] },
  6007: { prefix: 'FG', size: { w: 21, h: 15 }, labels: ['1', '3', '5', '2', '4', '6'] },
  6008: { prefix: 'Q', size: { w: 12, h: 24 }, labels: ['1', '3', '2', '4'] },
  6009: { prefix: 'Q', size: { w: 18, h: 24 }, labels: ['1', '3', '5', '2', '4', '6'] },
  6010: { prefix: 'Q', size: { w: 6, h: 24 }, labels: ['1', '2'] },
  6011: { prefix: 'Q', size: { w: 12, h: 24 }, labels: ['1', '3', '2', '4'] },
  6012: { prefix: 'Q', size: { w: 24, h: 24 }, labels: ['1', '3', '5', '7', '2', '4', '6', '8'] },
  6013: { prefix: 'F', size: { w: 12, h: 21 }, labels: ['1', '2', '3'] },
  6014: { prefix: 'F', size: { w: 24, h: 21 }, labels: ['1', '2', '3', '4', '5'] },
  7000: { prefix: 'KM', size: { w: 6, h: 15 }, labels: ['13', '14'] },
  7001: { prefix: 'KM', size: { w: 6, h: 15 }, labels: ['11', '12'] },
  7002: { prefix: 'KM', size: { w: 15, h: 15 }, labels: ['11', '13', '12', '14'] },
  7003: { prefix: 'KM', size: { w: 12, h: 15 }, labels: ['11', '12', '14'] },
  7004: { prefix: 'KM', size: { w: 6, h: 15 }, labels: ['67', '68'] },
  7005: { prefix: 'KM', size: { w: 6, h: 15 }, labels: ['55', '56'] },
  7006: { prefix: 'KM', size: { w: 15, h: 15 }, labels: ['55', '57', '56', '58'] },
  7007: { prefix: 'KM', size: { w: 12, h: 15 }, labels: ['55', '56', '58'] },
  7008: { prefix: 'KM', size: { w: 6, h: 15 }, labels: ['67', '68'] },
  7009: { prefix: 'KM', size: { w: 6, h: 15 }, labels: ['55', '56'] },
  7010: { prefix: 'KM', size: { w: 15, h: 15 }, labels: ['55', '57', '56', '58'] },
  7011: { prefix: 'KM', size: { w: 12, h: 15 }, labels: ['55', '56', '58'] },
  7012: { prefix: 'KM', size: { w: 6, h: 15 }, labels: ['67', '68'] },
  7013: { prefix: 'KM', size: { w: 6, h: 15 }, labels: ['55', '56'] },
  7014: { prefix: 'KM', size: { w: 15, h: 15 }, labels: ['55', '57', '56', '58'] },
  7015: { prefix: 'KM', size: { w: 12, h: 15 }, labels: ['55', '56', '58'] },
  // Кнопки панели «Accionamientos»: размеры и метки из образца accionamientos.cad (высота 15, у 8023 — 6×6).
  8023: { prefix: 'S', size: { w: 6, h: 6 }, labels: [] },
  8000: { prefix: 'S', size: { w: 6, h: 15 }, labels: ['13', '14'] },
  8001: { prefix: 'S', size: { w: 6, h: 15 }, labels: ['11', '12'] },
  8002: { prefix: 'S', size: { w: 15, h: 15 }, labels: ['11', '13', '12', '14'] },
  8003: { prefix: 'S', size: { w: 12, h: 15 }, labels: ['11', '12', '14'] },
  8004: { prefix: 'S', size: { w: 6, h: 15 }, labels: ['13', '14'] },
  8005: { prefix: 'S', size: { w: 6, h: 15 }, labels: ['11', '12'] },
  8006: { prefix: 'S', size: { w: 15, h: 15 }, labels: ['11', '13', '12', '14'] },
  8007: { prefix: 'S', size: { w: 12, h: 15 }, labels: ['11', '12', '14'] },
  8008: { prefix: 'S', size: { w: 6, h: 15 }, labels: ['13', '14'] },
  8009: { prefix: 'S', size: { w: 6, h: 15 }, labels: ['11', '12'] },
  8010: { prefix: 'S', size: { w: 15, h: 15 }, labels: ['11', '13', '12', '14'] },
  8011: { prefix: 'S', size: { w: 12, h: 15 }, labels: ['11', '12', '14'] },
  8012: { prefix: 'S', size: { w: 6, h: 15 }, labels: ['13', '14'] },
  8013: { prefix: 'S', size: { w: 6, h: 15 }, labels: ['11', '12'] },
  8014: { prefix: 'S', size: { w: 15, h: 15 }, labels: ['11', '13', '12', '14'] },
  8015: { prefix: 'S', size: { w: 12, h: 15 }, labels: ['11', '12', '14'] },
  8016: { prefix: 'F', size: { w: 6, h: 15 }, labels: ['97', '98'] },
  8017: { prefix: 'F', size: { w: 6, h: 15 }, labels: ['95', '96'] },
  8019: { prefix: 'F', size: { w: 12, h: 15 }, labels: ['95', '96', '98'] },
  8020: { prefix: 'S', size: { w: 12, h: 15 }, labels: ['1', '2', '3'] },
  8021: { prefix: 'S', size: { w: 18, h: 15 }, labels: ['1', '2', '3', '4'] },
  8022: { prefix: 'S', size: { w: 12, h: 15 }, labels: ['1', '2', '3', '4'] },
  // Тепловой контакт: в образце accionamientos.cad префикс -F, рамка 15×15 (раньше FG и 15×21).
  8018: { prefix: 'F', size: { w: 15, h: 15 }, labels: ['95', '97', '96', '98'] },
  9000: { prefix: 'KM', size: { w: 6, h: 21 }, labels: ['A1', 'A2'] },
  9004: { prefix: 'KT', size: { w: 6, h: 21 }, labels: ['A1', 'A2'] },
  9008: { prefix: 'H', size: { w: 6, h: 21 }, labels: ['X1', 'X2'] },
  // Остальные кнопки панели «Bobinas…»: размеры и метки из образца elementos_bobinas.cad.
  9001: { prefix: 'K', size: { w: 9, h: 15 }, labels: ['A1', 'B1', 'A2'] },
  9002: { prefix: 'K', size: { w: 9, h: 15 }, labels: ['A1', 'A2'] },
  9003: { prefix: 'EV', size: { w: 9, h: 15 }, labels: ['A1', 'A2'] },
  9005: { prefix: 'K', size: { w: 9, h: 15 }, labels: ['A1', 'A2'] },
  9006: { prefix: 'K', size: { w: 9, h: 15 }, labels: ['A1', 'A2'] },
  9007: { prefix: 'K', size: { w: 9, h: 15 }, labels: ['A1', 'A2'] },
  9015: { prefix: 'K', size: { w: 9, h: 15 }, labels: ['A1', 'A2'] },
  9014: { prefix: 'K', size: { w: 9, h: 15 }, labels: ['A1', 'A2'] },
  9016: { prefix: 'C', size: { w: 18, h: 15 }, labels: ['A1', 'C', 'D', 'R', 'A2'] },
  9009: { prefix: 'H', size: { w: 9, h: 15 }, labels: ['X1', 'X2'] },
  9010: { prefix: 'H', size: { w: 9, h: 15 }, labels: ['X1', 'X2'] },
  9011: { prefix: 'H', size: { w: 9, h: 15 }, labels: ['X1', 'X2'] },
  9012: { prefix: 'H', size: { w: 9, h: 15 }, labels: ['X1', 'X2'] },
  9013: { prefix: 'H', size: { w: 9, h: 15 }, labels: ['X1', 'X2'] },
};
/** Смещение подписи при размещении, как у образца elementos_contactores.cad: имя стоит слева от символа, а не поверх полюсов. */
const PLACE_LABEL_OFFSETS: Record<number, { x: number; y: number }> = {
  2000: { x: -12, y: -3 }, 2001: { x: -12, y: -3 }, 2002: { x: -12, y: -3 }, 2006: { x: -12, y: -3 }, 2008: { x: -12, y: -3 },
  2003: { x: -18, y: -3 }, 2004: { x: -18, y: -3 }, 2005: { x: -18, y: -3 }, 2007: { x: -18, y: -3 },
  2009: { x: -6, y: -6 },
  // Вспомогательные контакты: смещения подписи из образца contactos_elementos.cad (мгновенные -12, с выдержкой -15).
  7000: { x: -12, y: -3 }, 7001: { x: -12, y: -3 }, 7002: { x: -12, y: -3 }, 7003: { x: -12, y: -3 },
  7004: { x: -15, y: -3 }, 7005: { x: -15, y: -3 }, 7006: { x: -15, y: -3 }, 7007: { x: -15, y: -3 },
  7008: { x: -15, y: -3 }, 7009: { x: -15, y: -3 }, 7010: { x: -15, y: -3 }, 7011: { x: -15, y: -3 },
  7012: { x: -15, y: -3 }, 7013: { x: -15, y: -3 }, 7014: { x: -15, y: -3 }, 7015: { x: -15, y: -3 },
  // Двигатели: смещения подписи из образца motores-elementos.cad.
  1002: { x: -12, y: -6 }, 1008: { x: -12, y: -6 }, 1010: { x: -12, y: -6 }, 1003: { x: -12, y: -6 }, 1005: { x: -12, y: -6 }, 1004: { x: -12, y: -6 },
  1006: { x: -3, y: -12 }, 1007: { x: -3, y: -12 }, 1011: { x: -12, y: -6 }, 1012: { x: -12, y: -6 }, 1009: { x: -12, y: -3 },
  // Катушки и сигнализация: смещение подписи из образца elementos_bobinas.cad.
  9001: { x: -15, y: -3 }, 9002: { x: -15, y: -3 }, 9003: { x: -15, y: -3 }, 9005: { x: -15, y: -3 }, 9006: { x: -15, y: -3 }, 9007: { x: -15, y: -3 },
  9014: { x: -15, y: -3 }, 9015: { x: -15, y: -3 }, 9016: { x: -15, y: -3 }, 9009: { x: -15, y: -3 }, 9010: { x: -15, y: -3 }, 9011: { x: -15, y: -3 }, 9012: { x: -15, y: -3 }, 9013: { x: -15, y: -3 },
};
type Theme = 'light' | 'dark';
const THEME_KEY = 'cadesimu-theme';
const GRID_KEY = 'cadesimu-grid';
const INTERFACE_LANGUAGE_KEY = 'cadesimu-language';
const INTERFACE_TEXT = {
  es: {
    file: 'Archivo', edit: 'Editar', view: 'Ver', elementsMenu: 'Elementos', optionalGroups: 'Mostrar categorías adicionales', extraGrafcet: 'GRAFCET', extraLadder: 'Ladder', extraLogic: 'Lógica', extraReal2d: 'Símbolos realistas · 2D', extraReal3d: 'Símbolos realistas · 3D', extraWiring: 'Cables y conexiones', extraPneumatics: 'Actuadores neumáticos', extraIoPlc: 'Entradas / salidas PLC', extraPowerElectronics: 'Electrónica de potencia', extraElectronicRelays: 'Relés electrónicos', language: 'Idioma', examples: 'Ejemplos', help: 'Ayuda',
    new: 'Nuevo esquema', open: 'Abrir .cad / .json', save: 'Guardar JSON', export: 'Exportar .cad', exportSvg: 'Exportar SVG', printPdf: 'Imprimir / PDF', sheet: 'Tamaño de hoja…',
    copy: 'Copiar', paste: 'Pegar', undo: 'Deshacer', redo: 'Rehacer', rotate: 'Girar', delete: 'Eliminar', zoomIn: 'Acercar', zoomOut: 'Alejar', fit: 'Ajustar vista', shortcuts: 'Atajos de teclado', about: 'Acerca de',
    languageNames: 'Idioma de la interfaz y los elementos', wiresSimulation: 'Cables y simulación', wires: 'Cables', wireType: 'Tipo de cable', phase: 'Fase', neutral: 'Neutro', three: '3 fases (L1 L2 L3)', threeN: '3 fases + N', wire: 'Cable', done: 'Hecho', cancel: 'Cancelar', cursor: 'Cursor', hand: 'Mano',
    simulation: 'Control de simulación', run: 'Iniciar', stop: 'Detener', stopTitle: 'Detención completa: reiniciar tiempo, memoria y botones pulsados', speed: 'Velocidad de simulación', editor: 'Editor', place: 'Colocar elemento', showAll: 'Mostrar todo',
    elements: 'Elementos', search: 'Buscar elementos…', properties: 'Propiedades', selectElement: 'Selecciona un elemento en la hoja para editar sus propiedades.', schematic: 'Área de trabajo del esquema', elementCount: '{count} elementos', running: 'Simulación en marcha',
    status: 'Selecciona un archivo .cad para abrir un esquema.', zoom: 'Zoom', helpCanvas: 'Clic: seleccionar · Arrastrar: mover · Marco: seleccionar área vacía · Espacio / botón central: desplazar',
    sheetSize: 'Tamaño de hoja', format: 'Formato', custom: 'Personalizado', landscape: 'apaisado', portrait: 'vertical', width: 'Ancho, mm', height: 'Alto, mm', apply: 'Aplicar',
    themeLight: 'Tema claro', themeDark: 'Tema oscuro', gridHide: 'Ocultar cuadrícula', gridShow: 'Mostrar cuadrícula', selectedMany: 'Selecciona un solo elemento para ver sus propiedades.', noWireProperties: 'Los cables no tienen propiedades editables.', missingElement: 'No se encontró el elemento.', name: 'Nombre', function: 'Función', terminals: 'Etiquetas de terminales', terminal: 'Terminal', lampColor: 'Color de lámpara', delay: 'Retardo, s',
    newTitle: '¿Crear un esquema nuevo?', newWarning: 'El esquema actual y su historial de cambios se borrarán.', create: 'Crear',
    shortcutsTitle: 'Atajos de teclado', aboutText: 'Editor de esquemas eléctricos y simulador de lógica de relés.', author: 'Autor', version: 'Versión', close: 'Cerrar',
    overload: 'Simular sobrecarga', reset: 'Restablecer entradas', green: 'Verde', red: 'Rojo', yellow: 'Amarillo', contactor1: 'Contactor 1 (KM1)', contactor2: 'Contactor 2 (KM2)',
  },
  en: {
    file: 'File', edit: 'Edit', view: 'View', elementsMenu: 'Components', optionalGroups: 'Show additional categories', extraGrafcet: 'GRAFCET', extraLadder: 'Ladder', extraLogic: 'Logic', extraReal2d: 'Realistic symbols · 2D', extraReal3d: 'Realistic symbols · 3D', extraWiring: 'Wires and connections', extraPneumatics: 'Pneumatic actuators', extraIoPlc: 'PLC inputs / outputs', extraPowerElectronics: 'Power electronics', extraElectronicRelays: 'Electronic relays', language: 'Language', examples: 'Examples', help: 'Help',
    new: 'New schematic', open: 'Open .cad / .json', save: 'Save JSON', export: 'Export .cad', exportSvg: 'Export SVG', printPdf: 'Print / PDF', sheet: 'Sheet size…',
    copy: 'Copy', paste: 'Paste', undo: 'Undo', redo: 'Redo', rotate: 'Rotate', delete: 'Delete', zoomIn: 'Zoom in', zoomOut: 'Zoom out', fit: 'Fit view', shortcuts: 'Keyboard shortcuts', about: 'About',
    languageNames: 'Interface and component language', wiresSimulation: 'Wires and simulation', wires: 'Wires', wireType: 'New wire type', phase: 'Phase', neutral: 'Neutral', three: '3 phases (L1 L2 L3)', threeN: '3 phases + N', wire: 'Wire', done: 'Done', cancel: 'Cancel', cursor: 'Cursor', hand: 'Pan',
    simulation: 'Simulation controls', run: 'Run', stop: 'Stop', stopTitle: 'Stop and reset time, memory, and pressed buttons', speed: 'Simulation speed', editor: 'Editor', place: 'Place component', showAll: 'Show all',
    elements: 'Components', search: 'Search components…', properties: 'Properties', selectElement: 'Select a component on the sheet to edit its properties.', schematic: 'Schematic workspace', elementCount: '{count} components', running: 'Simulation running',
    status: 'Choose a .cad file to open a schematic.', zoom: 'Zoom', helpCanvas: 'Click: select · Drag: move · Box: select empty area · Space / middle button: pan',
    sheetSize: 'Sheet size', format: 'Format', custom: 'Custom', landscape: 'landscape', portrait: 'portrait', width: 'Width, mm', height: 'Height, mm', apply: 'Apply',
    themeLight: 'Light theme', themeDark: 'Dark theme', gridHide: 'Hide grid', gridShow: 'Show grid', selectedMany: 'Select one component to view its properties.', noWireProperties: 'Wires have no editable properties.', missingElement: 'Component not found.', name: 'Name', function: 'Function', terminals: 'Terminal labels', terminal: 'Terminal', lampColor: 'Lamp color', delay: 'Delay, s',
    newTitle: 'Create a new schematic?', newWarning: 'The current schematic and its undo history will be cleared.', create: 'Create',
    shortcutsTitle: 'Keyboard shortcuts', aboutText: 'Electrical schematic editor and relay logic simulator.', author: 'Author', version: 'Version', close: 'Close',
    overload: 'Simulate overload', reset: 'Reset inputs', green: 'Green', red: 'Red', yellow: 'Yellow', contactor1: 'Contactor 1 (KM1)', contactor2: 'Contactor 2 (KM2)',
  },
  it: {
    file: 'File', edit: 'Modifica', view: 'Visualizza', elementsMenu: 'Elementi', optionalGroups: 'Mostra categorie aggiuntive', extraGrafcet: 'GRAFCET', extraLadder: 'Ladder', extraLogic: 'Logica', extraReal2d: 'Simboli realistici · 2D', extraReal3d: 'Simboli realistici · 3D', extraWiring: 'Cavi e connessioni', extraPneumatics: 'Attuatori pneumatici', extraIoPlc: 'Ingressi / uscite PLC', extraPowerElectronics: 'Elettronica di potenza', extraElectronicRelays: 'Relè elettronici', language: 'Lingua', examples: 'Esempi', help: 'Aiuto',
    new: 'Nuovo schema', open: 'Apri .cad / .json', save: 'Salva JSON', export: 'Esporta .cad', exportSvg: 'Esporta SVG', printPdf: 'Stampa / PDF', sheet: 'Dimensioni foglio…',
    copy: 'Copia', paste: 'Incolla', undo: 'Annulla', redo: 'Ripeti', rotate: 'Ruota', delete: 'Elimina', zoomIn: 'Ingrandisci', zoomOut: 'Riduci', fit: 'Adatta vista', shortcuts: 'Scorciatoie da tastiera', about: 'Informazioni',
    languageNames: 'Lingua dell’interfaccia e degli elementi', wiresSimulation: 'Cavi e simulazione', wires: 'Cavi', wireType: 'Tipo di cavo', phase: 'Fase', neutral: 'Neutro', three: '3 fasi (L1 L2 L3)', threeN: '3 fasi + N', wire: 'Cavo', done: 'Fine', cancel: 'Annulla', cursor: 'Cursore', hand: 'Mano',
    simulation: 'Controlli simulazione', run: 'Avvia', stop: 'Arresta', stopTitle: 'Arresto completo: azzera tempo, memoria e pulsanti premuti', speed: 'Velocità simulazione', editor: 'Editor', place: 'Inserisci elemento', showAll: 'Mostra tutto',
    elements: 'Elementi', search: 'Cerca elementi…', properties: 'Proprietà', selectElement: 'Seleziona un elemento sul foglio per modificarne le proprietà.', schematic: 'Area di lavoro dello schema', elementCount: '{count} elementi', running: 'Simulazione in esecuzione',
    status: 'Seleziona un file .cad per aprire uno schema.', zoom: 'Zoom', helpCanvas: 'Clic: seleziona · Trascina: sposta · Riquadro: seleziona area vuota · Spazio / pulsante centrale: panoramica',
    sheetSize: 'Dimensioni foglio', format: 'Formato', custom: 'Personalizzato', landscape: 'orizzontale', portrait: 'verticale', width: 'Larghezza, mm', height: 'Altezza, mm', apply: 'Applica',
    themeLight: 'Tema chiaro', themeDark: 'Tema scuro', gridHide: 'Nascondi griglia', gridShow: 'Mostra griglia', selectedMany: 'Seleziona un solo elemento per visualizzarne le proprietà.', noWireProperties: 'I cavi non hanno proprietà modificabili.', missingElement: 'Elemento non trovato.', name: 'Nome', function: 'Funzione', terminals: 'Etichette dei terminali', terminal: 'Terminale', lampColor: 'Colore lampada', delay: 'Ritardo, s',
    newTitle: 'Creare un nuovo schema?', newWarning: 'Lo schema attuale e la cronologia delle modifiche verranno eliminati.', create: 'Crea',
    shortcutsTitle: 'Scorciatoie da tastiera', aboutText: 'Editor di schemi elettrici e simulatore di logica a relè.', author: 'Autore', version: 'Versione', close: 'Chiudi',
    overload: 'Simula sovraccarico', reset: 'Azzera ingressi', green: 'Verde', red: 'Rosso', yellow: 'Giallo', contactor1: 'Contattore 1 (KM1)', contactor2: 'Contattore 2 (KM2)',
  },
  ru: {
    file: 'Файл', edit: 'Правка', view: 'Вид', elementsMenu: 'Элементы', optionalGroups: 'Показывать дополнительные категории', extraGrafcet: 'GRAFCET', extraLadder: 'Ladder', extraLogic: 'Логика', extraReal2d: 'Реалистичные символы · 2D', extraReal3d: 'Реалистичные символы · 3D', extraWiring: 'Провода и соединения', extraPneumatics: 'Пневматические актуаторы', extraIoPlc: 'Входы / выходы ПЛК', extraPowerElectronics: 'Силовая электроника', extraElectronicRelays: 'Электронные реле', language: 'Язык', examples: 'Примеры', help: 'Справка',
    new: 'Новая схема', open: 'Открыть .cad / .json', save: 'Сохранить JSON', export: 'Экспорт .cad', exportSvg: 'Экспорт SVG', printPdf: 'Печать / PDF', sheet: 'Размер листа…',
    copy: 'Копировать', paste: 'Вставить', undo: 'Отменить', redo: 'Повторить', rotate: 'Повернуть', delete: 'Удалить', zoomIn: 'Увеличить', zoomOut: 'Уменьшить', fit: 'Показать всё', shortcuts: 'Горячие клавиши', about: 'О программе',
    languageNames: 'Язык интерфейса и названий элементов', wiresSimulation: 'Провода и симуляция', wires: 'Провода', wireType: 'Тип нового провода', phase: 'Фаза', neutral: 'Нейтраль', three: '3 фазы (L1 L2 L3)', threeN: '3 фазы + N', wire: 'Провод', done: 'Готово', cancel: 'Отмена', cursor: 'Курсор', hand: 'Рука',
    simulation: 'Управление симуляцией', run: 'Запуск', stop: 'Стоп', stopTitle: 'Полная остановка: сброс времени, памяти и нажатых кнопок', speed: 'Скорость симуляции', editor: 'Редактор', place: 'Разместить элемент', showAll: 'Показать всё',
    elements: 'Элементы', search: 'Поиск элементов…', properties: 'Свойства', selectElement: 'Выберите элемент на листе, чтобы изменить его свойства.', schematic: 'Поле схемы', elementCount: '{count} элементов', running: 'Симуляция запущена',
    status: 'Выберите файл .cad, чтобы открыть схему.', zoom: 'Масштаб', helpCanvas: 'Клик — выбрать · Перетащить — двигать · Рамка — пустое место · Пробел / средняя кнопка — панорама',
    sheetSize: 'Размер листа', format: 'Формат', custom: 'Пользовательский', landscape: 'альбомный', portrait: 'книжный', width: 'Ширина, мм', height: 'Высота, мм', apply: 'Применить',
    themeLight: 'Светлая тема', themeDark: 'Тёмная тема', gridHide: 'Скрыть сетку', gridShow: 'Показать сетку', selectedMany: 'Выберите один элемент, чтобы изменить его свойства.', noWireProperties: 'Для проводов нет редактируемых свойств.', missingElement: 'Элемент не найден.', name: 'Имя', function: 'Функция', terminals: 'Метки клемм', terminal: 'Клемма', lampColor: 'Цвет лампы', delay: 'Выдержка, с',
    newTitle: 'Создать новую схему?', newWarning: 'Текущая схема и история изменений будут очищены.', create: 'Создать',
    shortcutsTitle: 'Горячие клавиши', aboutText: 'Редактор электрических схем и симулятор релейной логики.', author: 'Автор', version: 'Версия', close: 'Закрыть',
    overload: 'Имитировать перегрузку', reset: 'Сбросить входы', green: 'Зелёная', red: 'Красная', yellow: 'Жёлтая', contactor1: 'Контактор 1 (KM1)', contactor2: 'Контактор 2 (KM2)',
  },
} satisfies Record<Lang, Record<string, string>>;

function readGridVisible(): boolean {
  try { return localStorage.getItem(GRID_KEY) !== 'off'; } catch { return true; }
}

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* Storage may be unavailable in private or embedded contexts. */ }
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function svgPoint(event: MouseEvent | WheelEvent, svg: SVGSVGElement, viewSize: Point): Point {
  const rect = svg.getBoundingClientRect();
  return {
    x: rect.width > 0 ? (event.clientX - rect.left) * viewSize.x / rect.width : viewSize.x / 2,
    y: rect.height > 0 ? (event.clientY - rect.top) * viewSize.y / rect.height : viewSize.y / 2,
  };
}

function lineElement(wire: WireSegment): SVGLineElement {
  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', String(wire.from.x));
  line.setAttribute('y1', String(wire.from.y));
  line.setAttribute('x2', String(wire.to.x));
  line.setAttribute('y2', String(wire.to.y));
  line.setAttribute('stroke', IDLE_WIRE_COLORS[wire.kind]);
  line.setAttribute('stroke-width', String(Math.max(1, wire.thickness || 1) * 1.35));
  line.setAttribute('stroke-linecap', 'square');
  line.setAttribute('vector-effect', 'non-scaling-stroke');
  line.setAttribute('data-wire-id', String(wire.id));
  return line;
}

function junctionElement(wire: WireSegment): SVGCircleElement {
  const dot = document.createElementNS(SVG_NS, 'circle');
  dot.setAttribute('cx', String(wire.from.x));
  dot.setAttribute('cy', String(wire.from.y));
  dot.setAttribute('r', '1.15');
  dot.setAttribute('fill', IDLE_WIRE_COLORS.junction);
  dot.setAttribute('data-junction-id', String(wire.id));
  dot.setAttribute('data-wire-id', String(wire.id));
  return dot;
}

function fitBounds(bounds: { minX: number; minY: number; maxX: number; maxY: number }, screen: Point): Viewport {
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.min((screen.x - 80) / width, (screen.y - 80) / height, 8);
  return {
    scale: Math.max(0.2, scale),
    offsetX: (screen.x - width * scale) / 2 - bounds.minX * scale,
    offsetY: (screen.y - height * scale) / 2 - bounds.minY * scale,
  };
}

type Selectable = { kind: 'element' | 'wire'; id: number };
type DragState =
  | { mode: 'pan'; pointerId: number; last: Point }
  | { mode: 'move'; pointerId: number; start: Point; objects: Array<{ item: Selectable; position?: Point; from?: Point; to?: Point }> }
  | { mode: 'resize'; pointerId: number; wireId: number; end: 'from' | 'to'; original: Point }
  | { mode: 'marquee'; pointerId: number; start: Point; current: Point; additive: boolean };

function selectionKey(item: Selectable): string { return `${item.kind}:${item.id}`; }

function normalizedBounds(a: Point, b: Point) {
  return { minX: Math.min(a.x, b.x), minY: Math.min(a.y, b.y), maxX: Math.max(a.x, b.x), maxY: Math.max(a.y, b.y) };
}

function overlaps(a: ReturnType<typeof normalizedBounds>, b: ReturnType<typeof normalizedBounds>): boolean {
  return a.maxX >= b.minX && a.minX <= b.maxX && a.maxY >= b.minY && a.minY <= b.maxY;
}

function nextElementName(prefix: string, schema: Schema): string {
  const used = new Set(schema.elements.map((element) => element.name));
  let suffix = 1;
  while (used.has(`${prefix}${suffix}`)) suffix += 1;
  return `${prefix}${suffix}`;
}

function createPlacedElement(typeCode: number, position: Point, rotation: 0 | 1 | 2 | 3, schema: Schema): Schema['elements'][number] {
  const defaults = PLACE_DEFAULTS[typeCode];
  if (!defaults) throw new RangeError(`Нет шаблона размещения для CAD-типа ${typeCode}.`);
  const info = getCadType(typeCode);
  const id = Math.max(0, ...schema.elements.map((element) => element.id), ...schema.wires.map((wire) => wire.id)) + 1;
  const size = frameSize(defaults.size, rotation);
  const terminals = buildTerminals(info, defaults.labels.length, size, rotation, defaults.labels);
  const element: Schema['elements'][number] = {
    id, typeCode, name: defaults.prefix ? nextElementName(defaults.prefix, schema) : '', func: info.label,
    position: snapPointToGrid(position, 3), rotation, size: { ...size },
    labelOffset: PLACE_LABEL_OFFSETS[typeCode] ? { ...PLACE_LABEL_OFFSETS[typeCode] } : { x: defaults.size.w / 2, y: -3 }, terminals, params: {},
  };
  // Блокировка не имеет клемм: в name и func лежат имена двух блокируемых контакторов.
  if (typeCode === 2009) { element.name = 'KM1'; element.func = 'KM2'; }
  element.position = clampElementPosition(element.position, element, schema.sheet);
  return element;
}

function cloneSchema(schema: Schema): Schema { return structuredClone(schema); }

/** Mount the SVG viewer for a CADe SIMU sheet. */
export function mountApp(root: HTMLElement): void {
  const autosavedSchema = readAutosavedSchema();
  let schema: Schema = autosavedSchema ?? createEmptySchema();
  let history = createHistory(cloneSchema(schema));
  let autosaveTimer: ReturnType<typeof setTimeout> | undefined;
  const persistSchemaNow = (): void => {
    if (autosaveTimer !== undefined) clearTimeout(autosaveTimer);
    autosaveTimer = undefined;
    try { localStorage.setItem(AUTOSAVE_KEY, serializeSchemaJson(schema)); } catch { /* Editor remains usable when storage is unavailable. */ }
  };
  const persistSchema = (): void => {
    if (autosaveTimer !== undefined) return;
    autosaveTimer = setTimeout(() => {
      persistSchemaNow();
    }, 500);
  };
  let theme = readTheme();
  let refreshInterface = (): void => {};
  const visibleOptionalGroups = new Set<GroupKey>(readOptionalPaletteGroups());
  root.innerHTML = `
    <main class="app-shell">
      <header class="app-header">
        <div class="brand-lockup" title="Редактор и симулятор электрических схем">
          <span class="brand-mark" aria-hidden="true">CS</span>
          <h1>CADe SIMU <span>Web</span></h1>
        </div>
        <nav class="app-menu" aria-label="Главное меню">
          <details class="menu-group"><summary>Файл</summary><div class="menu-popover">
            <button type="button" class="menu-command" data-command="new">Новая схема <kbd>Ctrl+N</kbd></button>
            <button type="button" class="menu-command" data-command="open">Открыть .cad / .json <kbd>Ctrl+O</kbd></button>
            <button type="button" class="menu-command" data-command="save-json">Сохранить JSON <kbd>Ctrl+S</kbd></button>
            <button type="button" class="menu-command" data-command="export-cad">Экспорт .cad</button>
            <button type="button" class="menu-command" data-command="export-svg">Экспорт SVG</button>
            <button type="button" class="menu-command" data-command="print-pdf">Печать / PDF</button>
            <button type="button" class="menu-command" data-command="sheet">Размер листа (Ajustar hoja)…</button>
          </div></details>
          <details class="menu-group"><summary>Правка</summary><div class="menu-popover">
            <button type="button" class="menu-command" data-command="copy-selection">Копировать <kbd>Ctrl+C</kbd></button>
            <button type="button" class="menu-command" data-command="paste-selection" disabled>Вставить <kbd>Ctrl+V</kbd></button>
            <button type="button" class="menu-command" data-command="undo">Отменить <kbd>Ctrl+Z</kbd></button>
            <button type="button" class="menu-command" data-command="redo">Повторить <kbd>Ctrl+Y</kbd></button>
            <button type="button" class="menu-command" data-command="rotate">Повернуть <kbd>R</kbd></button>
            <button type="button" class="menu-command" data-command="delete">Удалить <kbd>Del</kbd></button>
          </div></details>
          <details class="menu-group"><summary>Вид</summary><div class="menu-popover">
            <button type="button" class="menu-command" data-command="zoom-in">Увеличить <kbd>+</kbd></button>
            <button type="button" class="menu-command" data-command="zoom-out">Уменьшить <kbd>−</kbd></button>
            <button type="button" class="menu-command" data-command="fit">Показать всё <kbd>Ctrl+0</kbd></button>
            <button type="button" class="menu-command" data-command="grid" id="grid-command"></button>
            <button type="button" class="menu-command" data-command="theme" id="theme-command"></button>
          </div></details>
          <details class="menu-group optional-groups-menu"><summary>Элементы</summary><div class="menu-popover">
            <p class="menu-heading optional-groups-heading">Показывать дополнительные категории</p>
            <div class="menu-toggle-list">
              <label class="menu-toggle"><input type="checkbox" data-optional-group="grafcet"><span data-extra-label="extraGrafcet">GRAFCET</span></label>
              <label class="menu-toggle"><input type="checkbox" data-optional-group="ladder"><span data-extra-label="extraLadder">Ladder</span></label>
              <label class="menu-toggle"><input type="checkbox" data-optional-group="logic"><span data-extra-label="extraLogic">Логика</span></label>
              <label class="menu-toggle"><input type="checkbox" data-optional-group="realistic-2d"><span data-extra-label="extraReal2d">Реалистичные символы · 2D</span></label>
              <label class="menu-toggle"><input type="checkbox" data-optional-group="realistic-3d"><span data-extra-label="extraReal3d">Реалистичные символы · 3D</span></label>
              <label class="menu-toggle"><input type="checkbox" data-optional-group="wiring"><span data-extra-label="extraWiring">Провода и соединения</span></label>
              <label class="menu-toggle"><input type="checkbox" data-optional-group="pneumatics"><span data-extra-label="extraPneumatics">Пневматические актуаторы</span></label>
              <label class="menu-toggle"><input type="checkbox" data-optional-group="io-plc"><span data-extra-label="extraIoPlc">Входы / выходы ПЛК</span></label>
              <label class="menu-toggle"><input type="checkbox" data-optional-group="power-electronics"><span data-extra-label="extraPowerElectronics">Силовая электроника</span></label>
              <label class="menu-toggle"><input type="checkbox" data-optional-group="electronic-relays"><span data-extra-label="extraElectronicRelays">Электронные реле</span></label>
            </div>
          </div></details>
          <details class="menu-group language-menu"><summary>Язык</summary><div class="menu-popover">
            <label class="menu-language">Язык названий элементов
              <select id="palette-language" aria-label="Язык названий"><option value="es">ES — Español</option><option value="en">EN — English</option><option value="it">IT — Italiano</option><option value="ru">RU — Русский</option></select>
            </label>
          </div></details>
          <details class="menu-group"><summary>Примеры</summary><div class="menu-popover">
            <div class="menu-examples">${EXAMPLES.map((example) => `<button type="button" class="menu-command" data-example="${example.number}" title="Actividad ${example.code}"><span>${example.number}. ${example.title}</span><kbd>${example.code}</kbd></button>`).join('')}</div>
          </div></details>
          <details class="menu-group"><summary>Справка</summary><div class="menu-popover">
            <button type="button" class="menu-command" data-command="shortcuts">Горячие клавиши</button>
            <button type="button" class="menu-command" data-command="about">О программе</button>
          </div></details>
        </nav>
        <span id="file-name" class="file-name">Новая схема</span>
        <input id="cad-file" type="file" accept=".cad,.json,application/json,text/plain" />
      </header>
      <section class="viewport-toolbar" aria-label="Провода и симуляция">
        <div class="tool-group wire-controls" aria-label="Провода">
          <select id="wire-kind" aria-label="Тип нового провода"><option value="phase">Фаза</option><option value="neutral">Нейтраль</option><option value="protection">PE</option><option value="three">3 фазы (L1 L2 L3)</option><option value="threeN">3 фазы + N</option></select>
          <button type="button" id="draw-wire">Провод</button>
          <button type="button" id="finish-wire" disabled>Готово</button>
          <span class="tool-sep" aria-hidden="true"></span>
          <button type="button" id="undo" class="icon-btn" title="Отменить (Ctrl+Z)" aria-label="Отменить" disabled>↶</button>
          <button type="button" id="redo" class="icon-btn" title="Повторить (Ctrl+Y)" aria-label="Повторить" disabled>↷</button>
          <span class="tool-sep" aria-hidden="true"></span>
          <button type="button" id="select-tool" class="icon-btn is-active" title="Курсор: выбор и перемещение элементов (V)" aria-label="Курсор" aria-pressed="true">↖</button>
          <button type="button" id="pan-tool" class="icon-btn" title="Рука: перемещение листа без выбора элементов (H)" aria-label="Рука" aria-pressed="false">✋</button>
        </div>
        <div class="tool-group simulation-controls" aria-label="Управление симуляцией">
          <button type="button" id="sim-run">▶ Запуск</button>
          <button type="button" id="sim-stop" title="Полная остановка: сброс времени, памяти и нажатых кнопок" disabled>■ Стоп</button>
          <div class="simulation-speed" role="group" aria-label="Скорость симуляции"><button type="button" class="speed-btn" id="speed-cycle" title="Изменить скорость симуляции" aria-label="Скорость симуляции: 1×">1×</button></div>
          <span id="sim-state" class="simulation-state" role="status" aria-live="polite">Редактор</span>
        </div>
      </section>
      <!-- Служебные элементы: действия доступны через меню и горячие клавиши, логика привязана к ним по id -->
      <div hidden>
        <select id="place-type" aria-label="Разместить элемент"><option value="">—</option>${PLACEABLE_TYPES.map((code) => `<option value="${code}">${getCadType(code).label}</option>`).join('')}</select>
        <button type="button" id="rotate-selection">Повернуть</button>
        <button type="button" id="delete-selection">Удалить</button>
        <button type="button" data-zoom="out">−</button><button type="button" data-zoom="in">+</button><button type="button" data-zoom="fit">Показать всё</button>
      </div>
      <div id="simulation-message" class="simulation-message" role="alert" aria-live="assertive" hidden></div>
      <div class="editor-workspace">
        <aside class="component-palette" aria-label="Палитра элементов">
          <div class="palette-heading"><h2>Элементы</h2><span id="palette-count"></span></div>
          <div class="palette-search-row">
            <input id="palette-search" type="search" placeholder="Поиск элементов…" aria-label="Поиск элементов" />
          </div>
          <div id="palette-groups" class="palette-groups"></div>
        </aside>
        <section class="viewport-stage" aria-label="Поле схемы">
        <svg class="viewport-svg" viewBox="0 0 ${FALLBACK_VIEWPORT.width} ${FALLBACK_VIEWPORT.height}" preserveAspectRatio="none" role="img" aria-label="Поле схемы">
          <defs><pattern id="cad-grid" width="${CAD_GRID_STEP}" height="${CAD_GRID_STEP}" patternUnits="userSpaceOnUse">
            <path d="M ${CAD_GRID_STEP} 0 H 0 V ${CAD_GRID_STEP}" fill="none" stroke="#dfe5ec" stroke-width="0.28" />
          </pattern></defs>
          <rect class="viewport-backdrop" x="0" y="0" width="${FALLBACK_VIEWPORT.width}" height="${FALLBACK_VIEWPORT.height}" />
          <g id="sheet-transform">
            <rect id="sheet-paper" x="0" y="0" width="279" height="210" fill="#fff" />
            <rect id="sheet-grid" x="0" y="0" width="279" height="210" fill="url(#cad-grid)" />
            <rect id="sheet-border" x="0" y="0" width="279" height="210" fill="none" stroke="#aeb8c4" stroke-width="0.8" />
            <g id="wire-layer" />
            <g id="element-layer" />
            <g id="selection-layer" />
            <g id="draft-layer" />
            <g id="sheet-frame" />
            <g id="sheet-stamp" />
          </g>
        </svg>
        </section>
        <aside id="properties-panel" class="properties-panel" aria-label="Свойства элемента">
          <h2>Свойства</h2><div id="property-fields" class="property-fields"></div>
        </aside>
      </div>
      <footer class="app-footer">
        <div id="status" class="status-bar" role="status" aria-live="polite">Выберите файл .cad, чтобы открыть схему.</div>
        <output id="zoom-value" class="zoom-value" aria-live="polite" title="Масштаб">100%</output>
        <span class="viewport-help">Клик — выбрать · Перетащить — двигать · Рамка — пустое место · Пробел / средняя кнопка — панорама</span>
      </footer>
      <dialog id="confirm-new-dialog" class="app-dialog" aria-labelledby="confirm-new-title">
        <h2 id="confirm-new-title">Создать новую схему?</h2>
        <p>Текущая схема будет очищена, а её историю отмены нельзя будет восстановить.</p>
        <div class="dialog-actions"><button type="button" data-dialog-close="confirm-new-dialog">Отмена</button><button type="button" class="primary-action" id="confirm-new">Создать</button></div>
      </dialog>
      <dialog id="sheet-dialog" class="app-dialog sheet-dialog" aria-labelledby="sheet-title">
        <h2 id="sheet-title">Размер листа</h2>
        <div class="sheet-fields">
          <label class="property-field">Формат
            <select id="sheet-format">
              <option value="custom">Пользовательский</option><option value="279x210">A4 — альбомный</option><option value="210x279">A4 — книжный</option><option value="420x297">A3 — альбомный</option><option value="297x420">A3 — книжный</option>
            </select>
          </label>
          <div class="sheet-size-row">
            <label class="property-field">Ширина, мм<input id="sheet-width" type="number" min="30" max="2000" step="1" /></label>
            <label class="property-field">Высота, мм<input id="sheet-height" type="number" min="30" max="2000" step="1" /></label>
          </div>
        </div>
        <div class="dialog-actions"><button type="button" data-dialog-close="sheet-dialog">Отмена</button><button type="button" class="primary-action" id="sheet-apply">Применить</button></div>
      </dialog>
      <dialog id="shortcuts-dialog" class="app-dialog shortcuts-dialog" aria-labelledby="shortcuts-title">
        <h2 id="shortcuts-title">Горячие клавиши</h2>
        <dl>
          <div><dt>Новая схема</dt><dd><kbd>Ctrl</kbd> + <kbd>N</kbd></dd></div>
          <div><dt>Открыть файл .cad</dt><dd><kbd>Ctrl</kbd> + <kbd>O</kbd></dd></div>
          <div><dt>Копировать / вставить выделенное</dt><dd><kbd>Ctrl</kbd> + <kbd>C</kbd> / <kbd>V</kbd></dd></div>
          <div><dt>Отменить / повторить</dt><dd><kbd>Ctrl</kbd> + <kbd>Z</kbd> / <kbd>Y</kbd></dd></div>
          <div><dt>Повернуть</dt><dd><kbd>R</kbd></dd></div>
          <div><dt>Удалить выбранное</dt><dd><kbd>Delete</kbd></dd></div>
          <div><dt>Завершить провод / отменить действие</dt><dd><kbd>Enter</kbd> / <kbd>Esc</kbd></dd></div>
          <div><dt>Курсор / Рука</dt><dd><kbd>V</kbd> / <kbd>H</kbd></dd></div>
          <div><dt>Панорамирование</dt><dd><kbd>Space</kbd> + перетаскивание</dd></div>
          <div><dt>Масштаб</dt><dd><kbd>+</kbd> / <kbd>−</kbd></dd></div>
          <div><dt>Показать всё</dt><dd><kbd>Ctrl</kbd> + <kbd>0</kbd></dd></div>
        </dl>
        <div class="dialog-actions"><button type="button" data-dialog-close="shortcuts-dialog">Закрыть</button></div>
      </dialog>
      <dialog id="about-dialog" class="app-dialog about-dialog" aria-labelledby="about-title">
        <div class="about-mark" aria-hidden="true">CS</div>
        <h2 id="about-title">CADe SIMU Web</h2>
        <p>Редактор электрических схем и симулятор релейной логики.</p>
        <dl><div><dt>Автор</dt><dd>IGOR LIPSKIY</dd></div><div><dt>Версия</dt><dd>0.1.0</dd></div></dl>
        <div class="dialog-actions"><button type="button" data-dialog-close="about-dialog">Закрыть</button></div>
      </dialog>
      <div id="simulation-context-menu" class="simulation-context-menu" role="menu" hidden>
        <button type="button" id="simulate-overload" role="menuitem">Имитировать перегрузку</button>
        <button type="button" id="reset-simulation-inputs" role="menuitem">Reset</button>
      </div>
    </main>`;
  root.dataset.theme = theme;
  const themeCommand = root.querySelector<HTMLButtonElement>('#theme-command');
  const updateThemeCommand = (): void => {
    if (themeCommand) themeCommand.textContent = theme === 'dark' ? 'Светлая тема' : 'Тёмная тема';
  };
  updateThemeCommand();
  const toggleTheme = (): void => {
    theme = theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = theme;
    updateThemeCommand();
    refreshInterface();
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* Theme still works for this session. */ }
  };

  const gridCommand = root.querySelector<HTMLButtonElement>('#grid-command');
  let gridVisible = readGridVisible();
  const applyGrid = (): void => {
    root.querySelector<SVGRectElement>('#sheet-grid')?.setAttribute('visibility', gridVisible ? 'visible' : 'hidden');
    if (gridCommand) gridCommand.textContent = gridVisible ? 'Скрыть сетку' : 'Показать сетку';
  };
  const toggleGrid = (): void => {
    gridVisible = !gridVisible;
    applyGrid();
    refreshInterface();
    try { localStorage.setItem(GRID_KEY, gridVisible ? 'on' : 'off'); } catch { /* Grid still toggles for this session. */ }
  };
  applyGrid();

  const svg = root.querySelector<SVGSVGElement>('.viewport-svg');
  const sheet = root.querySelector<SVGGElement>('#sheet-transform');
  const wireLayer = root.querySelector<SVGGElement>('#wire-layer');
  const elementLayer = root.querySelector<SVGGElement>('#element-layer');
  const selectionLayer = root.querySelector<SVGGElement>('#selection-layer');
  const draftLayer = root.querySelector<SVGGElement>('#draft-layer');
  const sheetFrame = root.querySelector<SVGGElement>('#sheet-frame');
  const sheetStamp = root.querySelector<SVGGElement>('#sheet-stamp');
  const zoomValue = root.querySelector<HTMLOutputElement>('#zoom-value');
  const status = root.querySelector<HTMLDivElement>('#status');
  const fileName = root.querySelector<HTMLSpanElement>('#file-name');
  const fileInput = root.querySelector<HTMLInputElement>('#cad-file');
  const wireKindSelect = root.querySelector<HTMLSelectElement>('#wire-kind');
  const drawWireButton = root.querySelector<HTMLButtonElement>('#draw-wire');
  const panToolButton = root.querySelector<HTMLButtonElement>('#pan-tool');
  const selectToolButton = root.querySelector<HTMLButtonElement>('#select-tool');
  const finishWireButton = root.querySelector<HTMLButtonElement>('#finish-wire');
  const undoButton = root.querySelector<HTMLButtonElement>('#undo');
  const redoButton = root.querySelector<HTMLButtonElement>('#redo');
  const paletteGroups = root.querySelector<HTMLDivElement>('#palette-groups');
  const paletteSearch = root.querySelector<HTMLInputElement>('#palette-search');
  const paletteLanguage = root.querySelector<HTMLSelectElement>('#palette-language');
  const paletteCount = root.querySelector<HTMLSpanElement>('#palette-count');
  const propertyFields = root.querySelector<HTMLDivElement>('#property-fields');
  const runButton = root.querySelector<HTMLButtonElement>('#sim-run');
  const stopButton = root.querySelector<HTMLButtonElement>('#sim-stop');
  const simStateValue = root.querySelector<HTMLSpanElement>('#sim-state');
  const speedButton = root.querySelector<HTMLButtonElement>('#speed-cycle');
  const simulationMessage = root.querySelector<HTMLDivElement>('#simulation-message');
  const simulationContextMenu = root.querySelector<HTMLDivElement>('#simulation-context-menu');
  const overloadAction = root.querySelector<HTMLButtonElement>('#simulate-overload');
  const resetInputsAction = root.querySelector<HTMLButtonElement>('#reset-simulation-inputs');
  if (!svg || !sheet || !wireLayer || !elementLayer || !selectionLayer || !draftLayer || !sheetFrame || !sheetStamp || !zoomValue || !status || !fileName || !fileInput || !wireKindSelect || !drawWireButton || !finishWireButton || !undoButton || !redoButton || !paletteGroups || !paletteSearch || !paletteLanguage || !paletteCount || !propertyFields || !runButton || !stopButton || !simStateValue || !simulationMessage || !simulationContextMenu || !overloadAction || !resetInputsAction || !speedButton) throw new Error('Не удалось создать поле SVG.');
  fileName.textContent = schema.sheet.fileName || 'Новая схема';
  if (autosavedSchema) status.textContent = 'Автосохранённая схема восстановлена.';
  svg.setAttribute('tabindex', '0');

  const initialRect = svg.getBoundingClientRect();
  let viewSize: Point = { x: initialRect.width || FALLBACK_VIEWPORT.width, y: initialRect.height || FALLBACK_VIEWPORT.height };
  svg.setAttribute('viewBox', `0 0 ${viewSize.x} ${viewSize.y}`);
  const backdrop = svg.querySelector<SVGRectElement>('.viewport-backdrop');
  backdrop?.setAttribute('width', String(viewSize.x));
  backdrop?.setAttribute('height', String(viewSize.y));
  let viewport: Viewport = fitViewport(fullSheet(schema.sheet), { width: viewSize.x, height: viewSize.y });
  let pointerSheetPosition: Point | undefined;
  let drag: DragState | undefined;
  let spaceDown = false;
  /** Инструмент «Рука»: левая кнопка мыши только двигает лист, элементы и провода не трогаются. */
  let panTool = false;
  const setPanTool = (on: boolean): void => {
    panTool = on;
    svg.classList.toggle('is-pan-tool', on);
    panToolButton?.classList.toggle('is-active', on);
    panToolButton?.setAttribute('aria-pressed', String(on));
    selectToolButton?.classList.toggle('is-active', !on);
    selectToolButton?.setAttribute('aria-pressed', String(!on));
    if (on) status.textContent = 'Рука: тяните лист левой кнопкой мыши. Нажмите ↖ или V, чтобы вернуться к курсору.';
  };
  const selected = new Map<string, Selectable>();
  let clipboard: { elements: SchemaElement[]; wires: WireSegment[]; anchor: Point } | undefined;
  let placementType: number | undefined;
  let activePaletteCommand: number | undefined;
  let paletteLang: Lang = (() => {
    try {
      const saved = localStorage.getItem(INTERFACE_LANGUAGE_KEY);
      return saved === 'es' || saved === 'en' || saved === 'it' || saved === 'ru' ? saved : 'es';
    } catch { return 'es'; }
  })();
  let placementRotation: 0 | 1 | 2 | 3 = 0;
  let wireDrawing = false;
  const uiText = (): typeof INTERFACE_TEXT.ru => INTERFACE_TEXT[paletteLang] as typeof INTERFACE_TEXT.ru;
  const translateInterface = (): void => {
    const t = uiText();
    const set = (selector: string, value: string): void => { const el = root.querySelector<HTMLElement>(selector); if (el) el.textContent = value; };
    const setButton = (selector: string, value: string): void => {
      const el = root.querySelector<HTMLButtonElement>(selector);
      if (!el) return;
      const shortcut = el.querySelector('kbd');
      if (shortcut) { const firstText = [...el.childNodes].find((node) => node.nodeType === Node.TEXT_NODE); if (firstText) firstText.textContent = `${value} `; }
      else el.textContent = value;
    };
    const summaries = [...root.querySelectorAll<HTMLElement>('.app-menu > .menu-group > summary')];
    [t.file, t.edit, t.view, t.elementsMenu, t.language, t.examples, t.help].forEach((value, index) => { if (summaries[index]) summaries[index]!.textContent = value; });
    const commandLabels: Array<[string, string]> = [
      ['new', t.new], ['open', t.open], ['save-json', t.save], ['export-cad', t.export], ['export-svg', t.exportSvg], ['print-pdf', t.printPdf], ['sheet', t.sheet],
      ['copy-selection', t.copy], ['paste-selection', t.paste], ['undo', t.undo], ['redo', t.redo], ['rotate', t.rotate], ['delete', t.delete],
      ['zoom-in', t.zoomIn], ['zoom-out', t.zoomOut], ['fit', t.fit], ['shortcuts', t.shortcuts], ['about', t.about],
    ];
    for (const [command, label] of commandLabels) setButton(`[data-command="${command}"]`, label);
    set('.optional-groups-heading', t.optionalGroups);
    const extraLabelKeys: Record<string, string> = { grafcet: 'extraGrafcet', ladder: 'extraLadder', logic: 'extraLogic', 'realistic-2d': 'extraReal2d', 'realistic-3d': 'extraReal3d', wiring: 'extraWiring', pneumatics: 'extraPneumatics', 'io-plc': 'extraIoPlc', 'power-electronics': 'extraPowerElectronics', 'electronic-relays': 'extraElectronicRelays' };
    for (const input of [...root.querySelectorAll<HTMLInputElement>('[data-optional-group]')]) {
      const key = input.dataset.optionalGroup as GroupKey;
      input.checked = visibleOptionalGroups.has(key);
      const labelKey = extraLabelKeys[key] as keyof typeof INTERFACE_TEXT.ru | undefined;
      const label = input.parentElement?.querySelector<HTMLElement>('[data-extra-label]');
      if (label && labelKey) label.textContent = t[labelKey]!;
    }
    const languageLabel = root.querySelector<HTMLElement>('.menu-language');
    if (languageLabel?.firstChild) languageLabel.firstChild.textContent = `${t.languageNames} `;
    const options: Record<string, string> = { phase: t.phase, neutral: t.neutral, protection: 'PE', three: t.three, threeN: t.threeN };
    for (const option of [...root.querySelectorAll<HTMLOptionElement>('#wire-kind option')]) option.textContent = options[option.value] ?? option.textContent;
    set('#draw-wire', wireDrawing ? t.cancel : t.wire);
    set('#finish-wire', t.done);
    root.querySelector<HTMLButtonElement>('#undo')?.setAttribute('aria-label', t.undo);
    root.querySelector<HTMLButtonElement>('#undo')?.setAttribute('title', t.undo);
    root.querySelector<HTMLButtonElement>('#redo')?.setAttribute('aria-label', t.redo);
    root.querySelector<HTMLButtonElement>('#redo')?.setAttribute('title', t.redo);
    root.querySelector<HTMLButtonElement>('#select-tool')?.setAttribute('aria-label', t.cursor);
    root.querySelector<HTMLButtonElement>('#select-tool')?.setAttribute('title', t.cursor);
    root.querySelector<HTMLButtonElement>('#pan-tool')?.setAttribute('aria-label', t.hand);
    root.querySelector<HTMLButtonElement>('#pan-tool')?.setAttribute('title', t.hand);
    set('#sim-run', `▶ ${t.run}`); set('#sim-stop', `■ ${t.stop}`);
    root.querySelector<HTMLButtonElement>('#sim-stop')?.setAttribute('title', t.stopTitle);
    set('#sim-state', simMode === 'run' ? t.run : t.editor);
    set('#speed-cycle', speedButton.textContent === '1×' ? '1×' : speedButton.textContent ?? '1×');
    speedButton.setAttribute('aria-label', `${t.speed}: ${speedButton.textContent}`);
    speedButton.title = t.speed;
    set('#rotate-selection', t.rotate); set('#delete-selection', t.delete);
    set('[data-zoom="fit"]', t.showAll);
    set('.palette-heading h2', t.elements);
    paletteSearch.placeholder = t.search; paletteSearch.setAttribute('aria-label', t.search.replace(/…$/, ''));
    set('#properties-panel h2', t.properties);
    set('#status', t.status); zoomValue.title = t.zoom;
    set('.viewport-help', t.helpCanvas);
    root.querySelector<HTMLElement>('.brand-lockup')?.setAttribute('title', t.aboutText);
    const wireSelect = root.querySelector<HTMLSelectElement>('#wire-kind'); if (wireSelect) wireSelect.setAttribute('aria-label', t.wireType);
    const toolbar = root.querySelector<HTMLElement>('.viewport-toolbar'); toolbar?.setAttribute('aria-label', t.wiresSimulation);
    root.querySelector<HTMLElement>('.wire-controls')?.setAttribute('aria-label', t.wires);
    root.querySelector<HTMLElement>('.simulation-controls')?.setAttribute('aria-label', t.simulation);
    root.querySelector<HTMLElement>('.simulation-speed')?.setAttribute('aria-label', t.speed);
    root.querySelector<HTMLElement>('.component-palette')?.setAttribute('aria-label', t.elements);
    root.querySelector<HTMLElement>('.properties-panel')?.setAttribute('aria-label', t.properties);
    root.querySelector<SVGSVGElement>('.viewport-svg')?.setAttribute('aria-label', t.schematic);
    const theme = root.querySelector<HTMLButtonElement>('#theme-command');
    if (theme) theme.textContent = root.dataset.theme === 'dark' ? t.themeLight : t.themeDark;
    const grid = root.querySelector<HTMLButtonElement>('#grid-command');
    if (grid) grid.textContent = gridVisible ? t.gridHide : t.gridShow;
    const sheetDialog = root.querySelector<HTMLDialogElement>('#sheet-dialog');
    if (sheetDialog) {
      set('#sheet-title', t.sheetSize);
      const formatLabel = sheetDialog.querySelector('label'); if (formatLabel?.firstChild) formatLabel.firstChild.textContent = `${t.format} `;
      const formatOptions: Record<string, string> = { custom: t.custom, '279x210': `A4 — ${t.landscape}`, '210x279': `A4 — ${t.portrait}`, '420x297': `A3 — ${t.landscape}`, '297x420': `A3 — ${t.portrait}` };
      for (const option of [...sheetDialog.querySelectorAll<HTMLOptionElement>('option')]) option.textContent = formatOptions[option.value] ?? option.textContent;
      const labels = [...sheetDialog.querySelectorAll('label.property-field')];
      if (labels[1]?.firstChild) labels[1]!.firstChild!.textContent = `${t.width}`;
      if (labels[2]?.firstChild) labels[2]!.firstChild!.textContent = `${t.height}`;
      setButton('#sheet-apply', t.apply);
    }
    const newDialog = root.querySelector<HTMLDialogElement>('#confirm-new-dialog');
    if (newDialog) { set('#confirm-new-title', t.newTitle); set('#confirm-new-dialog p', t.newWarning); setButton('#confirm-new', t.create); }
    const shortcutsDialog = root.querySelector<HTMLDialogElement>('#shortcuts-dialog'); if (shortcutsDialog) set('#shortcuts-title', t.shortcutsTitle);
    const aboutDialog = root.querySelector<HTMLDialogElement>('#about-dialog'); if (aboutDialog) { set('#about-dialog p', t.aboutText); const fields = aboutDialog.querySelectorAll('dt'); if (fields[0]) fields[0]!.textContent = t.author; if (fields[1]) fields[1]!.textContent = t.version; }
    for (const button of [...root.querySelectorAll<HTMLButtonElement>('[data-dialog-close]')]) button.textContent = t.close;
    set('#simulate-overload', t.overload); set('#reset-simulation-inputs', t.reset);
    for (const option of [...root.querySelectorAll<HTMLOptionElement>('#palette-language option')]) option.selected = option.value === paletteLang;
    paletteLanguage.setAttribute('aria-label', t.languageNames);
    const fname = schema.sheet.fileName || t.new;
    fileName.textContent = fname;
  };
  refreshInterface = translateInterface;
  let draftPoints: Point[] = [];
  let draftCursor: Point | undefined;
  let dragSnapshot: Schema | undefined;
  let propertySnapshot: Schema | undefined;
  let simMode: 'edit' | 'run' = 'edit';
  let simTime = 0;
  let simSpeed = 1;
  let simMemory: EngineMemory = createEmptyMemory();
  /** Пустые входы: автоматы и выключатели по умолчанию ВЫКЛЮЧЕНЫ (включает пользователь кликом), тепловая защита 6007 взведена. */
  const createSimInputs = (): UserInputs => {
    const inputs = createEmptyInputs();
    inputs.positions = {};  // положения Conmutador: нет записи = позиция покоя
    for (const element of schema.elements) if (startsOpen(element.typeCode)) inputs.toggled[element.id] = false;
    return inputs;
  };
  let simInputs: UserInputs = createEmptyInputs();
  let simResult: EngineState | undefined;
  translateInterface();
  let lastFrameTime: number | undefined;
  let animationFrame: number | undefined;
  const heldInputs = new Set<number>();
  let contextElementId: number | undefined;
  const motorStartTimes = new Map<number, number>();
  let wireGroupOf = new Map<number, number>();
  let wireTerminalKeys = new Map<number, Set<TerminalKey>>();

  const rebuildWireTerminalMap = (): void => {
    const links = buildWireLinks(schema.wires);
    wireGroupOf = links.groupOf;
    wireTerminalKeys = new Map();
    for (const group of links.groupOf.values()) if (!wireTerminalKeys.has(group)) wireTerminalKeys.set(group, new Set<TerminalKey>());
    for (const element of schema.elements) {
      element.terminals.forEach((_, index) => {
        const point = terminalPosition(element, index);
        if (!point) return;
        const key = terminalKey(element.id, index);
        for (const wire of schema.wires) {
          if (!pointOnSegment(point, wire.from, wire.to)) continue;
          const group = links.groupOf.get(wire.id);
          if (group !== undefined) wireTerminalKeys.get(group)?.add(key);
        }
      });
    }
  };
  const applySimulationVisuals = (): void => {
    const result = simResult;
    const nets = new Map((result?.nets ?? []).map((net) => [net.id, net] as const));
    for (const wire of schema.wires) {
      const lineOrDot = wireLayer.querySelector<SVGElement>(`[data-wire-id="${wire.id}"]`);
      if (!lineOrDot) continue;
      const group = wireGroupOf.get(wire.id);
      const potentials = new Set<PotentialLabel>();
      for (const key of group === undefined ? [] : wireTerminalKeys.get(group) ?? []) {
        const netId = result?.terminalNet[key];
        for (const potential of nets.get(netId ?? -1)?.potentials ?? []) potentials.add(potential);
      }
      const ordered = POTENTIAL_ORDER.filter((potential) => potentials.has(potential));
      const energized = ordered.length > 0;
      const color = ordered.length > 1 ? CONFLICT_COLOR : ordered[0] ? POTENTIAL_COLORS[ordered[0]] : wire.kind === 'junction' ? IDLE_WIRE_COLORS.junction : IDLE_WIRE_COLORS[wire.kind];
      const isDot = wire.kind === 'junction';
      lineOrDot.classList.toggle('is-energized', energized);
      lineOrDot.style.filter = '';
      wireLayer.querySelector(`[data-halo-for="${wire.id}"]`)?.remove();
      if (isDot) lineOrDot.setAttribute('fill', color);
      else {
        const base = Math.max(1, wire.thickness || 1) * 1.35;
        lineOrDot.setAttribute('stroke', color);
        // Без свечения: цвет показывает потенциал, толщина остаётся одной и той же.
        lineOrDot.setAttribute('stroke-width', String(base));
      }
      lineOrDot.setAttribute('aria-label', energized ? `Провод под напряжением: ${ordered.join(', ')}` : 'Провод без потенциала');
    }
    for (const element of schema.elements) {
      const symbol = elementLayer.querySelector<SVGGElement>(`[data-element-id="${element.id}"]`);
      if (!symbol) continue;
      const tripped = Boolean(simInputs.tripped[element.id] || result?.tripped[element.id]);
      const defaultClosed = armedByDefaultTypes.has(element.typeCode);
      const manuallyOpen = result !== undefined && latchedTypes.has(element.typeCode) && !(simInputs.toggled[element.id] ?? defaultClosed);
      // У выключателя с фиксацией лопасть рисуется по тому же классу, что и у нажатой кнопки.
      symbol.classList.toggle('is-sim-pressed', (simInputs.pressed[element.id] ?? false) || (maintainedTypes.has(element.typeCode) && simInputs.toggled[element.id] === true));
      if (POSITION_SPECS[element.typeCode]) symbol.setAttribute('data-position', String(currentPosition(element.typeCode, simInputs.positions?.[element.id])));
      symbol.classList.toggle('is-sim-open', manuallyOpen || tripped);
      symbol.classList.toggle('is-sim-tripped', tripped);
      symbol.classList.toggle('is-sim-fault-glow', Boolean(simInputs.tripped[element.id]));
      symbol.classList.toggle('is-sim-closed', result?.contacts[element.id] ?? false);
      // Вспомогательные контакты: общий признак срабатывания (катушка или таймер с тем же именем) для НО и НЗ полюсов.
      const auxSwitches = element.typeCode >= 7000 && element.typeCode <= 7015 && getBehavior(element.typeCode).links.some((link) => link.kind === 'switch');
      symbol.classList.toggle('is-aux-active', auxSwitches && result !== undefined && auxContactActive(element, schema, result.coils, result.memory.timers));
      symbol.classList.toggle('is-coil-energized', element.typeCode === 9000 || element.typeCode === 9004 ? (result?.coils[element.name] ?? false) : false);
      symbol.classList.toggle('is-lamp-lit', element.typeCode === 9008 ? (result?.lamps[element.id] ?? false) : false);
      if (element.typeCode === 9004) {
        const readout = symbol.querySelector<SVGTextElement>('.timer-readout');
        const timer = result?.memory.timers[element.id];
        const total = Math.max(0, Number(element.params.time ?? 0));
        const formatTime = (value: number): string => (Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ','));
        const shown = timer?.phase === 'done' ? total : Math.min(total, Math.max(0, timer?.elapsed ?? 0));
        const readoutText = result === undefined ? '' : `${timer?.phase === 'counting' ? shown.toFixed(1).replace('.', ',') : formatTime(shown)} / ${formatTime(total)} с`;
        if (readout && readout.textContent !== readoutText) readout.textContent = readoutText;
        symbol.classList.toggle('is-timer-counting', timer?.phase === 'counting');
        symbol.classList.toggle('is-timer-done', timer?.phase === 'done');
      }
      const motor = result?.motors[element.id];
      symbol.classList.toggle('is-motor-running', motor?.running ?? false);
      symbol.classList.toggle('is-motor-faulted', motor?.faulted ?? false);
      const motorPhaseNets = [0, 1, 2].map((index) => {
        const netId = result?.terminalNet[terminalKey(element.id, index)];
        return netId === undefined ? undefined : nets.get(netId);
      });
      const motorPhases = motorPhaseNets.map((net) => net?.potentials.filter((potential) => potential === 'L1' || potential === 'L2' || potential === 'L3') ?? []);
      let motorDirection: 'normal' | 'reverse' | undefined;
      if (motor?.reversed) motorDirection = 'reverse';
      else if (motorPhases.every((phases) => phases.length === 1)) {
        const phaseOrder = motorPhases.map((phases) => ['L1', 'L2', 'L3'].indexOf(phases[0] as string));
        let inversions = 0;
        for (let i = 0; i < phaseOrder.length; i += 1) {
          for (let j = i + 1; j < phaseOrder.length; j += 1) {
            if ((phaseOrder[i] as number) > (phaseOrder[j] as number)) inversions += 1;
          }
        }
        motorDirection = inversions % 2 === 0 ? 'normal' : 'reverse';
      }
      symbol.classList.toggle('is-sim-active', result !== undefined);
      const powered = element.terminals.some((_, index) => (nets.get(result?.terminalNet[terminalKey(element.id, index)] ?? -1)?.potentials.length ?? 0) > 0);
      // Выключенный/сработавший аппарат защиты не подсвечивается красным: остаётся серым.
      symbol.classList.toggle('is-powered', powered && !(latchedTypes.has(element.typeCode) && (manuallyOpen || tripped)));
      if (motor?.running) {
        // Постоянная скорость: менять animation-duration на лету нельзя — браузер пересчитывает фазу и стрелка «дёргается».
        symbol.style.setProperty('--motor-period', '0.9s');
        symbol.style.setProperty('--motor-play-state', simMode === 'run' ? 'running' : 'paused');
        symbol.style.setProperty('--motor-direction', motorDirection ?? 'normal');
        symbol.style.setProperty('--motor-mirror', motorDirection === 'reverse' ? '-1' : '1');
      } else {
        motorStartTimes.delete(element.id);
        symbol.style.removeProperty('--motor-period'); symbol.style.removeProperty('--motor-play-state'); symbol.style.removeProperty('--motor-direction'); symbol.style.removeProperty('--motor-mirror');
      }
    }
    const messages: string[] = [];
    for (const fault of result?.faults ?? []) {
      const details = fault.message.replace(/^[a-z-]+:\s*/i, '');
      if (fault.kind === 'short-circuit') messages.push(`Короткое замыкание: ${details}`);
      else if (fault.kind === 'earth-leak') messages.push(`Утечка на PE: ${details}`);
      else if (fault.kind === 'unstable') messages.push(`Нестабильная схема: ${details}`);
    }
    for (const element of schema.elements) {
      if ((element.typeCode !== 1000 && element.typeCode !== 1001) || !result?.motors[element.id]?.faulted) continue;
      messages.push(`Потеря фазы: двигатель ${element.name || `M${element.id}`} не получил три разные фазы на U1/V1/W1.`);
    }
    const messageText = [...new Set(messages)].join(' ');
    simulationMessage.hidden = messageText.length === 0;
    if (simulationMessage.textContent !== messageText) simulationMessage.textContent = messageText;
  };

  const updateSimulationControls = (): void => {
    const running = simMode === 'run';
    runButton.disabled = running;
    stopButton.disabled = simMode === 'edit';
    const modeLabel = simMode === 'run' ? uiText().running : uiText().editor;
    if (simStateValue.textContent !== modeLabel) simStateValue.textContent = modeLabel;
    simStateValue.dataset.mode = simMode;
    if (simResult?.faults.length) simStateValue.title = simResult.faults.map((fault) => fault.message).join('\n');
    else if (simResult?.warnings.length) simStateValue.title = simResult.warnings.join('\n');
    else simStateValue.removeAttribute('title');
  };
  const resetSimulation = (): void => {
    if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
    animationFrame = undefined; lastFrameTime = undefined; simMode = 'edit'; simTime = 0;
    simMemory = createEmptyMemory(); simInputs = createSimInputs(); simResult = undefined;
    updateSimulationControls();
    applySimulationVisuals();
  };
  const evaluateSimulation = (): void => {
    simResult = simulate({ schema, inputs: simInputs, time: simTime, memory: simMemory });
    simMemory = simResult.memory;
    updateSimulationControls();
    applySimulationVisuals();
  };
  const simulationTick = (timestamp: number): void => {
    if (simMode !== 'run') { animationFrame = undefined; return; }
    const previous = lastFrameTime ?? timestamp;
    const elapsed = Math.min(0.25, Math.max(0, (timestamp - previous) / 1000));
    lastFrameTime = timestamp; simTime += elapsed * simSpeed;
    evaluateSimulation();
    animationFrame = requestAnimationFrame(simulationTick);
  };
  const startSimulation = (): void => {
    if (simMode === 'run') return;
    for (const element of schema.elements) if (startsOpen(element.typeCode) && simInputs.toggled[element.id] === undefined) simInputs.toggled[element.id] = false;
    simMode = 'run'; lastFrameTime = undefined; evaluateSimulation();
    animationFrame = requestAnimationFrame(simulationTick);
  };
  /** Полная остановка: время в 0, память, нажатые кнопки и результат расчёта сброшены, схема возвращается в редактор. */
  const stopSimulation = (): void => {
    heldInputs.clear();
    simulationContextMenu.hidden = true;
    resetSimulation();
    renderSchema();
    status.textContent = 'Симуляция остановлена.';
  };
  const momentaryTypes = new Set([8000, 8001, 8002, 8003, 8004, 8005, 8006, 8007, 8012, 8013, 8014, 8015]);
  /** Ручные выключатели с фиксацией (Interruptor): клик переключает привод, toggled = «привод включён», нет записи = покой. Не входят в latchedTypes. */
  const maintainedTypes = new Set([8008, 8009, 8010, 8011]);
  const trippableTypes = new Set([6000, 6001, 6002, 6003, 6004, 6005, 6006, 6007, 6008, 6009, 6010, 6011, 6012, 8016, 8017, 8018, 8019]);
  const applySimulationInput = (): void => { evaluateSimulation(); renderSchema(); };
  const pressMomentary = (id: number): void => {
    if (simMode === 'edit' || heldInputs.has(id)) return;
    heldInputs.add(id); simInputs.pressed[id] = true; applySimulationInput();
  };
  const releaseMomentary = (id: number): void => {
    if (!heldInputs.delete(id)) return;
    delete simInputs.pressed[id]; applySimulationInput();
  };
  const resetSimulationInputs = (): void => {
    simInputs = createSimInputs(); heldInputs.clear(); simMemory = createEmptyMemory(); simTime = 0; simResult = undefined;
    lastFrameTime = undefined; evaluateSimulation(); renderSchema();
    status.textContent = 'Входы и память симуляции сброшены.';
  };
  const simulateOverload = (id: number): void => {
    if (simMode === 'edit') startSimulation();
    simInputs.tripped[id] = true; applySimulationInput();
    const element = schema.elements.find((candidate) => candidate.id === id);
    status.textContent = `Смоделирована перегрузка: ${element?.name || `элемент ${id}`}.`;
  };
  const showSimulationContextMenu = (event: MouseEvent, elementId?: number): void => {
    contextElementId = elementId;
    const element = elementId === undefined ? undefined : schema.elements.find((candidate) => candidate.id === elementId);
    overloadAction.hidden = !element || !trippableTypes.has(element.typeCode);
    simulationContextMenu.hidden = false;
    const bounds = simulationContextMenu.getBoundingClientRect();
    simulationContextMenu.style.left = `${Math.max(8, Math.min(event.clientX, innerWidth - bounds.width - 8))}px`;
    simulationContextMenu.style.top = `${Math.max(8, Math.min(event.clientY, innerHeight - bounds.height - 8))}px`;
  };

  const updateHistoryButtons = (): void => {
    undoButton.disabled = !canUndo(history) && !(wireDrawing && draftPoints.length > 0);
    redoButton.disabled = !canRedo(history);
    const undoMenu = root.querySelector<HTMLButtonElement>('[data-command="undo"]');
    const redoMenu = root.querySelector<HTMLButtonElement>('[data-command="redo"]');
    if (undoMenu) undoMenu.disabled = undoButton.disabled;
    if (redoMenu) redoMenu.disabled = redoButton.disabled;
    const copyMenu = root.querySelector<HTMLButtonElement>('[data-command="copy-selection"]');
    const pasteMenu = root.querySelector<HTMLButtonElement>('[data-command="paste-selection"]');
    if (copyMenu) copyMenu.disabled = selected.size === 0;
    if (pasteMenu) pasteMenu.disabled = !clipboard;
    drawWireButton.textContent = wireDrawing ? uiText().cancel : uiText().wire;
    finishWireButton.disabled = !wireDrawing || draftPoints.length < 2;
  };
  const commitSchema = (before: Schema): void => {
    const next = cloneSchema(schema);
    if (JSON.stringify(before) !== JSON.stringify(next)) {
      history = commitHistory(history, next);
      resetSimulation();
    }
    updateHistoryButtons();
  };
  const renderProperties = (): void => {
    if (propertyFields.contains(document.activeElement)) return;
    propertyFields.replaceChildren();
    const note = (message: string): void => {
      const text = document.createElement('p'); text.className = 'property-empty'; text.textContent = message; propertyFields.append(text);
    };
    if (selected.size === 0) { note(uiText().selectElement); return; }
    if (selected.size > 1) { note(uiText().selectedMany); return; }
    const item = selected.values().next().value as Selectable | undefined;
    if (!item || item.kind !== 'element') { note(uiText().noWireProperties); return; }
    const element = schema.elements.find((candidate) => candidate.id === item.id);
    if (!element) { note(uiText().missingElement); return; }
    const info = getCadType(element.typeCode);
    const heading = document.createElement('p'); heading.className = 'property-type'; heading.textContent = `${info.label} · ${element.id}`; propertyFields.append(heading);
    const addField = (labelText: string, value: string, update: (next: string) => void, options: { type?: string; min?: string; step?: string } = {}): HTMLInputElement => {
      const label = document.createElement('label'); label.className = 'property-field'; label.append(document.createTextNode(labelText));
      const input = document.createElement('input'); input.type = options.type ?? 'text'; input.value = value;
      if (options.min !== undefined) input.min = options.min;
      if (options.step !== undefined) input.step = options.step;
      input.addEventListener('focus', () => { if (!propertySnapshot) propertySnapshot = cloneSchema(schema); });
      input.addEventListener('input', () => { update(input.value); renderSchema(); });
      input.addEventListener('blur', () => {
        if (propertySnapshot) commitSchema(propertySnapshot);
        propertySnapshot = undefined;
      });
      label.append(input); propertyFields.append(label); return input;
    };
    addField(element.typeCode === 2009 ? uiText().contactor1 : uiText().name, element.name, (value) => { element.name = value; if (element.raw) element.raw.texts[0] = value; });
    addField(element.typeCode === 2009 ? uiText().contactor2 : uiText().function, element.func, (value) => { element.func = value; if (element.raw) element.raw.texts[1] = value; });
    const terminalsHeading = document.createElement('h3'); terminalsHeading.textContent = uiText().terminals; propertyFields.append(terminalsHeading);
    element.terminals.forEach((terminal, index) => addField(`${uiText().terminal} ${index + 1}`, terminal.label, (value) => {
      terminal.label = value;
      if (element.raw) element.raw.texts[2 + index] = value;
    }));
    if (element.typeCode === 9008) {
      const colorField = document.createElement('label'); colorField.className = 'property-field'; colorField.append(document.createTextNode(uiText().lampColor));
      const select = document.createElement('select');
      for (const [value, title] of [['0', uiText().green], ['1', uiText().red], ['2', uiText().yellow]] as const) {
        const option = document.createElement('option'); option.value = value; option.textContent = title; select.append(option);
      }
      select.value = String(element.params.color ?? 0);
      select.addEventListener('focus', () => { if (!propertySnapshot) propertySnapshot = cloneSchema(schema); });
      select.addEventListener('change', () => {
        element.params.color = Number(select.value);
        element.params.extra = select.value;
        if (element.raw) element.raw.texts[2 + element.terminals.length] = select.value;
        renderSchema();
      });
      select.addEventListener('blur', () => {
        if (propertySnapshot) commitSchema(propertySnapshot);
        propertySnapshot = undefined;
      });
      colorField.append(select); propertyFields.append(colorField);
    }
    if (element.typeCode === 9004) {
      addField(uiText().delay, String(element.params.time ?? 0), (value) => {
        const time = Number(value);
        if (Number.isFinite(time) && time >= 0) {
          element.params.time = time;
          element.params.extra = `${element.params.scale ?? 0}#${time}`;
          if (element.raw) {
            element.raw.texts[2 + element.terminals.length] = String(element.params.scale ?? 0);
            element.raw.texts[3 + element.terminals.length] = String(time);
          }
        }
      }, { type: 'number', min: '0', step: '0.1' });
    }
  };
  const restoreHistory = (nextHistory: typeof history): void => {
    history = nextHistory;
    schema = cloneSchema(history.present);
    resetSimulation();
    selected.clear();
    renderSchema();
  };

  const stage = root.querySelector<HTMLElement>('.viewport-stage');
  const stampOrder = STAMP_CELLS.filter((cell) => cell.key);
  let stampEditor: { input: HTMLInputElement; key: StampKey; before: Schema } | undefined;
  const closeStampEditor = (commit = true): void => {
    const editor = stampEditor;
    if (!editor) return;
    stampEditor = undefined;
    const value = editor.input.value;
    editor.input.remove();
    if (commit && value !== stampValue(schema.sheet, editor.key)) {
      (schema.sheet as unknown as Record<string, string>)[editor.key] = value;
      commitSchema(editor.before);
    }
    renderSchema();
  };
  /** Правка графы штампа прямо на листе: поле ввода поверх ячейки. */
  const openStampEditor = (key: StampKey): void => {
    if (!stage) return;
    closeStampEditor(true);
    const cell = stampOrder.find((candidate) => candidate.key === key);
    if (!cell) return;
    const metrics = stampMetrics(schema.sheet.width, schema.sheet.height);
    const left = viewport.offsetX + (metrics.margin + cell.x0 * metrics.stampWidth) * viewport.scale;
    const top = viewport.offsetY + (schema.sheet.height + metrics.gap + cell.r0 * metrics.rowH) * viewport.scale;
    const input = document.createElement('input');
    input.type = 'text'; input.className = 'stamp-editor'; input.value = stampValue(schema.sheet, key);
    input.setAttribute('aria-label', cell.hint ?? cell.label ?? 'Графа штампа');
    input.title = `${cell.hint ?? cell.label ?? ''} · Enter — готово, Tab — следующая графа, Esc — отмена`;
    Object.assign(input.style, {
      left: `${left}px`, top: `${top}px`,
      width: `${Math.max(60, (cell.x1 - cell.x0) * metrics.stampWidth * viewport.scale)}px`,
      height: `${Math.max(22, (cell.r1 - cell.r0) * metrics.rowH * viewport.scale)}px`,
      fontSize: `${Math.max(12, metrics.rowH * 0.42 * viewport.scale)}px`,
    });
    stage.append(input);
    stampEditor = { input, key, before: cloneSchema(schema) };
    input.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Enter') { closeStampEditor(true); event.preventDefault(); }
      else if (event.key === 'Escape') { closeStampEditor(false); event.preventDefault(); }
      else if (event.key === 'Tab') {
        event.preventDefault();
        const index = stampOrder.findIndex((candidate) => candidate.key === key);
        const next = stampOrder[(index + (event.shiftKey ? -1 : 1) + stampOrder.length) % stampOrder.length];
        closeStampEditor(true);
        if (next?.key) openStampEditor(next.key);
      }
    });
    input.addEventListener('blur', () => { if (stampEditor?.input === input) closeStampEditor(true); });
    input.focus(); input.select();
  };
  const drawViewport = (): void => {
    if (stampEditor) closeStampEditor(true);
    sheet.setAttribute('transform', `translate(${viewport.offsetX} ${viewport.offsetY}) scale(${viewport.scale})`);
    zoomValue.value = `${Math.round(viewport.scale * 100)}%`;
  };
  type DrawKind = Exclude<WireKind, 'junction'>;
  const activeWireKinds = (): DrawKind[] => {
    const value = wireKindSelect.value;
    if (value === 'three') return ['phase', 'phase', 'phase'];
    if (value === 'threeN') return ['phase', 'phase', 'phase', 'neutral'];
    return [value as DrawKind];
  };
  let elbowVerticalFirst = false;
  let bundleFlipped = false;
  /** Маршруты всех проводов пучка; для одного провода — единственный маршрут. */
  const buildBundleRoutes = (points: readonly Point[]): Array<{ route: Point[]; kind: DrawKind }> => {
    const kinds = activeWireKinds();
    const route = simplifyRoute(orthogonalize(points, elbowVerticalFirst));
    if (route.length < 2) return [];
    if (kinds.length === 1) return [{ route, kind: kinds[0] as DrawKind }];
    const layout = detectBundleLayout(route, schema);
    const side = (layout.side * (bundleFlipped ? -1 : 1)) as 1 | -1;
    return kinds.map((kind, index) => ({ route: offsetRoute(route, side * layout.spacing * index), kind }));
  };
  const insideSheet = (route: readonly Point[]): boolean => route.every((p) => p.x >= 0 && p.y >= 0 && p.x <= schema.sheet.width && p.y <= schema.sheet.height);
  const drawDraft = (): void => {
    draftLayer.replaceChildren();
    if (!wireDrawing || draftPoints.length === 0) return;
    const preview = draftCursor && (draftCursor.x !== draftPoints[draftPoints.length - 1]?.x || draftCursor.y !== draftPoints[draftPoints.length - 1]?.y)
      ? [...draftPoints, draftCursor]
      : draftPoints;
    for (const { route, kind } of buildBundleRoutes(preview)) for (let i = 1; i < route.length; i += 1) {
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', String(route[i - 1]?.x)); line.setAttribute('y1', String(route[i - 1]?.y));
      line.setAttribute('x2', String(route[i]?.x)); line.setAttribute('y2', String(route[i]?.y));
      line.setAttribute('stroke', WIRE_COLORS[kind]); line.setAttribute('stroke-width', '1.5');
      line.setAttribute('stroke-dasharray', '3 2'); line.setAttribute('vector-effect', 'non-scaling-stroke');
      line.setAttribute('class', 'wire-draft'); draftLayer.append(line);
    }
    for (const point of draftPoints) {
      const marker = document.createElementNS(SVG_NS, 'circle');
      marker.setAttribute('cx', String(point.x)); marker.setAttribute('cy', String(point.y));
      marker.setAttribute('r', '1.5'); marker.setAttribute('class', 'wire-draft-point'); draftLayer.append(marker);
    }
  };
  // Призрак размещаемого элемента: следует за курсором, пока выбран элемент панели, и показывает, как он встанет.
  const ghostLayer = document.createElementNS(SVG_NS, 'g');
  ghostLayer.setAttribute('id', 'ghost-layer'); ghostLayer.setAttribute('class', 'placement-ghost'); ghostLayer.setAttribute('pointer-events', 'none');
  draftLayer.after(ghostLayer);
  let ghostPoint: Point | undefined;
  const drawGhost = (): void => {
    ghostLayer.replaceChildren();
    if (placementType === undefined || ghostPoint === undefined || wireDrawing) return;
    const ghost = createPlacedElement(placementType, ghostPoint, placementRotation, schema);
    ghost.name = '';
    if (ghost.typeCode === 2009) ghost.func = '';
    const symbol = createElementSymbol(ghost);
    if (symbol) ghostLayer.append(symbol);
  };
  const moveGhost = (event: MouseEvent): void => {
    if (placementType === undefined) return;
    ghostPoint = screenToSheet(svgPoint(event, svg, viewSize), viewport);
    drawGhost();
  };
  // Режим размещения включают и выключают в десятке мест через класс is-placing: следим за классом, а не за каждым местом.
  new MutationObserver(() => { if (!svg.classList.contains('is-placing')) ghostPoint = undefined; drawGhost(); }).observe(svg, { attributes: true, attributeFilter: ['class'] });
  svg.addEventListener('pointerleave', () => { ghostLayer.replaceChildren(); });
  svg.addEventListener('pointerenter', (event) => moveGhost(event));
  const renderSheetFrame = (): void => {
    const { width, height } = schema.sheet;
    sheetFrame.replaceChildren(); sheetStamp.replaceChildren();
    const margin = Math.min(5, width * 0.03, height * 0.03);
    const border = document.createElementNS(SVG_NS, 'rect');
    border.setAttribute('x', String(margin)); border.setAttribute('y', String(margin));
    border.setAttribute('width', String(Math.max(0, width - margin * 2))); border.setAttribute('height', String(Math.max(0, height - margin * 2)));
    border.setAttribute('fill', 'none'); border.setAttribute('stroke', '#536273'); border.setAttribute('stroke-width', '0.45');
    border.setAttribute('vector-effect', 'non-scaling-stroke');
    sheetFrame.append(border);

    const metrics = stampMetrics(width, height); const { stampWidth, stampHeight, rowH } = metrics;
    const x = metrics.margin; const y = height + metrics.gap;
    const divider = document.createElementNS(SVG_NS, 'line');
    divider.setAttribute('x1', '0'); divider.setAttribute('y1', String(height)); divider.setAttribute('x2', String(width)); divider.setAttribute('y2', String(height));
    divider.setAttribute('stroke', '#aeb8c4'); divider.setAttribute('stroke-width', '0.6'); divider.setAttribute('vector-effect', 'non-scaling-stroke');
    sheetFrame.append(divider);
    const labelSize = rowH * 0.3; const valueSize = rowH * 0.42;
    const add = (name: string, attrs: Record<string, string>): SVGElement => {
      const node = document.createElementNS(SVG_NS, name);
      for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
      sheetStamp.append(node); return node;
    };
    const fit = (value: string, maxWidth: number, size: number): string => {
      const maxChars = Math.max(1, Math.floor(maxWidth / (size * 0.56)));
      return value.length > maxChars ? `${value.slice(0, Math.max(1, maxChars - 1))}…` : value;
    };
    add('rect', { x: String(x), y: String(y), width: String(stampWidth), height: String(stampHeight), fill: '#fff' });
    for (const cell of STAMP_CELLS) {
      const cx = x + cell.x0 * stampWidth; const cw = (cell.x1 - cell.x0) * stampWidth;
      const cy = y + cell.r0 * rowH; const ch = (cell.r1 - cell.r0) * rowH;
      add('rect', { x: String(cx), y: String(cy), width: String(cw), height: String(ch), fill: 'none', stroke: '#8793a1', 'stroke-width': '0.35', 'vector-effect': 'non-scaling-stroke' });
      const textAttrs = { 'font-family': 'Arial, sans-serif', fill: '#263442' };
      if (cell.label) {
        const centered = !cell.key && cell.r1 - cell.r0 === 1;
        const label = add('text', { ...textAttrs, x: String(centered ? cx + cw / 2 : cx + 1), y: String(centered ? cy + ch / 2 + labelSize * 0.35 : cy + labelSize + 0.5), 'font-size': String(labelSize), fill: '#5b6878', ...(centered ? { 'text-anchor': 'middle' } : {}) });
        label.textContent = fit(cell.label, cw - 1, labelSize);
      }
      if (cell.key) {
        const value = stampValue(schema.sheet, cell.key);
        const multi = cell.r1 - cell.r0 > 1;
        const text = add('text', { ...textAttrs, x: String(cx + 1.2), y: String(multi ? cy + ch / 2 + valueSize * 0.9 : cell.label ? cy + ch - 1 : cy + ch / 2 + valueSize * 0.35), 'font-size': String(valueSize), 'pointer-events': 'none' });
        text.textContent = fit(value, cw - 2.4, valueSize);
        add('rect', { x: String(cx), y: String(cy), width: String(cw), height: String(ch), fill: 'transparent', class: 'stamp-cell', 'data-stamp-field': cell.key });
      }
    }
    add('rect', { x: String(x), y: String(y), width: String(stampWidth), height: String(stampHeight), fill: 'none', stroke: '#536273', 'stroke-width': '0.6', 'vector-effect': 'non-scaling-stroke', 'pointer-events': 'none' });
  };
  const renderSchema = (): void => {
    const { width, height } = schema.sheet;
    const totalHeight = fullSheet(schema.sheet).height;
    for (const id of ['sheet-paper', 'sheet-grid', 'sheet-border']) {
      const rect = root.querySelector<SVGRectElement>(`#${id}`);
      rect?.setAttribute('width', String(width));
      rect?.setAttribute('height', String(id === 'sheet-grid' ? height : totalHeight));
    }
    renderSheetFrame();
    rebuildWireTerminalMap();
    wireLayer.replaceChildren();
    elementLayer.replaceChildren();
    selectionLayer.replaceChildren();
    const wires = schema.wires.filter((wire) => wire.kind !== 'junction');
    const junctions = schema.wires.filter((wire) => wire.kind === 'junction' && wire.dot);
    for (const wire of wires) {
      const line = lineElement(wire);
      if (selected.has(selectionKey({ kind: 'wire', id: wire.id }))) line.classList.add('is-selected-wire');
      wireLayer.append(line);
    }
    for (const dot of junctions) {
      const circle = junctionElement(dot);
      if (selected.has(selectionKey({ kind: 'wire', id: dot.id }))) circle.classList.add('is-selected-junction');
      wireLayer.append(circle);
    }
    for (const element of schema.elements) {
      const symbol = createElementSymbol(element);
      if (symbol) {
        if (selected.has(selectionKey({ kind: 'element', id: element.id }))) symbol.classList.add('is-selected-element');
        elementLayer.append(symbol);
        if (selected.has(selectionKey({ kind: 'element', id: element.id }))) {
          const box = document.createElementNS(SVG_NS, 'rect');
          box.setAttribute('x', String(element.position.x - 1.5)); box.setAttribute('y', String(element.position.y - 1.5));
          box.setAttribute('width', String(Math.max(3, element.size.w + 3))); box.setAttribute('height', String(Math.max(3, element.size.h + 3)));
          box.setAttribute('class', 'element-selection-box'); box.setAttribute('data-box-for', String(element.id)); selectionLayer.append(box);
        }
      }
    }
    for (const item of selected.values()) {
      if (item.kind !== 'wire') continue;
      const wire = schema.wires.find((candidate) => candidate.id === item.id);
      if (!wire || wire.kind === 'junction') continue;
      for (const end of ['from', 'to'] as const) {
        const handle = document.createElementNS(SVG_NS, 'circle');
        handle.setAttribute('cx', String(wire[end].x)); handle.setAttribute('cy', String(wire[end].y));
        handle.setAttribute('r', '2.1'); handle.setAttribute('class', 'wire-end-handle');
        handle.setAttribute('data-wire-end', String(wire.id)); handle.setAttribute('data-end', end);
        selectionLayer.append(handle);
      }
    }
    if (drag?.mode === 'marquee') {
      const box = normalizedBounds(drag.start, drag.current);
      const marquee = document.createElementNS(SVG_NS, 'rect');
      marquee.setAttribute('x', String(box.minX)); marquee.setAttribute('y', String(box.minY));
      marquee.setAttribute('width', String(Math.max(0.1, box.maxX - box.minX)));
      marquee.setAttribute('height', String(Math.max(0.1, box.maxY - box.minY)));
      marquee.setAttribute('class', 'selection-marquee'); selectionLayer.append(marquee);
    }
    drawDraft();
    updateHistoryButtons();
    svg.setAttribute('aria-label', schema.sheet.fileName ? `Схема ${schema.sheet.fileName}` : 'Поле схемы');
    applySimulationVisuals();
    renderProperties();
    persistSchema();
  };

  const groupTitles: Record<Lang, Record<GroupKey, string>> = {
    es: {
      'power-sources': 'Alimentaciones y fuentes', fuses: 'Fusibles y seccionadores', protection: 'Protección', contactors: 'Contactores e interruptores', motors: 'Motores', 'power-electronics': 'Potencia electrónica', 'aux-contacts': 'Contactos auxiliares', 'manual-controls': 'Accionamientos', sensors: 'Detectores y sensores', 'coils-signaling': 'Bobinas, temporizadores y señalización', 'electronic-relays': 'Relés electrónicos', logic: 'Lógica', ladder: 'Ladder', grafcet: 'GRAFCET', 'io-plc': 'Entrada / salida, PLC', pneumatics: 'Actuadores neumáticos', wiring: 'Cables y conexiones', 'realistic-2d': 'Símbolos realistas · 2D', 'realistic-3d': 'Símbolos realistas · 3D',
    },
    en: {
      'power-sources': 'Power supplies', fuses: 'Fuses and disconnectors', protection: 'Protection', contactors: 'Contactors and switches', motors: 'Motors', 'power-electronics': 'Power electronics', 'aux-contacts': 'Auxiliary contacts', 'manual-controls': 'Manual controls', sensors: 'Sensors', 'coils-signaling': 'Coils, timers and signaling', 'electronic-relays': 'Electronic relays', logic: 'Logic', ladder: 'Ladder', grafcet: 'GRAFCET', 'io-plc': 'PLC inputs / outputs', pneumatics: 'Pneumatic actuators', wiring: 'Wires and connections', 'realistic-2d': 'Realistic symbols · 2D', 'realistic-3d': 'Realistic symbols · 3D',
    },
    it: {
      'power-sources': 'Alimentazioni e fonti', fuses: 'Fusibili e sezionatori', protection: 'Protezione', contactors: 'Contattori e interruttori', motors: 'Motori', 'power-electronics': 'Elettronica di potenza', 'aux-contacts': 'Contatti ausiliari', 'manual-controls': 'Comandi manuali', sensors: 'Sensori', 'coils-signaling': 'Bobine, temporizzatori e segnalazione', 'electronic-relays': 'Relè elettronici', logic: 'Logica', ladder: 'Ladder', grafcet: 'GRAFCET', 'io-plc': 'Ingressi / uscite PLC', pneumatics: 'Attuatori pneumatici', wiring: 'Cavi e connessioni', 'realistic-2d': 'Simboli realistici · 2D', 'realistic-3d': 'Simboli realistici · 3D',
    },
    ru: {
      'power-sources': 'Источники питания', fuses: 'Предохранители и разъединители', protection: 'Защита', contactors: 'Контакторы и выключатели', motors: 'Двигатели', 'power-electronics': 'Силовая электроника', 'aux-contacts': 'Вспомогательные контакты', 'manual-controls': 'Ручное управление', sensors: 'Датчики', 'coils-signaling': 'Катушки, реле времени и сигнализация', 'electronic-relays': 'Электронные реле', logic: 'Логика', ladder: 'Ladder', grafcet: 'GRAFCET', 'io-plc': 'Входы / выходы ПЛК', pneumatics: 'Пневматика', wiring: 'Провода и соединения', 'realistic-2d': 'Реалистичные символы · 2D', 'realistic-3d': 'Реалистичные символы · 3D',
    },
  };
  const openPaletteGroups = new Set<string>();
  const renderPalette = (): void => {
    const query = paletteSearch.value.trim();
    const matches = query ? catalog.search(query) : catalog.components;
    const groupIsVisible = (key: GroupKey): boolean => !(OPTIONAL_PALETTE_GROUPS as readonly GroupKey[]).includes(key) || visibleOptionalGroups.has(key);
    const visibleMatches = matches.filter((item) => item.groups.some(groupIsVisible));
    paletteCount.textContent = uiText().elementCount.replace('{count}', new Intl.NumberFormat(paletteLang).format(visibleMatches.length));
    paletteGroups.replaceChildren();
    for (const group of catalog.groups) {
      try {
      if (!groupIsVisible(group.key)) continue;
      const items = matches.filter((item) => item.groups.includes(group.key));
      if (!items.length) continue;
      const section = document.createElement('details'); section.className = 'palette-group';
      section.open = Boolean(query) || openPaletteGroups.has(group.key);
      section.addEventListener('toggle', () => {
        if (query) return;
        if (section.open) openPaletteGroups.add(group.key); else openPaletteGroups.delete(group.key);
      });
      const toggle = document.createElement('summary'); toggle.className = 'palette-group-toggle';
      toggle.textContent = groupTitles[paletteLang]?.[group.key] ?? group.name;
      const countBadge = document.createElement('span'); countBadge.className = 'palette-count-badge'; countBadge.textContent = String(items.length);
      toggle.append(countBadge);
      const list = document.createElement('div'); list.className = 'palette-items';
      section.append(toggle, list);
      paletteGroups.append(section);
      for (const item of items) {
        const mappedType = cadTypeForCommand(item.id);
        const cadType = mappedType && PLACE_DEFAULTS[mappedType.code] ? mappedType : undefined;
        const itemName = catalog.label(item, paletteLang).trim() || (paletteLang === 'ru' ? `Элемент ${item.id}` : String(item.id));
        const button = document.createElement('button'); button.type = 'button'; button.className = 'palette-item';
        button.textContent = itemName;
        button.setAttribute('aria-label', itemName);
        button.title = cadType ? `${itemName} · ${getCadType(cadType.code).label}` : `${itemName} · пока недоступно для размещения`;
        button.dataset.commandId = String(item.id);
        if (!cadType) { button.disabled = true; button.title += ' (нет соответствия с типом .cad)'; }
        else { button.draggable = true; button.setAttribute('aria-pressed', String(activePaletteCommand === item.id)); }
        button.addEventListener('click', () => {
          if (!cadType) return;
          activePaletteCommand = item.id; placementType = cadType.code; placementRotation = 0;
          if (wireDrawing) cancelWireDrawing();
          svg.classList.add('is-placing'); renderPalette(); drawGhost();
          status.textContent = `Размещение: ${itemName} · щёлкните по листу или перетащите элемент; R — поворот, Esc — отмена.`;
        });
        button.addEventListener('dragstart', (event) => {
          if (!event.dataTransfer || !cadType) return;
          activePaletteCommand = item.id; placementType = cadType.code; placementRotation = 0;
          event.dataTransfer.setData('text/plain', String(item.id)); event.dataTransfer.effectAllowed = 'copy';
          svg.classList.add('is-placing');
        });
        list.append(button);
      }
      } catch (error) {
        console.error(`Не удалось отобразить категорию ${group.key}`, error);
      }
    }
  };
  paletteSearch.addEventListener('input', renderPalette);
  for (const input of [...root.querySelectorAll<HTMLInputElement>('[data-optional-group]')]) {
    input.addEventListener('change', () => {
      const key = input.dataset.optionalGroup as GroupKey;
      if ((OPTIONAL_PALETTE_GROUPS as readonly GroupKey[]).includes(key)) {
        if (input.checked) visibleOptionalGroups.add(key); else visibleOptionalGroups.delete(key);
        try { localStorage.setItem(OPTIONAL_GROUP_STORAGE_KEY, JSON.stringify([...visibleOptionalGroups])); } catch { /* Keep the selection for this session. */ }
        renderPalette();
      }
    });
  }
  paletteLanguage.addEventListener('change', () => {
    paletteLang = paletteLanguage.value as Lang;
    try { localStorage.setItem(INTERFACE_LANGUAGE_KEY, paletteLang); } catch { /* Keep the selected language for this session. */ }
    translateInterface();
    renderPalette();
    renderProperties();
    root.querySelector<HTMLDetailsElement>('.language-menu')?.removeAttribute('open');
  });
  renderPalette();

  const cancelWireDrawing = (): void => {
    wireDrawing = false; draftPoints = []; draftCursor = undefined;
    svg.classList.remove('is-drawing-wire');
    renderSchema();
    status.textContent = 'Рисование провода отменено.';
  };
  const startWireDrawing = (): void => {
    placementType = undefined; placementRotation = 0;
    const placeSelect = root.querySelector<HTMLSelectElement>('#place-type');
    if (placeSelect) placeSelect.value = '';
    svg.classList.remove('is-placing');
    selected.clear();
    wireDrawing = true; draftPoints = []; draftCursor = undefined;
    svg.classList.add('is-drawing-wire');
    renderSchema();
    status.textContent = 'Провод: клик — начало, второй клик — конец. Shift+клик — добавить излом, Tab — другой угол, F — сторона пучка, Esc/ПКМ — отмена.';
  };
  const finishWireDrawing = (): void => {
    if (draftPoints.length < 2) { draftPoints = []; draftCursor = undefined; drawDraft(); updateHistoryButtons(); return; }
    let bundle = buildBundleRoutes(draftPoints);
    if (bundle.length && !bundle.every((item) => insideSheet(item.route)) && activeWireKinds().length > 1) {
      bundleFlipped = !bundleFlipped;
      bundle = buildBundleRoutes(draftPoints);
    }
    if (bundle.length === 0 || !bundle.every((item) => insideSheet(item.route))) {
      status.textContent = 'Провода не помещаются на листе в этом месте.';
      draftPoints = []; draftCursor = undefined; drawDraft(); updateHistoryButtons();
      return;
    }
    const before = cloneSchema(schema);
    let id = Math.max(0, ...schema.elements.map((element) => element.id), ...schema.wires.map((wire) => wire.id)) + 1;
    const existingWires = [...schema.wires];
    for (const { route, kind } of bundle) {
      const typeCode = kind === 'phase' ? 4000 : kind === 'neutral' ? 4009 : 4010;
      for (let i = 1; i < route.length; i += 1) {
        const from = route[i - 1]; const to = route[i];
        if (!from || !to || (from.x === to.x && from.y === to.y)) continue;
        schema.wires.push({ id: id++, typeCode, kind, from: { ...from }, to: { ...to }, thickness: 1, dot: false });
      }
      const junctionPoints = new Map<string, Point>();
      for (const point of route) {
        if (existingWires.some((wire) => isWireInteriorPoint(point, wire))) junctionPoints.set(`${point.x},${point.y}`, point);
      }
      for (const point of junctionPoints.values()) {
        const alreadyMarked = schema.wires.some((wire) => wire.kind === 'junction' && wire.from.x === point.x && wire.from.y === point.y);
        if (!alreadyMarked) schema.wires.push({ id: id++, typeCode: 4001, kind: 'junction', from: { ...point }, to: { ...point }, thickness: 0, dot: true });
      }
    }
    // Режим провода остаётся включённым: следующий клик начинает новый провод.
    draftPoints = []; draftCursor = undefined;
    selected.clear();
    commitSchema(before); renderSchema();
    status.textContent = bundle.length > 1 ? `Добавлено проводов: ${bundle.length}. Следующий клик — начало нового.` : 'Провод добавлен. Следующий клик — начало нового, Esc — выйти.';
  };

  const getHit = (target: EventTarget | null): Selectable | undefined => {
    if (!(target instanceof Element)) return undefined;
    const element = target.closest<SVGGElement>('[data-element-id]');
    if (element) return { kind: 'element', id: Number(element.dataset.elementId) };
    const wire = target.closest<SVGElement>('[data-wire-id]');
    if (wire) return { kind: 'wire', id: Number(wire.getAttribute('data-wire-id')) };
    return undefined;
  };

  const selectedObjects = (): Array<{ item: Selectable; position?: Point; from?: Point; to?: Point }> => {
    const objects: Array<{ item: Selectable; position?: Point; from?: Point; to?: Point }> = [];
    for (const item of selected.values()) {
      if (item.kind === 'element') {
        const element = schema.elements.find((candidate) => candidate.id === item.id);
        if (element) objects.push({ item, position: { ...element.position } });
      } else {
        const wire = schema.wires.find((candidate) => candidate.id === item.id);
      if (wire) objects.push({ item, from: { ...wire.from }, to: { ...wire.to } });
      }
    }
    return objects;
  };

  const copySelection = (): void => {
    const elements = [...selected.values()]
      .filter((item) => item.kind === 'element')
      .map((item) => schema.elements.find((element) => element.id === item.id))
      .filter((element): element is SchemaElement => Boolean(element && element.typeCode !== 20000));
    const wires = [...selected.values()]
      .filter((item) => item.kind === 'wire')
      .map((item) => schema.wires.find((wire) => wire.id === item.id))
      .filter((wire): wire is WireSegment => Boolean(wire));
    if (!elements.length && !wires.length) return;

    const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    const include = (x: number, y: number): void => {
      bounds.minX = Math.min(bounds.minX, x); bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x); bounds.maxY = Math.max(bounds.maxY, y);
    };
    for (const element of elements) {
      const extent = elementExtent(element);
      include(element.position.x + Math.min(extent.minX, element.labelOffset.x), element.position.y + Math.min(extent.minY, element.labelOffset.y));
      include(element.position.x + extent.maxX, element.position.y + extent.maxY);
    }
    for (const wire of wires) { include(wire.from.x, wire.from.y); include(wire.to.x, wire.to.y); }
    clipboard = {
      elements: structuredClone(elements),
      wires: structuredClone(wires),
      anchor: { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 },
    };
    updateHistoryButtons();
    status.textContent = `Скопировано объектов: ${elements.length + wires.length}. Наведите курсор и нажмите Ctrl+V.`;
  };

  const pasteSelection = (): void => {
    if (!clipboard) return;
    if (simMode !== 'edit') { status.textContent = 'Остановите симуляцию перед вставкой объектов.'; return; }
    const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    const include = (x: number, y: number): void => {
      bounds.minX = Math.min(bounds.minX, x); bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x); bounds.maxY = Math.max(bounds.maxY, y);
    };
    for (const element of clipboard.elements) {
      const extent = elementExtent(element);
      include(element.position.x + Math.min(extent.minX, element.labelOffset.x), element.position.y + Math.min(extent.minY, element.labelOffset.y));
      include(element.position.x + extent.maxX, element.position.y + extent.maxY);
    }
    for (const wire of clipboard.wires) { include(wire.from.x, wire.from.y); include(wire.to.x, wire.to.y); }
    if (bounds.maxX - bounds.minX > schema.sheet.width || bounds.maxY - bounds.minY > schema.sheet.height) {
      status.textContent = 'Выделенные объекты не помещаются на этот лист.'; return;
    }

    const pointer = pointerSheetPosition ?? screenToSheet({ x: viewSize.x / 2, y: viewSize.y / 2 }, viewport);
    const target = clampPointToSheet(snapPointToGrid(pointer, 3), schema.sheet);
    const delta = clampDeltaToSheet({ x: target.x - clipboard.anchor.x, y: target.y - clipboard.anchor.y }, bounds, schema.sheet);
    const before = cloneSchema(schema);
    let id = Math.max(0, ...schema.elements.map((element) => element.id), ...schema.wires.map((wire) => wire.id)) + 1;
    const pastedElements = structuredClone(clipboard.elements).map((element) => {
      element.id = id++;
      element.position = { x: element.position.x + delta.x, y: element.position.y + delta.y };
      return element;
    });
    const pastedWires = structuredClone(clipboard.wires).map((wire) => {
      wire.id = id++;
      wire.from = { x: wire.from.x + delta.x, y: wire.from.y + delta.y };
      wire.to = { x: wire.to.x + delta.x, y: wire.to.y + delta.y };
      return wire;
    });
    schema.elements.push(...pastedElements);
    schema.wires.push(...pastedWires);
    selected.clear();
    for (const element of pastedElements) {
      const item: Selectable = { kind: 'element', id: element.id };
      selected.set(selectionKey(item), item);
    }
    for (const wire of pastedWires) {
      const item: Selectable = { kind: 'wire', id: wire.id };
      selected.set(selectionKey(item), item);
    }
    commitSchema(before); renderSchema();
    status.textContent = `Вставлено объектов: ${pastedElements.length + pastedWires.length}.`;
  };

  const updateMarqueeSelection = (box: ReturnType<typeof normalizedBounds>, additive: boolean): void => {
    if (!additive) selected.clear();
    for (const element of schema.elements) {
      if (element.typeCode === 20000) continue;
      const points = [{ x: element.position.x, y: element.position.y }, { x: element.position.x + element.size.w, y: element.position.y + element.size.h }, ...element.terminals.map((terminal) => ({ x: element.position.x + terminal.offset.x, y: element.position.y + terminal.offset.y }))];
      const bounds = points.reduce((b, p) => ({ minX: Math.min(b.minX, p.x), minY: Math.min(b.minY, p.y), maxX: Math.max(b.maxX, p.x), maxY: Math.max(b.maxY, p.y) }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
      if (overlaps(box, bounds)) {
        const item: Selectable = { kind: 'element', id: element.id };
        selected.set(selectionKey(item), item);
      }
    }
    for (const wire of schema.wires) {
      if (overlaps(box, normalizedBounds(wire.from, wire.to))) {
        const item: Selectable = { kind: 'wire', id: wire.id };
        selected.set(selectionKey(item), item);
      }
    }
  };

  const deleteSelected = (): void => {
    if (!selected.size) return;
    const before = cloneSchema(schema);
    const elementIds = new Set([...selected.values()].filter((item) => item.kind === 'element').map((item) => item.id));
    const wireIds = new Set([...selected.values()].filter((item) => item.kind === 'wire').map((item) => item.id));
    schema.elements = schema.elements.filter((element) => !elementIds.has(element.id));
    schema.wires = schema.wires.filter((wire) => !wireIds.has(wire.id));
    selected.clear(); commitSchema(before); renderSchema();
    status.textContent = 'Выбранные объекты удалены.';
  };

  const rotateSelection = (): void => {
    if (placementType !== undefined) {
      placementRotation = ((placementRotation + 1) % 4) as 0 | 1 | 2 | 3;
      drawGhost();
      status.textContent = `Размещение: ${getCadType(placementType).label} · поворот ${placementRotation * 90}° · щёлкните по листу или Esc.`;
      return;
    }
    const before = cloneSchema(schema);
    for (const item of selected.values()) {
      if (item.kind !== 'element') continue;
      const element = schema.elements.find((candidate) => candidate.id === item.id);
      if (!element) continue;
      element.rotation = ((element.rotation + 1) % 4) as 0 | 1 | 2 | 3;
      element.size = { w: element.size.h, h: element.size.w };
      element.terminals = buildTerminals(getCadType(element.typeCode), element.terminals.length, element.size, element.rotation, element.terminals.map((terminal) => terminal.label));
      element.position = clampElementPosition(element.position, element, schema.sheet);
    }
    commitSchema(before); renderSchema();
  };

  const placeTypeSelect = root.querySelector<HTMLSelectElement>('#place-type');
  placeTypeSelect?.addEventListener('change', () => {
    if (wireDrawing) cancelWireDrawing();
    activePaletteCommand = undefined;
    placementType = placeTypeSelect.value ? Number(placeTypeSelect.value) : undefined;
    placementRotation = 0;
    svg.classList.toggle('is-placing', placementType !== undefined);
    drawGhost();
    if (placementType !== undefined) status.textContent = `Размещение: ${getCadType(placementType).label} · щёлкните по листу; R — поворот; Esc — отмена.`;
    else status.textContent = 'Режим выбора. Выберите объект или рамкой выделите область.';
  });
  const confirmNewDialog = root.querySelector<HTMLDialogElement>('#confirm-new-dialog');
  const shortcutsDialog = root.querySelector<HTMLDialogElement>('#shortcuts-dialog');
  const aboutDialog = root.querySelector<HTMLDialogElement>('#about-dialog');
  const resetSchema = (): void => {
    schema = createEmptySchema(); history = createHistory(cloneSchema(schema)); selected.clear();
    resetSimulation();
    placementType = undefined; activePaletteCommand = undefined; placementRotation = 0;
    wireDrawing = false; draftPoints = []; draftCursor = undefined;
    if (placeTypeSelect) placeTypeSelect.value = '';
    fileInput.value = ''; fileName.textContent = 'Новая схема';
    svg.classList.remove('is-placing', 'is-drawing-wire');
    status.removeAttribute('title'); status.textContent = 'Новая схема создана.';
    persistSchemaNow();
    viewport = fitViewport(fullSheet(schema.sheet), { width: viewSize.x, height: viewSize.y }); drawViewport(); renderSchema();
  };
  const requestNewSchema = (): void => {
    const hasContent = Boolean(schema.sheet.fileName || schema.elements.length || schema.wires.length);
    if (hasContent) confirmNewDialog?.showModal(); else resetSchema();
  };
  root.querySelector<HTMLButtonElement>('#confirm-new')?.addEventListener('click', () => {
    confirmNewDialog?.close(); resetSchema();
  });
  root.querySelectorAll<HTMLButtonElement>('[data-dialog-close]').forEach((button) => {
    button.addEventListener('click', () => root.querySelector<HTMLDialogElement>(`#${button.dataset.dialogClose}`)?.close());
  });
  overloadAction.addEventListener('click', () => {
    simulationContextMenu.hidden = true;
    if (contextElementId !== undefined) simulateOverload(contextElementId);
  });
  resetInputsAction.addEventListener('click', () => { simulationContextMenu.hidden = true; resetSimulationInputs(); });
  window.addEventListener('pointerdown', (event) => {
    if (!simulationContextMenu.hidden && !simulationContextMenu.contains(event.target as Node)) simulationContextMenu.hidden = true;
  });
  svg.addEventListener('contextmenu', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const item = target?.closest<SVGGElement>('[data-element-id]');
    event.preventDefault();
    showSimulationContextMenu(event, item ? Number(item.dataset.elementId) : undefined);
  });
  const menuGroups = [...root.querySelectorAll<HTMLDetailsElement>('.menu-group')];
  const closeMenus = (except?: HTMLDetailsElement): void => {
    for (const group of menuGroups) if (group !== except) { group.open = false; delete group.dataset.hover; }
  };
  for (const group of menuGroups) {
    group.addEventListener('toggle', () => { if (group.open) closeMenus(group); });
    // Пока открыто одно меню, наведение на соседнее переключает меню; следующий клик по заголовку его не закрывает.
    group.addEventListener('pointerenter', () => {
      if (!menuGroups.some((other) => other.open && other !== group)) return;
      closeMenus(group); group.open = true; group.dataset.hover = '1';
    });
    group.querySelector('summary')?.addEventListener('click', (event) => {
      if (group.dataset.hover === '1') { event.preventDefault(); delete group.dataset.hover; }
    });
  }
  const downloadText = (text: string, name: string, mime: string): void => {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const link = document.createElement('a');
    link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const outputBaseName = (): string => {
    const name = schema.sheet.fileName.replace(/\.(cad|json)$/i, '').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').trim();
    return name || 'Схема';
  };
  const saveJson = (): void => {
    downloadText(serializeSchemaJson(schema), `${outputBaseName()}.json`, 'application/json;charset=utf-8');
    status.textContent = `Схема сохранена в ${outputBaseName()}.json.`;
  };
  const exportCadFile = (): void => {
    try {
      downloadText(exportCad(schema), `${outputBaseName()}.cad`, 'text/plain;charset=utf-8');
      status.textContent = `Экспортировано ${outputBaseName()}.cad; обратный импорт пройден.`;
    } catch (error) {
      status.textContent = `Не удалось экспортировать .cad: ${error instanceof Error ? error.message : String(error)}`;
    }
  };
  const createSheetExportSvg = (): SVGSVGElement => {
    const copy = svg.cloneNode(true) as SVGSVGElement;
    const width = schema.sheet.width;
    const height = fullSheet(schema.sheet).height;
    copy.setAttribute('xmlns', SVG_NS);
    copy.setAttribute('width', `${width}mm`);
    copy.setAttribute('height', `${height}mm`);
    copy.setAttribute('viewBox', `0 0 ${width} ${height}`);
    copy.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    copy.removeAttribute('class');
    copy.querySelector('.viewport-backdrop')?.remove();
    copy.querySelector('#selection-layer')?.remove();
    copy.querySelector('#draft-layer')?.remove();
    copy.querySelector('#ghost-layer')?.remove();
    copy.querySelector('#sheet-transform')?.removeAttribute('transform');
    copy.querySelectorAll('.schematic-element').forEach((element) => {
      element.setAttribute('color', '#263342');
      element.classList.remove('is-selected-element');
    });
    copy.querySelectorAll('.is-selected-wire, .is-selected-junction').forEach((wire) => wire.classList.remove('is-selected-wire', 'is-selected-junction'));
    const title = document.createElementNS(SVG_NS, 'title');
    title.textContent = schema.sheet.fileName || outputBaseName();
    copy.prepend(title);
    const relevantRules: string[] = [];
    for (const sheetStyle of [...document.styleSheets]) {
      try {
        for (const rule of [...sheetStyle.cssRules]) {
          const selectorText = 'selectorText' in rule ? String(rule.selectorText) : '';
          if (/(schematic-element|\.contact|\.blade-|is-sim|lamp-glass)/.test(selectorText)) relevantRules.push(rule.cssText);
        }
      } catch { /* Cross-origin style sheets are not needed for the inline SVG artwork. */ }
    }
    if (relevantRules.length) {
      const style = document.createElementNS(SVG_NS, 'style');
      style.textContent = relevantRules.join('\n');
      copy.insertBefore(style, copy.firstChild);
    }
    return copy;
  };
  const exportSvgFile = (): void => {
    const serialized = new XMLSerializer().serializeToString(createSheetExportSvg());
    downloadText(`<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`, `${outputBaseName()}.svg`, 'image/svg+xml;charset=utf-8');
  };
  const printPdf = (): void => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      status.textContent = 'Разрешите всплывающее окно, чтобы открыть печать и сохранить PDF.';
      return;
    }
    const width = schema.sheet.width;
    const height = fullSheet(schema.sheet).height;
    const orientation = width >= height ? 'landscape' : 'portrait';
    const printWidth = orientation === 'landscape' ? '281mm' : '194mm';
    const printHeight = orientation === 'landscape' ? '194mm' : '281mm';
    const svgMarkup = new XMLSerializer().serializeToString(createSheetExportSvg());
    const title = outputBaseName();
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
      @page { size: A4 ${orientation}; margin: 8mm; }
      html, body { margin: 0; padding: 0; }
      .page { position: relative; width: ${printWidth}; height: ${printHeight}; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
      .page > svg { position: absolute; inset: 0; display: block; width: 100%; height: 100%; color: #263342; }
      @media screen { html, body { width: 100%; height: 100%; } body { display: grid; place-items: center; background: #e8edf3; } .page { width: min(92vw, 1100px); height: min(88vh, 780px); padding: 16px; background: #fff; box-shadow: 0 2px 12px #18243333; } }
    </style></head><body><div class="page">${svgMarkup}</div></body></html>`);
    printWindow.document.close();
    printWindow.addEventListener('afterprint', () => printWindow.close(), { once: true });
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 350);
  };
  window.addEventListener('pointerdown', (event) => { if (!(event.target as Element).closest('.app-menu')) closeMenus(); });
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenus(); });

  const sheetDialog = root.querySelector<HTMLDialogElement>('#sheet-dialog');
  const sheetFormat = root.querySelector<HTMLSelectElement>('#sheet-format');
  const sheetWidth = root.querySelector<HTMLInputElement>('#sheet-width');
  const sheetHeight = root.querySelector<HTMLInputElement>('#sheet-height');
  const syncSheetFormat = (): void => {
    if (!sheetFormat || !sheetWidth || !sheetHeight) return;
    const key = `${sheetWidth.value}x${sheetHeight.value}`;
    sheetFormat.value = [...sheetFormat.options].some((option) => option.value === key) ? key : 'custom';
  };
  const openSheetDialog = (): void => {
    if (!sheetDialog || !sheetWidth || !sheetHeight) return;
    sheetWidth.value = String(schema.sheet.width); sheetHeight.value = String(schema.sheet.height);
    syncSheetFormat(); sheetDialog.showModal();
  };
  sheetFormat?.addEventListener('change', () => {
    if (!sheetWidth || !sheetHeight || !sheetFormat || sheetFormat.value === 'custom') return;
    const [width, height] = sheetFormat.value.split('x'); sheetWidth.value = width!; sheetHeight.value = height!;
  });
  sheetWidth?.addEventListener('input', syncSheetFormat);
  sheetHeight?.addEventListener('input', syncSheetFormat);
  root.querySelector<HTMLButtonElement>('#sheet-apply')?.addEventListener('click', () => {
    if (!sheetWidth || !sheetHeight) return;
    const width = Number(sheetWidth.value); const height = Number(sheetHeight.value);
    const valid = (value: number): boolean => Number.isFinite(value) && value >= 30 && value <= 2000;
    if (!valid(width) || !valid(height)) { status.textContent = 'Размер листа: допустимо от 30 до 2000 мм.'; return; }
    if (width !== schema.sheet.width || height !== schema.sheet.height) {
      const before = cloneSchema(schema);
      schema.sheet.width = width; schema.sheet.height = height;
      commitSchema(before);
      viewport = fitViewport(fullSheet(schema.sheet), { width: viewSize.x, height: viewSize.y }); drawViewport(); renderSchema();
    }
    sheetDialog?.close();
  });
  sheetDialog?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement)) return;
    event.preventDefault();
    root.querySelector<HTMLButtonElement>('#sheet-apply')?.click();
  });

  root.querySelector<HTMLElement>('.app-menu')?.addEventListener('click', (event) => {
    const command = (event.target as Element).closest<HTMLButtonElement>('[data-command]')?.dataset.command;
    if (!command) return;
    root.querySelectorAll<HTMLDetailsElement>('.menu-group[open]').forEach((menu) => menu.removeAttribute('open'));
    switch (command) {
      case 'new': requestNewSchema(); break;
      case 'open': fileInput.click(); break;
      case 'copy-selection': copySelection(); break;
      case 'paste-selection': pasteSelection(); break;
      case 'save-json': saveJson(); break;
      case 'export-cad': exportCadFile(); break;
      case 'export-svg': exportSvgFile(); break;
      case 'print-pdf': printPdf(); break;
      case 'undo': undoButton.click(); break;
      case 'redo': redoButton.click(); break;
      case 'rotate': rotateSelection(); break;
      case 'delete': deleteSelected(); break;
      case 'zoom-in': root.querySelector<HTMLButtonElement>('[data-zoom="in"]')?.click(); break;
      case 'zoom-out': root.querySelector<HTMLButtonElement>('[data-zoom="out"]')?.click(); break;
      case 'fit': root.querySelector<HTMLButtonElement>('[data-zoom="fit"]')?.click(); break;
      case 'theme': toggleTheme(); break;
      case 'grid': toggleGrid(); break;
      case 'sheet': openSheetDialog(); break;
      case 'shortcuts': shortcutsDialog?.showModal(); break;
      case 'about': aboutDialog?.showModal(); break;
    }
  });
  root.querySelector<HTMLButtonElement>('#rotate-selection')?.addEventListener('click', rotateSelection);
  root.querySelector<HTMLButtonElement>('#delete-selection')?.addEventListener('click', deleteSelected);
  panToolButton?.addEventListener('click', () => setPanTool(!panTool));
  /** Курсор: возвращает обычный режим выбора. Выключает «Руку» и прерывает рисование провода и размещение элемента. */
  const selectTool = (): void => {
    if (wireDrawing) cancelWireDrawing();
    if (placementType !== undefined) {
      placementType = undefined; placementRotation = 0;
      activePaletteCommand = undefined; renderPalette();
      if (placeTypeSelect) placeTypeSelect.value = '';
      svg.classList.remove('is-placing');
    }
    setPanTool(false);
    status.textContent = 'Курсор: выбор и перемещение элементов.';
  };
  selectToolButton?.addEventListener('click', selectTool);
  drawWireButton.addEventListener('click', () => wireDrawing ? cancelWireDrawing() : startWireDrawing());
  finishWireButton.addEventListener('click', finishWireDrawing);
  wireKindSelect.addEventListener('change', () => { if (wireDrawing) drawDraft(); });
  undoButton.addEventListener('click', () => {
    if (wireDrawing && draftPoints.length) { draftPoints.pop(); draftCursor = undefined; drawDraft(); updateHistoryButtons(); return; }
    if (canUndo(history)) restoreHistory(undoHistory(history));
  });
  redoButton.addEventListener('click', () => { if (canRedo(history)) restoreHistory(redoHistory(history)); });
  runButton.addEventListener('click', startSimulation);
  stopButton.addEventListener('click', stopSimulation);
  const speedLevels = [1, 1.25, 1.5, 2, 0.25, 0.5];
  const updateSpeedButton = (): void => {
    const label = `${simSpeed}×`;
    speedButton.textContent = label;
    speedButton.setAttribute('aria-label', `Скорость симуляции: ${label}`);
  };
  speedButton.addEventListener('click', () => {
    const currentIndex = speedLevels.indexOf(simSpeed);
    simSpeed = speedLevels[(currentIndex + 1) % speedLevels.length]!;
    updateSpeedButton();
  });
  updateSimulationControls();
  drawViewport();

  const openDocumentText = (text: string, name: string): void => {
    status.textContent = `Загрузка ${name}…`;
    try {
      const isJson = /\.json$/i.test(name);
      let openedSchema: Schema;
      let warningMessages: string[] = [];
      let unknownTypes: number[] = [];
      if (isJson) openedSchema = parseSchemaJson(text);
      else {
        const result = importCad(text);
        openedSchema = result.schema;
        warningMessages = result.warnings.map((warning) => warning.message);
        unknownTypes = result.unknownTypes;
      }
      placementType = undefined; placementRotation = 0;
      wireDrawing = false; draftPoints = []; draftCursor = undefined;
      svg.classList.remove('is-drawing-wire');
      if (placeTypeSelect) placeTypeSelect.value = '';
      svg.classList.remove('is-placing');
      selected.clear();
      schema = openedSchema;
      schema.sheet.fileName = name;
      // Схема вплотную к границе листа: увеличиваем лист до A3 (420×297) или по содержимому с запасом.
      const contentBounds = schemaBounds(schema);
      if (contentBounds && (contentBounds.maxY > schema.sheet.height - 30 || contentBounds.maxX > schema.sheet.width - 20)) {
        schema.sheet.width = Math.max(schema.sheet.width, 420, Math.ceil(contentBounds.maxX + 40));
        schema.sheet.height = Math.max(schema.sheet.height, 297, Math.ceil(contentBounds.maxY + 40));
        const settings = schema.sheet.cadFooter?.settings;
        if (settings && settings.length >= 2) { settings[settings.length - 2] = schema.sheet.width; settings[settings.length - 1] = schema.sheet.height; }
      }
      history = createHistory(cloneSchema(schema));
      persistSchemaNow();
      resetSimulation();
      renderSchema();
      fileName.textContent = name;
      const notes = [
        `${schema.elements.length} элементов`,
        `${schema.wires.filter((wire) => wire.kind !== 'junction').length} отрезков`,
        `${schema.wires.filter((wire) => wire.kind === 'junction' && wire.dot).length} узлов`,
      ];
      const warnings = warningMessages.length + unknownTypes.length;
      status.textContent = `${notes.join(' · ')}${warnings ? ` · предупреждений: ${warnings}` : ''}`;
      if (warnings) status.title = [...warningMessages, ...unknownTypes.map((type) => `Неизвестный тип элемента ${type}`)].join('\n');
      else status.removeAttribute('title');
      const bounds = schemaBounds(schema);
      viewport = bounds ? fitBounds(bounds, viewSize) : fitViewport(fullSheet(schema.sheet), { width: viewSize.x, height: viewSize.y });
      drawViewport();
    } catch (error) {
      status.textContent = `Не удалось открыть файл: ${error instanceof Error ? error.message : String(error)}`;
    }
  };
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    openDocumentText(await file.text(), file.name);
  });
  root.querySelector<HTMLElement>('.menu-examples')?.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-example]');
    if (!button) return;
    const example = EXAMPLES.find((candidate) => candidate.number === Number(button.dataset.example));
    root.querySelectorAll<HTMLDetailsElement>('.menu-group[open]').forEach((menu) => menu.removeAttribute('open'));
    if (example) { stopSimulation(); openDocumentText(example.text, example.fileName); }
  });

  svg.addEventListener('wheel', (event) => {
    event.preventDefault(); viewport = zoomAt(viewport, svgPoint(event, svg, viewSize), Math.exp(-event.deltaY * 0.001)); drawViewport();
  }, { passive: false });
  svg.addEventListener('dragover', (event) => {
    if (placementType === undefined) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    moveGhost(event);
  });
  svg.addEventListener('drop', (event) => {
    const commandId = Number(event.dataTransfer?.getData('text/plain'));
    const cadType = cadTypeForCommand(commandId);
    if (!cadType) return;
    event.preventDefault();
    placementType = cadType.code; activePaletteCommand = commandId; placementRotation = 0;
    const point = screenToSheet(svgPoint(event, svg, viewSize), viewport);
    const before = cloneSchema(schema);
    const element = createPlacedElement(cadType.code, point, placementRotation, schema);
    schema.elements.push(element);
    const item: Selectable = { kind: 'element', id: element.id };
    selected.clear(); selected.set(selectionKey(item), item);
    commitSchema(before); renderSchema();
    status.textContent = `Добавлен ${element.name}. Режим размещения продолжается; R — поворот, Esc — завершить.`;
  });
  svg.addEventListener('contextmenu', (event) => {
    if (!wireDrawing) return;
    event.preventDefault();
    if (draftPoints.length) { draftPoints = []; draftCursor = undefined; drawDraft(); updateHistoryButtons(); } else cancelWireDrawing();
  });
  svg.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 && event.button !== 1) return;
    svg.focus({ preventScroll: true });
    const screen = svgPoint(event, svg, viewSize);
    pointerSheetPosition = screenToSheet(screen, viewport);
    const stampKey = (event.target as Element).closest?.('[data-stamp-field]')?.getAttribute('data-stamp-field');
    if (stampKey && event.button === 0 && !panTool && !wireDrawing && placementType === undefined) {
      event.preventDefault();
      setTimeout(() => openStampEditor(stampKey as StampKey), 0);
      return;
    }
    if (panTool && event.button === 0) {
      drag = { mode: 'pan', pointerId: event.pointerId, last: screen };
      svg.classList.add('is-panning'); svg.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }
    if (event.button === 0 && wireDrawing) {
      const raw = clampPointToSheet(screenToSheet(screen, viewport), schema.sheet);
      const snapped = clampPointToSheet(snapDrawingPoint(raw, schema).point, schema.sheet);
      const previous = draftPoints[draftPoints.length - 1];
      if (!previous) draftPoints.push(snapped);
      else if (previous.x !== snapped.x || previous.y !== snapped.y) {
        draftPoints.push(snapped);
        if (!event.shiftKey) { finishWireDrawing(); event.preventDefault(); return; }
      }
      draftCursor = undefined;
      drawDraft(); updateHistoryButtons();
      if (draftPoints.length === 1) status.textContent = 'Начало задано. Кликните там, где провод должен закончиться (Shift+клик — излом).';
      event.preventDefault();
      return;
    }
    if (event.button === 0 && placementType !== undefined) {
      const before = cloneSchema(schema);
      const point = screenToSheet(screen, viewport);
      const element = createPlacedElement(placementType, point, placementRotation, schema);
      schema.elements.push(element);
      const item: Selectable = { kind: 'element', id: element.id };
      selected.clear(); selected.set(selectionKey(item), item);
      commitSchema(before);
      renderSchema();
      status.textContent = `Добавлен ${element.name}. Режим размещения продолжается; R — поворот, Esc — завершить.`;
      event.preventDefault();
      return;
    }
    if (event.button === 0 && simMode !== 'edit') {
      const hit = getHit(event.target);
      if (hit?.kind === 'element') {
        const element = schema.elements.find((candidate) => candidate.id === hit.id);
        if (element && momentaryTypes.has(element.typeCode)) {
          pressMomentary(element.id); svg.setPointerCapture(event.pointerId); event.preventDefault(); return;
        }
        if (element && POSITION_SPECS[element.typeCode]) {
          // Conmutador: клик переводит в следующую позицию по кругу (порядок в POSITION_SPECS.cycle).
          const positions = (simInputs.positions ??= {});
          const next = nextPosition(element.typeCode, positions[element.id]);
          positions[element.id] = next;
          if (element.name.trim() !== '') {
            for (const twin of schema.elements) {
              if (twin.id !== element.id && twin.typeCode === element.typeCode && twin.name === element.name) positions[twin.id] = next;
            }
          }
          applySimulationInput(); event.preventDefault(); return;
        }
        if (element && maintainedTypes.has(element.typeCode)) {
          const next = !(simInputs.toggled[element.id] ?? false);
          simInputs.toggled[element.id] = next;
          // Контакты одного устройства, нарисованные несколькими символами с тем же обозначением, переключаются вместе.
          if (element.name.trim() !== '') {
            for (const twin of schema.elements) {
              if (twin.id !== element.id && twin.typeCode === element.typeCode && twin.name === element.name) simInputs.toggled[twin.id] = next;
            }
          }
          applySimulationInput(); event.preventDefault(); return;
        }
        if (element && latchedTypes.has(element.typeCode)) {
          const defaultClosed = armedByDefaultTypes.has(element.typeCode);
          const next = !(simInputs.toggled[element.id] ?? defaultClosed);
          simInputs.toggled[element.id] = next;
          // Одно устройство может быть нарисовано несколькими символами с тем же обозначением (например, дубль -F): переключаем их вместе.
          if (element.name.trim() !== '') {
            for (const twin of schema.elements) {
              if (twin.id !== element.id && twin.typeCode === element.typeCode && twin.name === element.name) simInputs.toggled[twin.id] = next;
            }
          }
          applySimulationInput(); event.preventDefault(); return;
        }
      }
    }
    if (event.button === 1 || spaceDown) {
      drag = { mode: 'pan', pointerId: event.pointerId, last: screen };
      svg.classList.add('is-panning');
      event.preventDefault();
    } else {
      const target = event.target instanceof Element ? event.target : null;
      const endpoint = target?.closest<SVGCircleElement>('[data-wire-end]');
      const sheetPoint = screenToSheet(screen, viewport);
      if (endpoint) {
        const wireId = Number(endpoint.dataset.wireEnd);
        const end = endpoint.dataset.end as 'from' | 'to';
        const wire = schema.wires.find((candidate) => candidate.id === wireId);
        if (wire) {
          const item: Selectable = { kind: 'wire', id: wireId };
          if (!selected.has(selectionKey(item))) { selected.clear(); selected.set(selectionKey(item), item); }
          dragSnapshot = cloneSchema(schema);
          drag = { mode: 'resize', pointerId: event.pointerId, wireId, end, original: { ...wire[end] } };
          renderSchema();
        }
      } else {
        const hit = getHit(event.target);
        if (hit) {
          const key = selectionKey(hit);
          if (event.shiftKey) {
            if (selected.has(key)) selected.delete(key); else selected.set(key, hit);
          } else if (!selected.has(key)) {
            selected.clear(); selected.set(key, hit);
          }
          renderSchema();
          if (selected.has(key)) {
            dragSnapshot = cloneSchema(schema);
            drag = { mode: 'move', pointerId: event.pointerId, start: sheetPoint, objects: selectedObjects() };
          }
        } else {
          if (!event.shiftKey) selected.clear();
          drag = { mode: 'marquee', pointerId: event.pointerId, start: sheetPoint, current: sheetPoint, additive: event.shiftKey };
          renderSchema();
        }
      }
    }
    if (drag) svg.setPointerCapture(event.pointerId);
  });
  /**
   * Быстрый путь перемещения: при перетаскивании меняются только transform и координаты
   * уже нарисованных узлов (раз в кадр), а полная перерисовка схемы идёт один раз при отпускании.
   * Раньше каждое движение мыши пересоздавало все ~300 символов, и крупные трёхфазные элементы «тормозили».
   */
  let movePreviewFrame: number | undefined;
  const applyMovePreview = (): void => {
    movePreviewFrame = undefined;
    if (!drag || drag.mode !== 'move') return;
    for (const object of drag.objects) {
      if (object.item.kind === 'element') {
        const id = object.item.id;
        const element = schema.elements.find((candidate) => candidate.id === id);
        if (!element) continue;
        elementLayer.querySelector(`[data-element-id="${id}"]`)?.setAttribute('transform', `translate(${element.position.x} ${element.position.y}) rotate(${element.rotation * 90})`);
        const box = selectionLayer.querySelector(`[data-box-for="${id}"]`);
        box?.setAttribute('x', String(element.position.x - 1.5)); box?.setAttribute('y', String(element.position.y - 1.5));
      } else {
        const id = object.item.id;
        const wire = schema.wires.find((candidate) => candidate.id === id);
        if (!wire) continue;
        const node = wireLayer.querySelector(`[data-wire-id="${id}"]`);
        if (wire.kind === 'junction') { node?.setAttribute('cx', String(wire.from.x)); node?.setAttribute('cy', String(wire.from.y)); }
        else {
          node?.setAttribute('x1', String(wire.from.x)); node?.setAttribute('y1', String(wire.from.y));
          node?.setAttribute('x2', String(wire.to.x)); node?.setAttribute('y2', String(wire.to.y));
          for (const handle of selectionLayer.querySelectorAll(`[data-wire-end="${id}"]`)) {
            const end = handle.getAttribute('data-end') === 'to' ? wire.to : wire.from;
            handle.setAttribute('cx', String(end.x)); handle.setAttribute('cy', String(end.y));
          }
        }
      }
    }
  };
  const scheduleMovePreview = (): void => {
    if (movePreviewFrame === undefined) movePreviewFrame = requestAnimationFrame(applyMovePreview);
  };
  svg.addEventListener('pointermove', (event) => {
    const pointerScreen = svgPoint(event, svg, viewSize);
    pointerSheetPosition = screenToSheet(pointerScreen, viewport);
    if (!drag) moveGhost(event);
    if (!drag || drag.pointerId !== event.pointerId) {
      if (!drag && wireDrawing) {
        const raw = clampPointToSheet(screenToSheet(svgPoint(event, svg, viewSize), viewport), schema.sheet);
        draftCursor = clampPointToSheet(snapDrawingPoint(raw, schema).point, schema.sheet);
        drawDraft();
      }
      return;
    }
    const screen = svgPoint(event, svg, viewSize);
    const sheetPoint = screenToSheet(screen, viewport);
    if (drag.mode === 'pan') {
      viewport = panBy(viewport, { x: screen.x - drag.last.x, y: screen.y - drag.last.y });
      pointerSheetPosition = screenToSheet(screen, viewport);
      drag.last = screen; drawViewport();
    } else if (drag.mode === 'move') {
      const group = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
      const grow = (x0: number, y0: number, x1: number, y1: number): void => {
        group.minX = Math.min(group.minX, x0); group.minY = Math.min(group.minY, y0);
        group.maxX = Math.max(group.maxX, x1); group.maxY = Math.max(group.maxY, y1);
      };
      for (const object of drag.objects) {
        if (object.item.kind === 'element' && object.position) {
          const element = schema.elements.find((candidate) => candidate.id === object.item.id);
          if (!element) continue;
          const ext = elementExtent(element);
          grow(object.position.x + ext.minX, object.position.y + ext.minY, object.position.x + ext.maxX, object.position.y + ext.maxY);
        } else if (object.item.kind === 'wire' && object.from && object.to) {
          grow(Math.min(object.from.x, object.to.x), Math.min(object.from.y, object.to.y), Math.max(object.from.x, object.to.x), Math.max(object.from.y, object.to.y));
        }
      }
      const delta = Number.isFinite(group.minX)
        ? clampDeltaToSheet({ x: sheetPoint.x - drag.start.x, y: sheetPoint.y - drag.start.y }, group, schema.sheet)
        : { x: 0, y: 0 };
      for (const object of drag.objects) {
        if (object.item.kind === 'element' && object.position) {
          const element = schema.elements.find((candidate) => candidate.id === object.item.id);
          if (element) element.position = { x: object.position.x + delta.x, y: object.position.y + delta.y };
        } else if (object.item.kind === 'wire' && object.from && object.to) {
          const wire = schema.wires.find((candidate) => candidate.id === object.item.id);
          if (wire) {
            wire.from = { x: object.from.x + delta.x, y: object.from.y + delta.y };
            wire.to = { x: object.to.x + delta.x, y: object.to.y + delta.y };
          }
        }
      }
      scheduleMovePreview();
    } else if (drag.mode === 'resize') {
      const resize = drag;
      const wire = schema.wires.find((candidate) => candidate.id === resize.wireId);
      if (wire) wire[resize.end] = clampPointToSheet(sheetPoint, schema.sheet);
      renderSchema();
    } else {
      drag.current = sheetPoint;
      renderSchema();
    }
  });
  const endInteraction = (event: PointerEvent): void => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.mode === 'marquee') {
      const end = screenToSheet(svgPoint(event, svg, viewSize), viewport);
      const threshold = 4 / viewport.scale;
      if (Math.hypot(end.x - drag.start.x, end.y - drag.start.y) > threshold) {
        updateMarqueeSelection(normalizedBounds(drag.start, drag.current), drag.additive);
      }
    }
    if (movePreviewFrame !== undefined) { cancelAnimationFrame(movePreviewFrame); movePreviewFrame = undefined; }
    if (dragSnapshot) commitSchema(dragSnapshot);
    dragSnapshot = undefined;
    drag = undefined;
    svg.classList.remove('is-panning');
    renderSchema();
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
  };
  svg.addEventListener('pointerup', endInteraction); svg.addEventListener('pointercancel', endInteraction);
  const releaseAllMomentary = (): void => { for (const id of [...heldInputs]) releaseMomentary(id); };
  window.addEventListener('pointerup', releaseAllMomentary);
  window.addEventListener('pointercancel', releaseAllMomentary);
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement) && !(event.target instanceof HTMLSelectElement)) {
      spaceDown = true; event.preventDefault();
    }
    const editingField = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement;
    const placementSelectFocused = event.target instanceof HTMLSelectElement && event.target.id === 'place-type';
    if (root.querySelector('dialog[open]')) return;
    if (!simulationContextMenu.hidden && event.key === 'Escape') {
      simulationContextMenu.hidden = true; event.preventDefault(); return;
    }
    if (!event.ctrlKey && !event.metaKey && !event.altKey && !editingField && event.key.toLowerCase() === 'h') {
      setPanTool(!panTool); event.preventDefault(); return;
    }
    if (!event.ctrlKey && !event.metaKey && !event.altKey && !editingField && event.key.toLowerCase() === 'v') {
      selectTool(); event.preventDefault(); return;
    }
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && !editingField && event.key.toLowerCase() === 'c') {
      copySelection(); event.preventDefault(); return;
    }
    if (modifier && !editingField && event.key.toLowerCase() === 'v') {
      pasteSelection(); event.preventDefault(); return;
    }
    if (modifier && !event.shiftKey && !editingField && event.key.toLowerCase() === 's') {
      saveJson(); event.preventDefault(); return;
    }
    if (modifier && !editingField && event.key.toLowerCase() === 'n') {
      requestNewSchema(); event.preventDefault(); return;
    }
    if (modifier && !editingField && event.key.toLowerCase() === 'o') {
      fileInput.click(); event.preventDefault(); return;
    }
    if (modifier && !editingField && event.key === '0') {
      root.querySelector<HTMLButtonElement>('[data-zoom="fit"]')?.click(); event.preventDefault(); return;
    }
    if (!editingField && (event.key === '+' || event.key === '=')) {
      root.querySelector<HTMLButtonElement>('[data-zoom="in"]')?.click(); event.preventDefault(); return;
    }
    if (!editingField && (event.key === '-' || event.key === '_')) {
      root.querySelector<HTMLButtonElement>('[data-zoom="out"]')?.click(); event.preventDefault(); return;
    }
    const isTextField = event.target instanceof HTMLTextAreaElement
      || (event.target instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'range'].includes(event.target.type));
    if (modifier && !isTextField && event.code === 'KeyZ') {
      if (event.shiftKey) { if (canRedo(history)) restoreHistory(redoHistory(history)); }
      else if (wireDrawing && draftPoints.length) { draftPoints.pop(); draftCursor = undefined; drawDraft(); updateHistoryButtons(); }
      else if (canUndo(history)) restoreHistory(undoHistory(history));
      event.preventDefault();
      return;
    }
    if (modifier && !isTextField && event.code === 'KeyY') {
      if (canRedo(history)) restoreHistory(redoHistory(history));
      event.preventDefault();
      return;
    }
    if (wireDrawing && !editingField && (event.key === 'Tab' || event.code === 'KeyF') && !modifier) {
      if (event.key === 'Tab') elbowVerticalFirst = !elbowVerticalFirst; else bundleFlipped = !bundleFlipped;
      drawDraft(); event.preventDefault(); return;
    }
    if (event.key === 'Enter' && wireDrawing) { finishWireDrawing(); event.preventDefault(); return; }
    if (event.key === 'Escape' && placementType !== undefined) {
      placementType = undefined; placementRotation = 0;
      activePaletteCommand = undefined; renderPalette();
      if (placeTypeSelect) placeTypeSelect.value = '';
      svg.classList.remove('is-placing');
      status.textContent = 'Режим размещения завершён.';
      event.preventDefault();
    } else if (event.key === 'Escape' && wireDrawing) { if (draftPoints.length) { draftPoints = []; draftCursor = undefined; drawDraft(); updateHistoryButtons(); } else cancelWireDrawing(); event.preventDefault(); }
    else if (event.key === 'Escape' && selected.size) { selected.clear(); renderSchema(); }
    if (!editingField && (event.key === 'Delete' || event.key === 'Backspace')) { deleteSelected(); event.preventDefault(); }
    if ((!editingField || placementSelectFocused) && event.key.toLowerCase() === 'r') { rotateSelection(); event.preventDefault(); }
  });
  window.addEventListener('keyup', (event) => { if (event.code === 'Space') spaceDown = false; });
  window.addEventListener('pagehide', persistSchemaNow);

  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0; const height = entry?.contentRect.height ?? 0;
      if (width <= 0 || height <= 0 || (width === viewSize.x && height === viewSize.y)) return;
      const sheetCenter = screenToSheet({ x: viewSize.x / 2, y: viewSize.y / 2 }, viewport);
      viewSize = { x: width, y: height }; svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      backdrop?.setAttribute('width', String(width)); backdrop?.setAttribute('height', String(height));
      viewport = { ...viewport, offsetX: width / 2 - sheetCenter.x * viewport.scale, offsetY: height / 2 - sheetCenter.y * viewport.scale };
      drawViewport();
    });
    observer.observe(svg);
  }
  root.querySelector<HTMLButtonElement>('[data-zoom="in"]')?.addEventListener('click', () => { viewport = zoomAt(viewport, { x: viewSize.x / 2, y: viewSize.y / 2 }, 1.2); drawViewport(); });
  root.querySelector<HTMLButtonElement>('[data-zoom="out"]')?.addEventListener('click', () => { viewport = zoomAt(viewport, { x: viewSize.x / 2, y: viewSize.y / 2 }, 1 / 1.2); drawViewport(); });
  root.querySelector<HTMLButtonElement>('[data-zoom="fit"]')?.addEventListener('click', () => {
    const bounds = schemaBounds(schema);
    viewport = bounds ? fitBounds(bounds, viewSize) : fitViewport(fullSheet(schema.sheet), { width: viewSize.x, height: viewSize.y });
    drawViewport();
  });
  renderSchema();
}

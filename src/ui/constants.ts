import type { GroupKey } from '@model/catalog';
import type { PotentialLabel } from '@engine/types';
import type { Point } from './viewport';

export type StampKey = 'drawnDate' | 'author' | 'drawnSign' | 'checkedDate' | 'checkedName' | 'checkedSign' | 'entity' | 'title' | 'date' | 'number' | 'total' | 'fileName';

export type Theme = 'light' | 'dark';

export type Selectable = { kind: 'element' | 'wire'; id: number };

export type DragState =
  | { mode: 'pan'; pointerId: number; last: Point }
  | { mode: 'move'; pointerId: number; start: Point; objects: Array<{ item: Selectable; position?: Point; from?: Point; to?: Point }> }
  | { mode: 'resize'; pointerId: number; wireId: number; end: 'from' | 'to'; original: Point }
  | { mode: 'marquee'; pointerId: number; start: Point; current: Point; additive: boolean };

export const FALLBACK_VIEWPORT = { width: 1000, height: 700 };

export const AUTOSAVE_KEY = 'cadesimu-web:autosave:v1';
export const CAD_EXPORT_WARNING_KEY = 'cadesimu-web:cad-export-warning-dismissed:v1';

export const OPTIONAL_GROUP_STORAGE_KEY = 'cadesimu-visible-optional-groups:v1';

export const OPTIONAL_PALETTE_GROUPS = ['grafcet', 'ladder', 'logic', 'realistic-2d', 'realistic-3d', 'wiring', 'pneumatics', 'io-plc', 'power-electronics', 'electronic-relays'] as const satisfies readonly GroupKey[];

export const CAD_GRID_STEP = 3;

export const SVG_NS = 'http://www.w3.org/2000/svg';

export const WIRE_COLORS = { phase: '#9e1b16', neutral: '#7a8798', protection: '#7a8798', junction: '#263342' } as const;

export const POTENTIAL_COLORS: Record<PotentialLabel, string> = {
  L1: '#b4541a', L2: '#1b2430', L3: '#8e99a8', N: '#1f6fe0', PE: '#1fa355', '+': '#d93a3a', '-': '#1b2430',
};

export const IDLE_WIRE_COLORS = { phase: '#7a8798', neutral: '#7a8798', protection: '#7a8798', junction: '#5b6878' } as const;

export const CONFLICT_COLOR = '#e5322d';

export const UNIFORM_LIVE_COLOR = '#d92d27';

export const PHASE_LABELS: readonly PotentialLabel[] = ['L1', 'L2', 'L3'];

export const CADESIM_URL = 'https://github.com/igorYurievich/cadesimweb';

export const CADESIM_LINK_TEXT = 'Cadesim web';

export const STAMP_CELLS: ReadonlyArray<{ key?: StampKey; label?: string; x0: number; x1: number; r0: number; r1: number; hint?: string }> = [
  { label: 'Fecha', x0: 0.075, x1: 0.15, r0: 0, r1: 1 }, { label: 'Nombre', x0: 0.15, x1: 0.25, r0: 0, r1: 1 }, { label: 'Firmas', x0: 0.25, x1: 0.35, r0: 0, r1: 1 },
  { label: 'Dibujado', x0: 0, x1: 0.075, r0: 1, r1: 2 }, { label: 'Comprobado', x0: 0, x1: 0.075, r0: 2, r1: 3 },
  { key: 'drawnDate', x0: 0.075, x1: 0.15, r0: 1, r1: 2, hint: 'Дата (Dibujado)' }, { key: 'author', x0: 0.15, x1: 0.25, r0: 1, r1: 2, hint: 'Автор (Dibujado)' }, { key: 'drawnSign', x0: 0.25, x1: 0.35, r0: 1, r1: 2, hint: 'Подпись (Dibujado)' },
  { key: 'checkedDate', x0: 0.075, x1: 0.15, r0: 2, r1: 3, hint: 'Дата (Comprobado)' }, { key: 'checkedName', x0: 0.15, x1: 0.25, r0: 2, r1: 3, hint: 'Проверил (Comprobado)' }, { key: 'checkedSign', x0: 0.25, x1: 0.35, r0: 2, r1: 3, hint: 'Подпись (Comprobado)' },
  { key: 'entity', label: 'Entidad', x0: 0.35, x1: 0.54, r0: 0, r1: 3, hint: 'Организация' },
  { key: 'title', label: 'Título', x0: 0.54, x1: 0.79, r0: 0, r1: 3, hint: 'Название схемы' },
  { key: 'date', label: 'Fecha', x0: 0.79, x1: 0.895, r0: 0, r1: 1, hint: 'Дата' }, { key: 'number', label: 'Núm', x0: 0.895, x1: 0.945, r0: 0, r1: 1, hint: 'Номер листа' }, { key: 'total', label: 'de', x0: 0.945, x1: 1, r0: 0, r1: 1, hint: 'Всего листов' },
  { key: 'fileName', label: 'Archivo', x0: 0.79, x1: 1, r0: 1, r1: 3, hint: 'Имя файла' },
];

export const POTENTIAL_ORDER: readonly PotentialLabel[] = ['L1', 'L2', 'L3', 'N', 'PE', '+', '-'];

export const latchedTypes = new Set([2003, 2004, 2005, 2007, 5000, 5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008, 5009, 6000, 6001, 6002, 6003, 6004, 6005, 6006, 6007, 6008, 6009, 6010, 6011, 6012]);

export const armedByDefaultTypes = new Set([5000, 5001, 5002, 5003, 5004, 6007]);

export const startsOpen = (typeCode: number): boolean => latchedTypes.has(typeCode) && !armedByDefaultTypes.has(typeCode);

export const PLACEABLE_TYPES = [1000, 1001, 1002, 1008, 1010, 1003, 1005, 1004, 1006, 1007, 1011, 1012, 1009, 1050, 1051, 1052, 1053, 1062, 1063, 1054, 1055, 1056, 1057, 1058, 1059, 1060, 1061, 1065, 1066, 1067, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 3000, 3001, 3002, 3003, 3011, 3004, 3005, 3006, 3007, 3008, 3009, 3010, 3015, 3012, 3017, 3016, 3013, 3014, 3018, 3019, 3020, 5000, 5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008, 5009, 6000, 6001, 6002, 6003, 6004, 6005, 6006, 6007, 6008, 6009, 6010, 6011, 6012, 6013, 6014, 7000, 7001, 7002, 7003, 7004, 7005, 7006, 7007, 7008, 7009, 7010, 7011, 7012, 7013, 7014, 7015, 8000, 8001, 8002, 8003, 8004, 8005, 8006, 8007, 8008, 8009, 8010, 8011, 8012, 8013, 8014, 8015, 8016, 8017, 8019, 8020, 8021, 8022, 8023, 8018, 9000, 9001, 9002, 9003, 9004, 9005, 9006, 9007, 9015, 9014, 9016, 9008, 9009, 9010, 9011, 9012, 9013];

export const PLACE_DEFAULTS: Record<number, { prefix: string; size: { w: number; h: number }; labels: string[] }> = {
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
  // Силовая электроника (часть 1 из 2): размеры и метки из образца potencias_electronicas.cad, порядок как в панели.
  1050: { prefix: 'R', size: { w: 6, h: 18 }, labels: ['1', '2'] },
  1051: { prefix: 'R', size: { w: 18, h: 18 }, labels: ['1', '3', '5', '2', '4', '6'] },
  1052: { prefix: 'T', size: { w: 18, h: 21 }, labels: ['1', '4', '7', '2', '5', '8', '3', '6', '9'] },
  1053: { prefix: 'G', size: { w: 21, h: 27 }, labels: ['1', '3', '5', '2', '4', '6', 'PE'] },
  1062: { prefix: 'G', size: { w: 15, h: 27 }, labels: ['IN', 'A1', 'A2'] },
  1063: { prefix: 'G', size: { w: 24, h: 27 }, labels: ['I1', 'I2', 'A1', 'A2'] },
  1054: { prefix: 'G', size: { w: 24, h: 33 }, labels: ['L1', 'N', 'PE', 'U', 'V', 'W', 'PE'] },
  1055: { prefix: 'G', size: { w: 24, h: 33 }, labels: ['L1', 'L2', 'L3', 'PE', 'U', 'V', 'W', 'PE'] },
  1056: { prefix: 'G', size: { w: 54, h: 33 }, labels: ['RA', 'RC', 'I1', 'I2', 'I3', 'I4', '+', 'R+', 'R-', '+', 'AI', '0V', 'AO'] },
  1057: { prefix: 'G', size: { w: 18, h: 33 }, labels: ['L1', 'N', 'PE', 'M1', 'M2'] },
  1058: { prefix: 'G', size: { w: 24, h: 33 }, labels: ['L1', 'N', 'PE', 'M1', 'M2', 'F1', 'F2'] },
  1059: { prefix: 'G', size: { w: 24, h: 33 }, labels: ['L1', 'L2', 'L3', 'PE', 'M1', 'M2'] },
  1060: { prefix: 'G', size: { w: 24, h: 33 }, labels: ['L1', 'L2', 'L3', 'PE', 'M1', 'M2', 'F1', 'F2'] },
  1061: { prefix: 'G', size: { w: 39, h: 33 }, labels: ['RA', 'RC', 'IN', 'V+', '+', 'AI', '0V'] },
  1065: { prefix: 'G', size: { w: 40, h: 24 }, labels: ['I1', 'I2', 'I3', 'I4', 'Q1', 'Q2', 'Q3', 'Q4'] },
  1066: { prefix: 'G', size: { w: 40, h: 24 }, labels: ['I1', 'I2', 'I3', 'Q1', 'Q2', 'Q3', 'Q4'] },
  1067: { prefix: 'G', size: { w: 40, h: 24 }, labels: ['I1', 'I2', 'I3', 'Q1', 'Q2', 'Q3', 'Q4'] },
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

export const PLACE_LABEL_OFFSETS: Record<number, { x: number; y: number }> = {
  6007: { x: -15, y: -3 },
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
  // Силовая электроника: смещение подписи из образца potencias_electronicas.cad (-12, -3 у всех).
  1050: { x: -12, y: -3 }, 1051: { x: -12, y: -3 }, 1052: { x: -12, y: -3 }, 1053: { x: -12, y: -3 }, 1062: { x: -12, y: -3 }, 1063: { x: -12, y: -3 }, 1054: { x: -12, y: -3 }, 1055: { x: -12, y: -3 }, 1056: { x: -12, y: -3 }, 1057: { x: -12, y: -3 }, 1058: { x: -12, y: -3 }, 1059: { x: -12, y: -3 }, 1060: { x: -12, y: -3 }, 1061: { x: -12, y: -3 }, 1065: { x: -12, y: -3 }, 1066: { x: -12, y: -3 }, 1067: { x: -12, y: -3 },
  // Катушки и сигнализация: смещение подписи из образца elementos_bobinas.cad.
  9001: { x: -15, y: -3 }, 9002: { x: -15, y: -3 }, 9003: { x: -15, y: -3 }, 9005: { x: -15, y: -3 }, 9006: { x: -15, y: -3 }, 9007: { x: -15, y: -3 },
  9014: { x: -15, y: -3 }, 9015: { x: -15, y: -3 }, 9016: { x: -15, y: -3 }, 9009: { x: -15, y: -3 }, 9010: { x: -15, y: -3 }, 9011: { x: -15, y: -3 }, 9012: { x: -15, y: -3 }, 9013: { x: -15, y: -3 },
};

export const THEME_KEY = 'cadesimu-theme';

export const GRID_KEY = 'cadesimu-grid';

export const BETA_NOTICE_KEY = 'cadesimu-beta-notice-seen';

export const WIRE_COLOR_MODE_KEY = 'cadesimu-wire-colors';

export const INTERFACE_LANGUAGE_KEY = 'cadesimu-language';

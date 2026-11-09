/**
 * Таблица кодов типов, которые встречаются в .cad, и правила размещения клемм.
 *
 * Источник: четыре образца Actividad 1.x. Код типа в файле НЕ совпадает с кодом
 * команды в каталоге (catalog.ts), поэтому связь задана здесь явно.
 *
 * Уверенность (confidence):
 *  - confirmed: подтверждена геометрией или метками клемм в образцах;
 *  - probable:  совпадают метки клемм и роль в схеме, но в каталоге есть
 *               похожие команды, различить которые по образцам нельзя;
 *  - unknown:   в образцах такой тип есть, а какой он в каталоге, неизвестно.
 * Неизвестные и вероятные типы уточняются, когда появятся новые образцы.
 */

import { catalog } from './catalog';
import type { Point, WireKind } from './types';

export type CadFamily =
  | 'motor'
  | 'contactor'
  | 'switch'
  | 'interlock'
  | 'protection'
  | 'thermal-contact'
  | 'pushbutton'
  | 'aux-contact'
  | 'coil'
  | 'relay-coil'
  | 'lamp'
  | 'signal'
  | 'text'
  | 'terminal-strip'
  | 'ground'
  | 'transformer'
  | 'diode'
  | 'rectifier'
  | 'power-supply'
  | 'fuse'
  | 'surge-limiter'
  | 'resistor'
  | 'electronic-starter'
  | 'drive'
  | 'control-unit'
  | 'battery'
  | 'outlet'
  | 'wire'
  | 'junction'
  | 'system'
  | 'unknown';

export type Confidence = 'confirmed' | 'probable' | 'unknown';

/**
 * Как расставлены клеммы.
 *  - rows: клеммы идут по флагам записи; порядок меток: сначала верхний ряд слева
 *    направо, затем нижний ряд (1 3 5 | 2 4 6). rows=1: только верхний ряд.
 *    Расстояние между рядами = высота рамки − 3, если не задан rowGap (у Contactor III 2008 рамка 30,
 *    а ряды стоят через 12).
 *  - strip: клеммы без флагов, их число = ширина рамки / pitchX.
 *  - points: клеммы заданы явными смещениями (ромбовидный выпрямитель, блок питания
 *    с выводом PE сбоку, символ земли). Порядок смещений = порядок меток в файле.
 *  - none: у объекта нет клемм (провод, точка, служебный).
 */
export type CadLayout =
  | { kind: 'rows'; rows: 1 | 2; pitchX: number; rowGap?: number }
  | { kind: 'strip'; pitchX: number }
  | { kind: 'points'; points: readonly Point[] }
  | { kind: 'none' };

export interface CadTypeInfo {
  code: number;
  family: CadFamily;
  label: string;
  layout: CadLayout;
  /** Фиксированное количество выводов у типа; лишние флаги в некорректных .cad-записях игнорируются. */
  terminalCount?: number;
  /** Команды каталога (id), которым соответствует тип. Пусто, если неизвестно. */
  commandIds: number[];
  confidence: Confidence;
  note?: string;
}

const ROWS2 = { kind: 'rows', rows: 2, pitchX: 6 } as const;
const STRIP = { kind: 'strip', pitchX: 6 } as const;
/** Две колонки полюсов с шагом 9 (контакты NA+NC: 11 13 / 12 14 и 55 57 / 56 58). */
const ROWS2_P9 = { kind: 'rows', rows: 2, pitchX: 9 } as const;
/**
 * Переключающий контакт CON (клеммы 11 12 14 или 55 56 58): общий вывод сверху по центру, НЗ и НО снизу
 * через 6; рамка 12×15, ряды через 12. Смещения сняты со скриншота образца contactos_elementos.cad.
 */
const CON_POINTS = { kind: 'points', points: [{ x: 3, y: 0 }, { x: 0, y: 12 }, { x: 6, y: 12 }] } as const;
/** Биестабильная катушка 9001: A1 и B1 сверху через 6, A2 снизу по центру (смещения сняты со скриншота образца elementos_bobinas.cad). */
const BISTABLE_POINTS = { kind: 'points', points: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 3, y: 12 }] } as const;
/** Счётчик импульсов 9016: A1 C D R сверху (0 6 9 12), A2 снизу под C. В файле флаги 0..3 и 6, метки лежат в слотах флагов. */
const COUNTER_POINTS = { kind: 'points', points: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 9, y: 0 }, { x: 12, y: 0 }, { x: 6, y: 12 }] } as const;
/** Conmutador I-II-III 8021: общий вывод 1 сверху над средней нижней клеммой, 2 3 4 снизу (шаг 6). */
const CONMUT3_POINTS = { kind: 'points', points: [{ x: 6, y: 0 }, { x: 0, y: 12 }, { x: 6, y: 12 }, { x: 12, y: 12 }] } as const;
/** Conmutador cruce 8022: 1 2 сверху, 3 4 снизу (шаг 6). */
const CRUCE_POINTS = { kind: 'points', points: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 0, y: 12 }, { x: 6, y: 12 }] } as const;
/** Двухрядный аппарат, у которого рамка выше, чем расстояние между рядами клемм (рамка 30, ряды через 12). */
const ROWS2_GAP12 = { kind: 'rows', rows: 2, pitchX: 6, rowGap: 12 } as const;

const TABLE: readonly CadTypeInfo[] = [
  { code: 8, family: 'text', label: 'Texto', layout: { kind: 'none' }, commandIds: [], confidence: 'confirmed', note: 'Texto libre de CADe_SIMU; el contenido se guarda al final de la grabación.' },
  { code: 1000, family: 'motor', label: 'Motor trifásico', layout: { kind: 'rows', rows: 1, pitchX: 6 }, commandIds: [32828], confidence: 'confirmed', note: 'U1 V1 W1 PE в один ряд' },

  { code: 1001, family: 'motor', label: 'Motor trifásico YD', layout: ROWS2, commandIds: [32829], confidence: 'confirmed', note: 'Клеммы U1 V1 W1 PE сверху и W2 U2 V2 снизу (Actividad 1.8, пуск звезда–треугольник); образец motores-elementos.cad подтверждает: это вторая кнопка панели «Motores».' },

  // ── Двигатели (панель «Motores», 14 кнопок; «Actuador lineal eléctrico» (10550) не делаем) ──
  // Образец: motores-elementos.cad, по одной кнопке панели в порядке панели (id записей 69..82).
  // Метки клемм идут в порядке файла. Ряды «rows» подтверждены правилом «ряды через h − 3» (на Actividad 1.8 для 1001);
  // у типов с layout «points» смещения сняты со скриншота оригинала (шаг сетки 3) и ждут проверки автора по образцу с проводами.
  { code: 1002, family: 'motor', label: 'Motor monofásico', layout: { kind: 'points', points: [{ x: 0, y: 0 }, { x: 12, y: 0 }, { x: 18, y: 0 }] }, commandIds: [32830], confidence: 'probable', note: '24×24, клеммы U1 V1 PE в один ряд; U1 и V1 через 12, PE ещё через 6.' },
  { code: 1008, family: 'motor', label: 'Motor monofásico con condensador', layout: { kind: 'points', points: [{ x: 0, y: 0 }, { x: 12, y: 0 }, { x: 18, y: 0 }, { x: 0, y: 27 }, { x: 12, y: 27 }] }, commandIds: [33103], confidence: 'probable', note: '24×30, клеммы U1 V1 PE сверху и U2 V2 снизу (ряды через h − 3 = 27); конденсатор на выводе U2.' },
  { code: 1010, family: 'motor', label: 'Motor trifásico como monofásico', layout: { kind: 'rows', rows: 1, pitchX: 6 }, commandIds: [33237], confidence: 'probable', note: '24×30, клеммы U1 V1 W1 PE в один ряд; конденсатор между V1 и W1.' },
  { code: 1003, family: 'motor', label: 'Motor Dahlander', layout: ROWS2, commandIds: [32831], confidence: 'confirmed', note: '24×27, клеммы U1 V1 W1 PE сверху и U2 V2 W2 снизу; на символе подпись «Dah».' },
  { code: 1005, family: 'motor', label: 'Motor de dos velocidades (II Veloc)', layout: ROWS2, commandIds: [32994], confidence: 'confirmed', note: '24×27, клеммы U1 V1 W1 PE сверху и U2 V2 W2 снизу; на символе подпись «I-II».' },
  { code: 1004, family: 'motor', label: 'Motor trifásico rotor bobinado', layout: ROWS2, commandIds: [32832], confidence: 'confirmed', note: '24×27, клеммы U1 V1 W1 PE сверху и K L M снизу (кольца ротора); двойная окружность.' },
  { code: 1006, family: 'motor', label: 'Motor c.c. de imán permanente', layout: { kind: 'points', points: [{ x: 0, y: 0 }, { x: 18, y: 0 }, { x: 9, y: 6 }] }, commandIds: [32999], confidence: 'probable', note: '24×15, клеммы A1 слева, A2 справа (щётки) и PE снизу; сверху символ постоянного магнита.' },
  { code: 1007, family: 'motor', label: 'Motor c.c. de excitación independiente', layout: { kind: 'points', points: [{ x: 0, y: -3 }, { x: 18, y: -3 }, { x: 9, y: 3 }, { x: 0, y: -12 }, { x: 18, y: -12 }] }, commandIds: [33000], confidence: 'probable', note: '24×15, клеммы A1 A2 PE и обмотка возбуждения F1 F2 над якорем (смещения по y отрицательные).' },
  { code: 1011, family: 'motor', label: 'Motor paso a paso unipolar', layout: { kind: 'points', points: [{ x: -3, y: 0 }, { x: 0, y: 15 }, { x: -3, y: 12 }, { x: 12, y: 15 }, { x: -3, y: 6 }, { x: 6, y: 15 }] }, commandIds: [33295], confidence: 'probable', note: '24×27, клеммы по файлу 1..6: обмотка 1-5-3 слева (5 — средняя точка), обмотка 2-6-4 снизу (6 — средняя точка). Только символ.' },
  { code: 1012, family: 'motor', label: 'Motor paso a paso bipolar', layout: { kind: 'points', points: [{ x: -3, y: 0 }, { x: -3, y: 12 }, { x: 0, y: 15 }, { x: 12, y: 15 }] }, commandIds: [33296], confidence: 'probable', note: '24×27, клеммы 1 2 слева (обмотка A), 3 4 снизу (обмотка B). Только символ.' },
  { code: 1009, family: 'motor', label: 'Freno', layout: { kind: 'rows', rows: 1, pitchX: 6 }, commandIds: [33104], confidence: 'probable', note: '21×15, клеммы U1 V1 PE в один ряд; трапеция с подписью -Fr. Только символ.' },

  // ── Контакторы и выключатели (панель «Contactores e interruptores (potencia)», 10 кнопок) ──
  // Образец: elementos_contactores.cad, по одной кнопке панели в порядке панели (id записей 51..60).
  // Силовые контакты контактора идут по имени катушки (-KM), выключатели переключаются кликом (-S).
  // Все метки клемм в файле заданы: верхний ряд 1 3 5 7, затем нижний 2 4 6 8; рамка высотой 15.
  { code: 2006, family: 'contactor', label: 'Contactor I (-KM)', layout: ROWS2, terminalCount: 2, commandIds: [32899], confidence: 'confirmed', note: '6×15: один силовой полюс 1-2.' },
  { code: 2000, family: 'contactor', label: 'Contactor II (-KM)', layout: ROWS2, terminalCount: 4, commandIds: [32834], confidence: 'confirmed', note: '12×15: два полюса 1-2, 3-4.' },
  { code: 2001, family: 'contactor', label: 'Contactor III (-KM)', layout: ROWS2, terminalCount: 6, commandIds: [32833], confidence: 'confirmed', note: '18×15: три полюса 1-2, 3-4, 5-6.' },
  { code: 2002, family: 'contactor', label: 'Contactor IIII (-KM)', layout: ROWS2, terminalCount: 8, commandIds: [32835], confidence: 'confirmed', note: '24×15: четыре полюса 1-2, 3-4, 5-6, 7-8.' },
  { code: 2008, family: 'contactor', label: 'Contactor III, símbolo con arco (-KM)', layout: ROWS2_GAP12, terminalCount: 6, commandIds: [33219], confidence: 'confirmed', note: 'Второй «Contactor III» (33219): те же три полюса, но на верхнем выводе каждого полюса дуга (знак функции контактора). Рамка 18×30, а клеммы стоят через 12, как у остальных: правило «высота − 3» здесь не работает.' },
  { code: 2007, family: 'switch', label: 'Interruptor I (-S)', layout: ROWS2, commandIds: [32900], confidence: 'confirmed', note: '6×15: один полюс 1-2, привод «V» слева.' },
  { code: 2003, family: 'switch', label: 'Interruptor II (-S)', layout: ROWS2, commandIds: [32836], confidence: 'confirmed', note: '12×15: два полюса.' },
  { code: 2004, family: 'switch', label: 'Interruptor III (-S)', layout: ROWS2, commandIds: [32837], confidence: 'confirmed', note: '18×15: три полюса.' },
  { code: 2005, family: 'switch', label: 'Interruptor IIII (-S)', layout: ROWS2, commandIds: [32838], confidence: 'confirmed', note: '24×15: четыре полюса.' },
  { code: 2009, family: 'interlock', label: 'Enclavamiento', layout: { kind: 'none' }, commandIds: [33392], confidence: 'confirmed', note: 'Механическая блокировка двух контакторов. Рамка 24×3, клемм нет; в texts[0] имя первого контактора (-KM1), в texts[1] имя второго (-KM2).' },

  // ── Источники питания (панель «Источники питания», 21 кнопка) ──────────────
  // Образец: elementos_alimentacion.cad, все кнопки панели по одной. Код типа ↔ кнопка определена
  // по порядку панели, ширине рамки и меткам на скриншоте. Колодки (3000..3011) хранят клеммы без
  // флагов: число клемм = ширина / 6, метки задаёт тип (см. stripNames в symbols.ts).
  { code: 3000, family: 'terminal-strip', label: 'Alimentación Fase (-X)', layout: STRIP, commandIds: [32873], confidence: 'confirmed', note: 'Одна клемма «L», ширина 6.' },
  { code: 3001, family: 'terminal-strip', label: 'Alimentación Neutro (-X)', layout: STRIP, commandIds: [32874], confidence: 'confirmed', note: 'Одна клемма «N», ширина 6.' },
  { code: 3002, family: 'terminal-strip', label: 'Alimentación Protección (-X)', layout: STRIP, commandIds: [32883], confidence: 'confirmed', note: 'Одна клемма «PE», ширина 6.' },
  { code: 3003, family: 'terminal-strip', label: 'Alimentación Fase + Neutro (-X)', layout: STRIP, commandIds: [32872], confidence: 'confirmed', note: 'Ширина 12 = 2 клеммы с шагом 6: L и N (Actividad 1.6, цепь управления; образец питания).' },
  { code: 3011, family: 'terminal-strip', label: 'Alimentación Fase + Neutro + Protección (-X)', layout: STRIP, commandIds: [32906], confidence: 'probable', note: 'Ширина 18: L N PE. В образце питания тип записан дважды (x=78 и x=114) с одинаковым содержимым: какая вторая кнопка ему соответствует, образец не говорит.' },
  { code: 3004, family: 'terminal-strip', label: 'Alimentación L1 + L2 + L3 (-X)', layout: STRIP, commandIds: [32870], confidence: 'confirmed', note: 'Ширина 18: L1 L2 L3.' },
  { code: 3005, family: 'terminal-strip', label: 'Alimentación L1 + L2 + L3 + PE (-X)', layout: STRIP, commandIds: [32879], confidence: 'confirmed', note: 'Ширина 24 = 4 клеммы с шагом 6: L1 L2 L3 PE без нейтрали (Actividad 1.6).' },
  { code: 3006, family: 'terminal-strip', label: 'Alimentación L1 + L2 + L3 + N (-X)', layout: STRIP, commandIds: [32869], confidence: 'probable', note: 'Ширина 24: L1 L2 L3 N. В образце питания тип записан дважды (x=213 и x=252) с одинаковым содержимым.' },
  { code: 3007, family: 'terminal-strip', label: 'Alimentación L1 + L2 + L3 + N + PE (-X)', layout: STRIP, commandIds: [32882], confidence: 'confirmed', note: 'Ширина 30 = 5 клемм с шагом 6: L1 L2 L3 N PE.' },
  { code: 3008, family: 'terminal-strip', label: 'Alimentación Positivo (-X)', layout: STRIP, commandIds: [32876], confidence: 'confirmed', note: 'Одна клемма «+», ширина 6.' },
  { code: 3009, family: 'terminal-strip', label: 'Alimentación Negativo (-X)', layout: STRIP, commandIds: [32877], confidence: 'confirmed', note: 'Одна клемма «−», ширина 6.' },
  { code: 3010, family: 'terminal-strip', label: 'Alimentación +- (-X)', layout: STRIP, commandIds: [32875], confidence: 'confirmed', note: 'Ширина 12: клеммы «+» и «−».' },
  { code: 3015, family: 'ground', label: 'Alimentación Protección (символ земли)', layout: { kind: 'points', points: [{ x: 3, y: 0 }] }, commandIds: [33042], confidence: 'probable', note: 'Рамка 8×8, флаги клемм в образце нулевые. Одну клемму сверху мы добавили, чтобы к земле можно было подвести провод PE; её точное смещение по образцу не проверялось.' },
  { code: 3012, family: 'transformer', label: 'Transformador (-T)', layout: { kind: 'rows', rows: 2, pitchX: 9 }, commandIds: [32995], confidence: 'probable', note: 'Клеммы 1 2 / 3 4, шаг 9, рамка 15×18.' },
  { code: 3017, family: 'transformer', label: 'Transformador III (-T)', layout: ROWS2, commandIds: [33045], confidence: 'probable', note: 'Клеммы 1 2 3 / 4 5 6, шаг 6, рамка 18×18.' },
  { code: 3016, family: 'diode', label: 'Diodo (-D)', layout: ROWS2, commandIds: [33043], confidence: 'probable', note: 'Клеммы 1 (анод, сверху) и 2 (катод, снизу), рамка 6×15.' },
  { code: 3013, family: 'rectifier', label: 'Rectificador (-V)', layout: { kind: 'points', points: [{ x: 0, y: 9 }, { x: 18, y: 9 }, { x: 9, y: 0 }, { x: 9, y: 18 }] }, commandIds: [32997], confidence: 'probable', note: 'Мост-ромб: 1 слева, 2 справа, 3 сверху, 4 снизу. Смещения сняты со скриншота.' },
  { code: 3014, family: 'power-supply', label: 'Fuente de alimentación (-V)', layout: { kind: 'points', points: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 0, y: 18 }, { x: 6, y: 18 }, { x: 12, y: 9 }] }, commandIds: [32998], confidence: 'probable', note: 'Блок питания ~/=: клеммы 1 2 сверху, 3 4 снизу, PE справа. Смещения сняты со скриншота.' },
  { code: 3018, family: 'power-supply', label: 'Fuente de alimentación III (-V)', layout: { kind: 'points', points: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 12, y: 0 }, { x: 3, y: 18 }, { x: 9, y: 18 }, { x: 18, y: 9 }] }, commandIds: [33044], confidence: 'probable', note: 'Трёхфазный блок питания: 1 2 3 сверху, 4 5 снизу, PE справа. Смещения сняты со скриншота.' },
  { code: 3019, family: 'battery', label: 'Bateria (-V)', layout: ROWS2, commandIds: [33046], confidence: 'probable', note: 'Клеммы «+» сверху и «−» снизу, рамка 9×12.' },
  { code: 3020, family: 'outlet', label: 'Toma de corriente (-TC)', layout: { kind: 'none' }, commandIds: [33263], confidence: 'probable', note: 'Розетка: рамка 9×15, флаги клемм нулевые, на листе только символ.' },

  // ── Предохранители и разъединители (панель «Fusibles y seccionadores», 10 кнопок) ──
  // Образец: elementos_fusibles.cad, по одной кнопке панели; код типа = 5000 + номер кнопки по порядку панели.
  // Метки клемм в файле идут в порядке флагов: верхний ряд, затем нижний (1 3 … / 2 4 …).
  { code: 5000, family: 'fuse', label: 'Fusible I (-F)', layout: ROWS2, commandIds: [32853], confidence: 'confirmed', note: '6×15: 1 сверху, 2 снизу.' },
  { code: 5001, family: 'fuse', label: 'Fusible IN (-F)', layout: ROWS2, commandIds: [32842], confidence: 'confirmed', note: '12×15: полюс с предохранителем 1-2 и нейтраль без предохранителя 3-4.' },
  { code: 5002, family: 'fuse', label: 'Fusible II (-F)', layout: ROWS2, commandIds: [32839], confidence: 'confirmed', note: '12×15: два предохранителя 1-2, 3-4.' },
  { code: 5003, family: 'fuse', label: 'Fusible III (-F)', layout: ROWS2, commandIds: [32840], confidence: 'confirmed', note: '18×15: три предохранителя 1-2, 3-4, 5-6.' },
  { code: 5004, family: 'fuse', label: 'Fusible IIIN (-F)', layout: ROWS2, commandIds: [32841], confidence: 'confirmed', note: '24×15: три предохранителя и нейтраль 7-8.' },
  { code: 5005, family: 'fuse', label: 'Fusible seccionable I (-F)', layout: ROWS2, commandIds: [32854], confidence: 'confirmed', note: '6×15: наклонный предохранитель-разъединитель 1-2.' },
  { code: 5006, family: 'fuse', label: 'Fusible seccionable IN (-F)', layout: ROWS2, commandIds: [32843], confidence: 'confirmed', note: '12×15: наклонный предохранитель 1-2 и нейтральная лопасть 3-4.' },
  { code: 5007, family: 'fuse', label: 'Fusible seccionable II (-F)', layout: ROWS2, commandIds: [32844], confidence: 'confirmed', note: '12×15: два наклонных предохранителя.' },
  { code: 5008, family: 'fuse', label: 'Fusible seccionable III (-F)', layout: ROWS2, commandIds: [32845], confidence: 'confirmed', note: '18×15: три наклонных предохранителя.' },
  { code: 5009, family: 'fuse', label: 'Fusible seccionable IIIN (-F)', layout: ROWS2, commandIds: [32848], confidence: 'confirmed', note: '24×15: три наклонных предохранителя и нейтральная лопасть 7-8.' },

  // ── Защита (панель «Automáticos, diferenciales, relé térmico, disyuntores, limitadores», 15 кнопок) ──
  // Образец: elementos_proteccion.cad. Все 15 кнопок подтверждены файлом; кнопки Relé térmico и Disyuntor I в образце
  // стоят дважды (6007, 6010) — лишние копии при размещении ничего не меняют. Раньше 6001–6012 были неопределёнными.
  { code: 6000, family: 'protection', label: 'Interruptor automático I (-F)', layout: ROWS2, commandIds: [32858], confidence: 'confirmed', note: '6×15: полюс 1-2.' },
  { code: 6001, family: 'protection', label: 'Interruptor automático IN (-F)', layout: ROWS2, commandIds: [32859], confidence: 'confirmed', note: '12×15: полюс с расцепителем 1-2 и нейтраль 3-4.' },
  { code: 6002, family: 'protection', label: 'Interruptor automático II (-F)', layout: ROWS2, commandIds: [32860], confidence: 'confirmed', note: '12×15: два полюса с расцепителями.' },
  { code: 6003, family: 'protection', label: 'Interruptor automático III (-F)', layout: ROWS2, commandIds: [32861], confidence: 'confirmed', note: '18×15: три полюса.' },
  { code: 6004, family: 'protection', label: 'Interruptor automático IIIN (-F)', layout: ROWS2, commandIds: [32862], confidence: 'confirmed', note: '24×15: три полюса и нейтраль 7-8.' },
  { code: 6005, family: 'protection', label: 'Interruptor diferencial IN (-F)', layout: ROWS2, commandIds: [32863], confidence: 'confirmed', note: '12×21: полюс и нейтраль, символ УЗО и «капсула» дифференциального расцепителя.' },
  { code: 6006, family: 'protection', label: 'Interruptor diferencial IIIN (-F)', layout: ROWS2, commandIds: [32864], confidence: 'confirmed', note: '24×21: три полюса и нейтраль, символ УЗО и капсула.' },
  { code: 6007, family: 'protection', label: 'Relé térmico (-F)', layout: ROWS2, commandIds: [32865], confidence: 'confirmed', note: '21×15: три «крюка» в рамке; в схемах Actividad обозначен FG1..FG3.' },
  { code: 6008, family: 'protection', label: 'Disyuntor II (-Q)', layout: ROWS2, commandIds: [32866], confidence: 'confirmed', note: '12×24: два полюса с блоком расцепителей.' },
  { code: 6009, family: 'protection', label: 'Disyuntor III (-Q)', layout: ROWS2, commandIds: [32867], confidence: 'confirmed', note: '18×24: три полюса с блоком расцепителей.' },
  { code: 6010, family: 'protection', label: 'Disyuntor I (-Q)', layout: ROWS2, commandIds: [32898], confidence: 'confirmed', note: '6×24: один полюс с блоком расцепителей.' },
  { code: 6011, family: 'protection', label: 'Disyuntor IN (-Q)', layout: ROWS2, commandIds: [33050], confidence: 'confirmed', note: '12×24: полюс с блоком расцепителей и нейтраль без блока.' },
  { code: 6012, family: 'protection', label: 'Disyuntor IIIN (-Q)', layout: ROWS2, commandIds: [33052], confidence: 'confirmed', note: '24×24: три полюса с блоком и нейтраль 7-8.' },
  { code: 6013, family: 'surge-limiter', label: 'Limitador sobretensiones IN (-F)', layout: { kind: 'points', points: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 0, y: 18 }] }, commandIds: [33054], confidence: 'confirmed', note: '12×21: клеммы 1 2 сверху, 3 (PE) снизу слева. Смещения сняты со скриншота.' },
  { code: 6014, family: 'surge-limiter', label: 'Limitador sobretensiones IIIN (-F)', layout: { kind: 'points', points: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 12, y: 0 }, { x: 18, y: 0 }, { x: 0, y: 18 }] }, commandIds: [33055], confidence: 'confirmed', note: '24×21: клеммы 1 2 3 4 сверху, 5 (PE) снизу слева. Смещения сняты со скриншота.' },

  // ── Вспомогательные контакты (панель «Contactos auxiliares y temporizados», 16 кнопок) ──
  // Образец: contactos_elementos.cad. Код типа = 7000 + номер кнопки по порядку панели:
  // 7000..7003 мгновенные (NA, NC, NA+NC, CON), 7004..7007 с выдержкой на включение,
  // 7008..7011 с выдержкой на отключение, 7012..7015 с выдержкой на включение и отключение.
  // Клеммы мгновенных 13 14 / 11 12 / 11 13 12 14 / 11 12 14, временных 67 68 / 55 56 / 55 57 56 58 / 55 56 58.
  { code: 7000, family: 'aux-contact', label: 'Contacto NA', layout: ROWS2, commandIds: [32937], confidence: 'confirmed', note: '6×15: клеммы 13 14, замыкается вместе с катушкой того же имени.' },
  { code: 7001, family: 'aux-contact', label: 'Contacto NC', layout: ROWS2, commandIds: [32938], confidence: 'confirmed', note: '6×15: клеммы 11 12 (Actividad 1.6), имя совпадает с управляющей катушкой.' },
  { code: 7002, family: 'aux-contact', label: 'Contacto NA+NC', layout: ROWS2_P9, commandIds: [32939], confidence: 'confirmed', note: '15×15: клеммы 11 13 / 12 14 (шаг 9); 11-12 НЗ, 13-14 НО.' },
  { code: 7003, family: 'aux-contact', label: 'Contacto CON', layout: CON_POINTS, commandIds: [32940], confidence: 'confirmed', note: '12×15: клеммы 11 (сверху по центру), 12 (НЗ) и 14 (НО) снизу; переключающий контакт.' },
  { code: 7004, family: 'aux-contact', label: 'Contacto temporizado a la conexión NA', layout: ROWS2, commandIds: [32933], confidence: 'confirmed', note: '6×15: клеммы 67 68; замыкается после выдержки таймера 9004 с тем же именем.' },
  { code: 7005, family: 'aux-contact', label: 'Contacto temporizado a la conexión NC', layout: ROWS2, commandIds: [32934], confidence: 'confirmed', note: '6×15: клеммы 55 56; размыкается после выдержки таймера 9004.' },
  { code: 7006, family: 'aux-contact', label: 'Contacto temporizado a la conexión NA+NC', layout: ROWS2_P9, commandIds: [32935], confidence: 'confirmed', note: '15×15: клеммы 55 57 / 56 58 (шаг 9): 55-56 замкнут до выдержки (звезда в Actividad 1.8), 57-58 замыкается после выдержки (треугольник). Выдержку задаёт таймер 9004 с тем же именем.' },
  { code: 7007, family: 'aux-contact', label: 'Contacto temporizado a la conexión CON', layout: CON_POINTS, commandIds: [32936], confidence: 'confirmed', note: '12×15: клеммы 55 (общий), 56 (НЗ), 58 (НО); переключается после выдержки таймера 9004.' },
  { code: 7008, family: 'aux-contact', label: 'Contacto temporizado a la deconexión NA', layout: ROWS2, commandIds: [32941], confidence: 'probable', note: '6×15: клеммы 67 68; замыкается по завершении импульсного отсчёта катушки 9005 с тем же именем.' },
  { code: 7009, family: 'aux-contact', label: 'Contacto temporizado a la deconexión NC', layout: ROWS2, commandIds: [32942], confidence: 'probable', note: '6×15: клеммы 55 56; НЗ контакт переключается по завершении отсчёта катушки 9005.' },
  { code: 7010, family: 'aux-contact', label: 'Contacto temporizado a la deconexión NA+NC', layout: ROWS2_P9, commandIds: [32943], confidence: 'probable', note: '15×15: клеммы 55 57 / 56 58; НЗ и НО переключаются по завершении отсчёта катушки 9005.' },
  { code: 7011, family: 'aux-contact', label: 'Contacto temporizado a la deconexión CON', layout: CON_POINTS, commandIds: [32944], confidence: 'probable', note: '12×15: клеммы 55 56 58; переключается по завершении отсчёта катушки 9005.' },
  { code: 7012, family: 'aux-contact', label: 'Contacto temporizado a la conexión deconexión NA', layout: ROWS2, commandIds: [32945], confidence: 'probable', note: '6×15: клеммы 67 68; замыкается после выдержки катушки 9006 и размыкается через 2 с после снятия питания.' },
  { code: 7013, family: 'aux-contact', label: 'Contacto temporizado a la conexión deconexión NC', layout: ROWS2, commandIds: [32946], confidence: 'probable', note: '6×15: клеммы 55 56; размыкается после выдержки катушки 9006 и возвращается через 2 с после снятия питания.' },
  { code: 7014, family: 'aux-contact', label: 'Contacto temporizado a la conexión deconexión NA+NC', layout: ROWS2_P9, commandIds: [32947], confidence: 'probable', note: '15×15: клеммы 55 57 / 56 58; переключается по катушке 9006 с выдержкой при включении и двухсекундным отпусканием.' },
  { code: 7015, family: 'aux-contact', label: 'Contacto temporizado a la conexión deconexión CON', layout: CON_POINTS, commandIds: [32948], confidence: 'probable', note: '12×15: клеммы 55 56 58; переключается по катушке 9006 с выдержкой при включении и двухсекундным отпусканием.' },

  // ── Приводы (панель «Accionamientos»): первые 8 кнопок ──
  // Образец: accionamientos.cad. Привязка кодов типов к командам идёт по образцу, а не по прежним догадкам:
  // 8001 = Pulsador NC, 8005 = Pulsador seta NC, 8013 = Final de carrera NC (раньше 8001 был неизвестен,
  // 8005 считался конечным выключателем, а 8013 — Pulsador NC). Рамка по высоте везде 15, у 8023 — 6×6.
  { code: 8023, family: 'pushbutton', label: 'Botón pulsador', layout: { kind: 'none' }, commandIds: [33278], confidence: 'confirmed', note: 'Круг-индикатор 6×6 без клемм, залитый зелёным, с кольцом. Поведения нет, только символ.' },
  { code: 8000, family: 'pushbutton', label: 'Pulsador NA', layout: ROWS2, commandIds: [32909], confidence: 'confirmed', note: '6×15: клеммы 13 14.' },
  { code: 8001, family: 'pushbutton', label: 'Pulsador NC', layout: ROWS2, commandIds: [32910], confidence: 'confirmed', note: '6×15: клеммы 11 12, -S1 и -S3 в Actividad 1.6: кнопка «Стоп», размыкающий контакт.' },
  { code: 8002, family: 'pushbutton', label: 'Pulsador NA-NC', layout: ROWS2_P9, commandIds: [32912], confidence: 'confirmed', note: '15×15: клеммы 11 13 / 12 14 (шаг 9); 11-12 НЗ, 13-14 НО, общий толкатель.' },
  { code: 8003, family: 'pushbutton', label: 'Pulsador CON', layout: CON_POINTS, commandIds: [32913], confidence: 'confirmed', note: '12×15: клеммы 11 (общий, сверху), 12 (НЗ) и 14 (НО) снизу; переключающий контакт.' },
  { code: 8004, family: 'pushbutton', label: 'Pulsador seta NA', layout: ROWS2, commandIds: [32914], confidence: 'confirmed', note: '6×15: клеммы 13 14, привод «грибок».' },
  { code: 8005, family: 'pushbutton', label: 'Pulsador seta NC', layout: ROWS2, commandIds: [32915], confidence: 'confirmed', note: '6×15: клеммы 11 12, привод «грибок». В Actividad 1.1.2 под -FC раньше стоял 8005, теперь там 8013.' },
  { code: 8006, family: 'pushbutton', label: 'Pulsador seta NA-NC', layout: ROWS2_P9, commandIds: [32917], confidence: 'confirmed', note: '15×15: клеммы 11 13 / 12 14 (шаг 9), привод «грибок».' },
  { code: 8007, family: 'pushbutton', label: 'Pulsador seta CON', layout: CON_POINTS, commandIds: [32918], confidence: 'confirmed', note: '12×15: клеммы 11 (общий, сверху), 12 (НЗ) и 14 (НО) снизу; привод «грибок», нажатие с удержанием.' },
  { code: 8008, family: 'pushbutton', label: 'Interruptor NA', layout: ROWS2, commandIds: [32919], confidence: 'confirmed', note: '6×15: клеммы 13 14; ручной выключатель с фиксацией, замыкается по клику и остаётся замкнутым.' },
  { code: 8009, family: 'pushbutton', label: 'Interruptor NC', layout: ROWS2, commandIds: [32920], confidence: 'confirmed', note: '6×15: клеммы 11 12; ручной выключатель с фиксацией, размыкается по клику и остаётся разомкнутым.' },
  { code: 8010, family: 'pushbutton', label: 'Interruptor NA-NC', layout: ROWS2_P9, commandIds: [32921], confidence: 'confirmed', note: '15×15: клеммы 11 13 / 12 14 (шаг 9); 11-12 НЗ, 13-14 НО, общий привод с фиксацией.' },
  { code: 8011, family: 'pushbutton', label: 'Interruptor CON', layout: CON_POINTS, commandIds: [32922], confidence: 'confirmed', note: '12×15: клеммы 11 (общий), 12 (НЗ), 14 (НО); переключающий контакт с фиксацией.' },
  { code: 8012, family: 'pushbutton', label: 'Final de carrera NA', layout: ROWS2, commandIds: [32923], confidence: 'confirmed', note: '6×15: клеммы 13 14; конечный выключатель, замыкающий контакт, привод с роликом.' },
  { code: 8013, family: 'pushbutton', label: 'Final de carrera NC', layout: ROWS2, commandIds: [32924], confidence: 'confirmed', note: '6×15: клеммы 11 12, конечный выключатель, размыкающий контакт (по образцу accionamientos.cad). Привод концевика: пунктир и ролик.' },
  { code: 8014, family: 'pushbutton', label: 'Final de carrera NA-NC', layout: ROWS2_P9, commandIds: [32925], confidence: 'confirmed', note: '15×15: клеммы 11 13 / 12 14 (шаг 9); концевик с НЗ и НО контактами, общий привод с роликом.' },
  { code: 8015, family: 'pushbutton', label: 'Final de carrera COM', layout: CON_POINTS, commandIds: [32926], confidence: 'confirmed', note: '12×15: клеммы 11 (общий), 12 (НЗ), 14 (НО); переключающий контакт концевика.' },
  { code: 8018, family: 'thermal-contact', label: 'Contacto auxiliar relé térmico NA-NC', layout: { kind: 'rows', rows: 2, pitchX: 9 }, commandIds: [32929], confidence: 'confirmed', note: 'Клеммы 95 97 96 98, шаг 9.' },
  { code: 8016, family: 'thermal-contact', label: 'Contacto auxiliar relé térmico NA', layout: ROWS2, commandIds: [32927], confidence: 'confirmed', note: '6×15: клеммы 97 98, в образце префикс -F; замыкается при срабатывании тепловой защиты.' },
  { code: 8017, family: 'thermal-contact', label: 'Contacto auxiliar relé térmico NC', layout: ROWS2, commandIds: [32928], confidence: 'confirmed', note: '6×15: клеммы 95 96, префикс -F; размыкается при срабатывании тепловой защиты.' },
  { code: 8019, family: 'thermal-contact', label: 'Contacto auxiliar relé térmico CON', layout: CON_POINTS, commandIds: [32930], confidence: 'confirmed', note: '12×15: клеммы 95 (общий), 96 (НЗ), 98 (НО); при срабатывании 95-96 размыкается, 95-98 замыкается.' },
  { code: 8020, family: 'pushbutton', label: 'Conmutador I-0-II', layout: CON_POINTS, commandIds: [33047], confidence: 'confirmed', note: '12×15: клеммы 1 (общий, сверху), 2 и 3 снизу. Позиции I = 1-2, 0 = разомкнуто (покой), II = 1-3. Логика позиций выведена по скриншотам (inferred), клик обходит 0 → I → II.' },
  { code: 8021, family: 'pushbutton', label: 'Conmutador I-II-III', layout: CONMUT3_POINTS, commandIds: [33048], confidence: 'confirmed', note: '18×15: клеммы 1 (общий, сверху), 2 3 4 снизу. Позиции I = 1-2 (покой), II = 1-3, III = 1-4. Логика позиций выведена по скриншотам (inferred), клик обходит по кругу.' },
  { code: 8022, family: 'pushbutton', label: 'Conmutador cruce', layout: CRUCE_POINTS, commandIds: [33049], confidence: 'confirmed', note: '12×15: клеммы 1 2 / 3 4. Покой — перекрёст (1-4 и 2-3), активное положение — прямо (1-3 и 2-4). Логика выведена по скриншотам (inferred).' },

  { code: 9000, family: 'coil', label: 'Bobina contactor, relé', layout: ROWS2, commandIds: [32949], confidence: 'probable', note: 'Клеммы A1 A2.' },
  { code: 9004, family: 'coil', label: 'Temporizador a la conexión', layout: ROWS2, commandIds: [32952], confidence: 'probable', note: 'Клеммы A1 A2, в текстовых полях после клемм два параметра (в образцах 0 и 5, 0 и 10).' },
  // ── Катушки и сигнализация (панель «Bobinas, temporizadores…», 17 кнопок) ──
  // Образец: elementos_bobinas.cad, по одной кнопке панели. Коды 9000..9016 идут в порядке панели, кроме пары 9015/9014:
  // «Generador de pulsos» записан как 9015, «Interruptor horario» как 9014 (символы подтверждают: «E» и часы). Все новые типы пока только символы.
  { code: 9001, family: 'relay-coil', label: 'Bobina biestable contactor, relé', layout: BISTABLE_POINTS, commandIds: [32956], confidence: 'confirmed', note: 'Клеммы A1 B1 сверху, A2 снизу по центру; внутри две косые линии. Только символ.' },
  { code: 9002, family: 'relay-coil', label: 'Telerruptor', layout: ROWS2, commandIds: [32964], confidence: 'confirmed', note: 'Клеммы A1 A2; слева отсек со знаком «<». Только символ.' },
  { code: 9003, family: 'relay-coil', label: 'Bobina electroválvula', layout: ROWS2, commandIds: [32951], confidence: 'confirmed', note: 'Клеммы A1 A2, имя -EV; косая черта в корпусе и клапан справа. Только символ.' },
  { code: 9005, family: 'relay-coil', label: 'Temporizador a la desconexión', layout: ROWS2, commandIds: [32953], confidence: 'confirmed', note: 'Клеммы A1 A2 + параметры масштаба и времени; импульс запускает сохраняющийся отсчёт, после завершения которого переключаются контакты 7008–7011 с тем же именем.' },
  { code: 9006, family: 'relay-coil', label: 'Temporizador a la conexión desconexión', layout: ROWS2, commandIds: [32954], confidence: 'confirmed', note: 'Клеммы A1 A2 + масштаб и время выдержки; контакты 7012–7015 переключаются по истечении выдержки и возвращаются в исходное состояние через 2 с после снятия питания.' },
  { code: 9007, family: 'relay-coil', label: 'Relé intermitente', layout: ROWS2, commandIds: [32955], confidence: 'confirmed', note: 'Клеммы A1 A2 + параметры 0 и 1; слева отсек со знаком «5». Только символ.' },
  { code: 9015, family: 'relay-coil', label: 'Generador de pulsos', layout: ROWS2, commandIds: [33223], confidence: 'probable', note: 'Клеммы A1 A2 + четыре параметра (0 1 0 1); слева отсек со знаком «E». Соответствие 9015 ↔ «Generador de pulsos» и 9014 ↔ «Interruptor horario» выведено из порядка и вида символов. Только символ.' },
  { code: 9014, family: 'relay-coil', label: 'Interruptor horario', layout: ROWS2, commandIds: [33098], confidence: 'probable', note: 'Клеммы A1 A2 + шесть параметров (расписание, в образце нули); в корпусе значок часов. Только символ.' },
  { code: 9016, family: 'relay-coil', label: 'Contador de pulsos', layout: COUNTER_POINTS, commandIds: [33236], confidence: 'confirmed', note: 'Клеммы A1 C D R сверху, A2 снизу; рамка 18×15. В файле флаги 0..3 и 6, метки лежат в слотах флагов (texts[2..5] и texts[8]), параметры 0 0 между ними. Только символ.' },

  { code: 9008, family: 'lamp', label: 'Piloto señalización', layout: ROWS2, commandIds: [32957], confidence: 'confirmed', note: 'Клеммы X1 X2; параметр после клемм: индекс цвета (в образцах 0, 1, 2).' },
  { code: 9009, family: 'lamp', label: 'Piloto señalización intermitente', layout: ROWS2, commandIds: [32958], confidence: 'confirmed', note: 'Клеммы X1 X2 + выбранный цвет; лампа мигает с периодом 1 с (0,5 с включена и 0,5 с выключена), когда запитана.' },
  { code: 9010, family: 'signal', label: 'Timbre', layout: ROWS2, commandIds: [32961], confidence: 'confirmed', note: 'Клеммы X1 X2, звонок «D» справа. Только символ.' },
  { code: 9011, family: 'signal', label: 'Zumbador', layout: ROWS2, commandIds: [32962], confidence: 'confirmed', note: 'Клеммы X1 X2, зуммер. Только символ.' },
  { code: 9012, family: 'signal', label: 'Sirena', layout: ROWS2, commandIds: [32960], confidence: 'confirmed', note: 'Клеммы X1 X2, треугольник сирены. Только символ.' },
  { code: 9013, family: 'signal', label: 'Bocina', layout: ROWS2, commandIds: [32959], confidence: 'confirmed', note: 'Клеммы X1 X2, квадрат с рупором. Только символ.' },

  { code: 4000, family: 'wire', label: 'Cable fase', layout: { kind: 'none' }, commandIds: [32884], confidence: 'confirmed', note: 'Провода фазы (L1 L2 L3 и цепь управления) в образцах.' },
  { code: 4009, family: 'wire', label: 'Cable neutro', layout: { kind: 'none' }, commandIds: [32895], confidence: 'confirmed', note: 'Идёт от 4-го полюса (N) аппаратов.' },
  { code: 4010, family: 'wire', label: 'Cable protección', layout: { kind: 'none' }, commandIds: [32896], confidence: 'confirmed', note: 'Идёт к клемме PE мотора.' },
  { code: 4001, family: 'junction', label: 'Conexión (точка)', layout: { kind: 'none' }, commandIds: [32889], confidence: 'probable', note: 'Нулевая длина; у видимых точек размер 3×3.' },

  { code: 20000, family: 'system', label: 'Служебный объект «XXX»', layout: { kind: 'none' }, commandIds: [], confidence: 'unknown', note: 'Есть во всех образцах на (42, 486), вне листа. Назначение неизвестно: сохраняется при записи, на листе не показывается.' },
  // ── Силовая электроника (панель «Potencia: resistencias, arrancadores, variadores, controladores», 17 кнопок; в ростере первые 7) ──
  // Образец: potencias_electronicas.cad (tests/fixtures/potencia_elementos.cad), по одной кнопке панели. Типы 1050..1056, 1062, 1063 идут не подряд:
  // в панели они стоят в порядке 1050 1051 1052 1053 1062 1063 1054 1055 1056 ... (порядок записей образца = порядок панели).
  // Смещения клемм у типов с layout «points» сняты со скриншота оригинала (шаг сетки 3, масштаб 5 px на единицу) и ждут проверки автора по образцу с проводами.
  { code: 1050, family: 'resistor', label: 'Resistencia I (-R)', layout: ROWS2, commandIds: [33002], confidence: 'confirmed', note: '6×18: клеммы 1 сверху и 2 снизу, ряды через 15 (h − 3). Прямоугольник 3×9 между выводами.' },
  { code: 1051, family: 'resistor', label: 'Resistencia III (-R)', layout: ROWS2, commandIds: [33003], confidence: 'confirmed', note: '18×18: три резистора, клеммы 1 3 5 сверху и 2 4 6 снизу, ряды через 15.' },
  { code: 1052, family: 'transformer', label: 'Autotransformador III (-T)', layout: { kind: 'points', points: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 12, y: 0 }, { x: 0, y: 18 }, { x: 6, y: 18 }, { x: 12, y: 18 }, { x: 3, y: 9 }, { x: 9, y: 9 }, { x: 15, y: 9 }] }, commandIds: [33004], confidence: 'probable', note: '18×21, девять клемм: 1 4 7 сверху, 2 5 8 снизу, 3 6 9 отводы справа от каждой обмотки на y = 9. Запись длиннее обычной: 11 текстовых полей и 24 числа (9 флагов). Три чёрные обмотки; смещения сняты со скриншота.' },
  { code: 1053, family: 'electronic-starter', label: 'Arrancador electrónico c.a. (-G)', layout: { kind: 'points', points: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 12, y: 0 }, { x: 0, y: 24 }, { x: 6, y: 24 }, { x: 12, y: 24 }, { x: 18, y: 12 }] }, commandIds: [33005], confidence: 'probable', note: '21×27: клеммы 1 3 5 сверху, 2 4 6 снизу, PE справа (18, 12). Рамка x −3..15, y 3..21; внутри тиристор. Только символ. Смещения сняты со скриншота.' },
  { code: 1062, family: 'control-unit', label: 'Control arrancador electrónico c.a. (-G)', layout: { kind: 'points', points: [{ x: 0, y: 0 }, { x: 9, y: 0 }, { x: 9, y: 24 }] }, commandIds: [33089], confidence: 'probable', note: '15×27: IN A1 сверху (0 и 9), A2 снизу справа (9, 24); индикаторы READY и RUN. После записи идёт текст 000/030/000/400, смысл не разгадан. Только символ. Смещения сняты со скриншота.' },
  { code: 1063, family: 'control-unit', label: 'Control inversor electrónico c.a. (-G)', layout: { kind: 'points', points: [{ x: 0, y: 0 }, { x: 9, y: 0 }, { x: 18, y: 0 }, { x: 18, y: 24 }] }, commandIds: [33262], confidence: 'probable', note: '24×27: I1 I2 A1 сверху (0, 9, 18), A2 снизу справа (18, 24); индикаторы READY и RUN. Хвост записи 000/030/000/400, как у 1062. Только символ. Смещения сняты со скриншота.' },
  { code: 1054, family: 'drive', label: 'Variador velocidad c.a. II (-G)', layout: { kind: 'points', points: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 12, y: 0 }, { x: 0, y: 30 }, { x: 6, y: 30 }, { x: 12, y: 30 }, { x: 18, y: 30 }] }, commandIds: [33006], confidence: 'probable', note: '24×33: L1 N PE сверху (0, 6, 12), U V W PE снизу (0..18, y = 30); внутри три секции: выпрямитель, конденсатор, транзистор. Только символ. Смещения сняты со скриншота.' },
  // Часть 2а: следующие 5 кнопок панели (33007, 33011, 33015, 33016, 33018). Соответствие кнопка ↔ тип выведено по порядку записей образца [вывод];
  // 1057/1058 это 33015/33016 (без F1 F2 и с ними), 1059 это 33018. Смещения клемм сняты со скриншота.
  { code: 1055, family: 'drive', label: 'Variador velocidad c.a. III (-G)', layout: { kind: 'points', points: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 12, y: 0 }, { x: 18, y: 0 }, { x: 0, y: 30 }, { x: 6, y: 30 }, { x: 12, y: 30 }, { x: 18, y: 30 }] }, commandIds: [33007], confidence: 'probable', note: '24×33: L1 L2 L3 PE сверху (0..18), U V W PE снизу (y = 30); три секции внутри, как у 1054. Только символ. Смещения сняты со скриншота.' },
  { code: 1056, family: 'control-unit', label: 'Control Variador velocidad c.a. (-G)', layout: { kind: 'points', points: [{ x: 0, y: 0 }, { x: 12, y: 0 }, { x: 24, y: 0 }, { x: 30, y: 0 }, { x: 36, y: 0 }, { x: 42, y: 0 }, { x: 48, y: 0 }, { x: 0, y: 30 }, { x: 12, y: 30 }, { x: 24, y: 30 }, { x: 30, y: 30 }, { x: 36, y: 30 }, { x: 48, y: 30 }] }, commandIds: [33011], confidence: 'probable', note: '54×33, 13 клемм: основная запись RA RC I1 I2 I3 I4 + сверху, продолжение (запись -1) R+ R- + AI 0V AO снизу (y = 30). Внутри переключающий контакт у RA–RC. Только символ. Смещения сняты со скриншота.' },
  { code: 1057, family: 'drive', label: 'Variador velocidad c.c. II (-G)', layout: { kind: 'points', points: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 12, y: 0 }, { x: 0, y: 30 }, { x: 12, y: 30 }] }, commandIds: [33015], confidence: 'probable', note: '18×33: L1 N PE сверху (0, 6, 12), M1 (0,30) и M2 (12,30) снизу; внутри мост из четырёх диодов. Только символ. Смещения сняты со скриншота.' },
  { code: 1058, family: 'drive', label: 'Variador velocidad c.c. II с обмоткой возбуждения (-G)', layout: { kind: 'points', points: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 12, y: 0 }, { x: 0, y: 30 }, { x: 6, y: 30 }, { x: 12, y: 30 }, { x: 18, y: 30 }] }, commandIds: [33016], confidence: 'probable', note: '24×33: L1 N PE сверху, M1 M2 F1 F2 снизу (0..18, y = 30); мост из четырёх диодов. Только символ. Смещения сняты со скриншота.' },
  { code: 1059, family: 'drive', label: 'Variador velocidad c.c. III (-G)', layout: { kind: 'points', points: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 12, y: 0 }, { x: 18, y: 0 }, { x: 3, y: 30 }, { x: 15, y: 30 }] }, commandIds: [33018], confidence: 'probable', note: '24×33: L1 L2 L3 PE сверху (0..18), M1 (3,30) и M2 (15,30) снизу; мост из шести диодов. Только символ. Смещения сняты со скриншота.' },
  // Последние 5 кнопок панели (33017, 33012, 33297, 33298, 33299). Соответствие кнопка ↔ тип выведено по порядку записей образца [вывод];
  // для 1066/1067 его подтверждают надписи внутри символа (CW CCW PD = «2 CLK», CK UD PD = «CLK/DIR»). Смещения клемм сняты со скриншота.
  { code: 1060, family: 'drive', label: 'Variador velocidad c.c. III с обмоткой возбуждения (-G)', layout: { kind: 'points', points: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 12, y: 0 }, { x: 18, y: 0 }, { x: 0, y: 30 }, { x: 6, y: 30 }, { x: 12, y: 30 }, { x: 18, y: 30 }] }, commandIds: [33017], confidence: 'probable', note: '24×33: L1 L2 L3 PE сверху, M1 M2 F1 F2 снизу (0..18, y = 30); мост из шести диодов, как у 1059. Только символ. Смещения сняты со скриншота.' },
  { code: 1061, family: 'control-unit', label: 'Control variador velocidad c.c. (-G)', layout: { kind: 'points', points: [{ x: 0, y: 0 }, { x: 12, y: 0 }, { x: 21, y: 0 }, { x: 27, y: 0 }, { x: 0, y: 30 }, { x: 6, y: 30 }, { x: 12, y: 30 }] }, commandIds: [33012], confidence: 'probable', note: '39×33: RA (0) RC (12) IN (21) V+ (27) сверху, + (0) AI (6) 0V (12) снизу (y = 30); переключающий контакт у RA–RC. Рамка начинается при x = −6. После записи идёт текст 0-050-230-0050-2000-05-05, смысл не разгадан. Только символ. Смещения сняты со скриншота.' },
  { code: 1065, family: 'control-unit', label: 'Controlador motor paso a paso (-G)', layout: { kind: 'points', points: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 12, y: 0 }, { x: 18, y: 0 }, { x: 0, y: 18 }, { x: 6, y: 18 }, { x: 12, y: 18 }, { x: 18, y: 18 }] }, commandIds: [33297], confidence: 'probable', note: '40×24: I1..I4 сверху (0..18), Q1..Q4 снизу (y = 18). Выводы L+ (24) и L- (30) сверху рисует символ: флагов в записи для них нет, смысл хвоста L+-1-L--1-1 не разгадан. Только символ. Смещения сняты со скриншота.' },
  { code: 1066, family: 'control-unit', label: 'Controlador motor paso a paso 2 CLK (-G)', layout: { kind: 'points', points: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 12, y: 0 }, { x: 0, y: 18 }, { x: 6, y: 18 }, { x: 12, y: 18 }, { x: 18, y: 18 }] }, commandIds: [33298], confidence: 'probable', note: '40×24: I1 I2 I3 сверху (0, 6, 12), Q1..Q4 снизу (y = 18). Слот флага 3 пуст (метка « »), Q1..Q4 лежат в слотах 4..7. Надписи CW CCW PD рисует символ. L+ и L- как у 1065. Только символ. Смещения сняты со скриншота.' },
  { code: 1067, family: 'control-unit', label: 'Controlador motor paso a paso CLK/DIR (-G)', layout: { kind: 'points', points: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 12, y: 0 }, { x: 0, y: 18 }, { x: 6, y: 18 }, { x: 12, y: 18 }, { x: 18, y: 18 }] }, commandIds: [33299], confidence: 'probable', note: 'Как 1066, но надписи CK UD PD. Только символ. Смещения сняты со скриншота.' },

];

const BY_CODE = new Map<number, CadTypeInfo>(TABLE.map((t) => [t.code, t]));

/** Тип для кода, которого нет в таблице. */
export function unknownCadType(code: number): CadTypeInfo {
  return {
    code,
    family: 'unknown',
    label: `Неизвестный тип ${code}`,
    layout: ROWS2,
    commandIds: [],
    confidence: 'unknown',
    note: 'Тип не встречался в образцах. Клеммы расставлены как у двухрядного аппарата.',
  };
}

export function getCadType(code: number): CadTypeInfo {
  return BY_CODE.get(code) ?? unknownCadType(code);
}

export function isKnownCadType(code: number): boolean {
  return BY_CODE.has(code);
}

export function allCadTypes(): readonly CadTypeInfo[] {
  return TABLE;
}

/** Тип .cad для команды каталога (нужно при размещении нового элемента). */
export function cadTypeForCommand(commandId: number): CadTypeInfo | undefined {
  return TABLE.find((t) => t.commandIds.includes(commandId));
}

const WIRE_KIND: Readonly<Record<number, WireKind>> = {
  4000: 'phase',
  4009: 'neutral',
  4010: 'protection',
  4001: 'junction',
};

export function wireKindOf(code: number): WireKind | undefined {
  return WIRE_KIND[code];
}

export function isWireType(code: number): boolean {
  return code in WIRE_KIND;
}

/** Все id команд из таблицы реально есть в каталоге (проверяется тестом). */
export function missingCatalogIds(): number[] {
  const bad: number[] = [];
  for (const t of TABLE) {
    for (const id of t.commandIds) if (!catalog.getById(id)) bad.push(id);
  }
  return bad;
}

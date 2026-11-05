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
const ROWS2 = { kind: 'rows', rows: 2, pitchX: 6 };
const STRIP = { kind: 'strip', pitchX: 6 };
/** Две колонки полюсов с шагом 9 (контакты NA+NC: 11 13 / 12 14 и 55 57 / 56 58). */
const ROWS2_P9 = { kind: 'rows', rows: 2, pitchX: 9 };
/**
 * Переключающий контакт CON (клеммы 11 12 14 или 55 56 58): общий вывод сверху по центру, НЗ и НО снизу
 * через 6; рамка 12×15, ряды через 12. Смещения сняты со скриншота образца contactos_elementos.cad.
 */
const CON_POINTS = { kind: 'points', points: [{ x: 3, y: 0 }, { x: 0, y: 12 }, { x: 6, y: 12 }] };
/** Биестабильная катушка 9001: A1 и B1 сверху через 6, A2 снизу по центру (смещения сняты со скриншота образца elementos_bobinas.cad). */
const BISTABLE_POINTS = { kind: 'points', points: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 3, y: 12 }] };
/** Счётчик импульсов 9016: A1 C D R сверху (0 6 9 12), A2 снизу под C. В файле флаги 0..3 и 6, метки лежат в слотах флагов. */
const COUNTER_POINTS = { kind: 'points', points: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 9, y: 0 }, { x: 12, y: 0 }, { x: 6, y: 12 }] };
/** Двухрядный аппарат, у которого рамка выше, чем расстояние между рядами клемм (рамка 30, ряды через 12). */
const ROWS2_GAP12 = { kind: 'rows', rows: 2, pitchX: 6, rowGap: 12 };
const TABLE = [
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
    { code: 2006, family: 'contactor', label: 'Contactor I (-KM)', layout: ROWS2, commandIds: [32899], confidence: 'confirmed', note: '6×15: один силовой полюс 1-2.' },
    { code: 2000, family: 'contactor', label: 'Contactor II (-KM)', layout: ROWS2, commandIds: [32834], confidence: 'confirmed', note: '12×15: два полюса 1-2, 3-4.' },
    { code: 2001, family: 'contactor', label: 'Contactor III (-KM)', layout: ROWS2, commandIds: [32833], confidence: 'confirmed', note: '18×15: три полюса 1-2, 3-4, 5-6.' },
    { code: 2002, family: 'contactor', label: 'Contactor IIII (-KM)', layout: ROWS2, commandIds: [32835], confidence: 'confirmed', note: '24×15: четыре полюса 1-2, 3-4, 5-6, 7-8.' },
    { code: 2008, family: 'contactor', label: 'Contactor III, символ с дугой (-KM)', layout: ROWS2_GAP12, commandIds: [33219], confidence: 'confirmed', note: 'Второй «Contactor III» (33219): те же три полюса, но на верхнем выводе каждого полюса дуга (знак функции контактора). Рамка 18×30, а клеммы стоят через 12, как у остальных: правило «высота − 3» здесь не работает.' },
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
    { code: 7008, family: 'aux-contact', label: 'Contacto temporizado a la deconexión NA', layout: ROWS2, commandIds: [32941], confidence: 'probable', note: '6×15: клеммы 67 68. Только символ: катушки реле с выдержкой на отключение в ростере пока нет.' },
    { code: 7009, family: 'aux-contact', label: 'Contacto temporizado a la deconexión NC', layout: ROWS2, commandIds: [32942], confidence: 'probable', note: '6×15: клеммы 55 56. Только символ.' },
    { code: 7010, family: 'aux-contact', label: 'Contacto temporizado a la deconexión NA+NC', layout: ROWS2_P9, commandIds: [32943], confidence: 'probable', note: '15×15: клеммы 55 57 / 56 58. Только символ.' },
    { code: 7011, family: 'aux-contact', label: 'Contacto temporizado a la deconexión CON', layout: CON_POINTS, commandIds: [32944], confidence: 'probable', note: '12×15: клеммы 55 56 58. Только символ.' },
    { code: 7012, family: 'aux-contact', label: 'Contacto temporizado a la conexión deconexión NA', layout: ROWS2, commandIds: [32945], confidence: 'probable', note: '6×15: клеммы 67 68. Только символ.' },
    { code: 7013, family: 'aux-contact', label: 'Contacto temporizado a la conexión deconexión NC', layout: ROWS2, commandIds: [32946], confidence: 'probable', note: '6×15: клеммы 55 56. Только символ.' },
    { code: 7014, family: 'aux-contact', label: 'Contacto temporizado a la conexión deconexión NA+NC', layout: ROWS2_P9, commandIds: [32947], confidence: 'probable', note: '15×15: клеммы 55 57 / 56 58. Только символ.' },
    { code: 7015, family: 'aux-contact', label: 'Contacto temporizado a la conexión deconexión CON', layout: CON_POINTS, commandIds: [32948], confidence: 'probable', note: '12×15: клеммы 55 56 58. Только символ.' },
    { code: 8000, family: 'pushbutton', label: 'Pulsador NA', layout: ROWS2, commandIds: [32909], confidence: 'probable', note: 'Клеммы 13 14.' },
    { code: 8001, family: 'pushbutton', label: 'Pulsador NC (вариант 8001)', layout: ROWS2, commandIds: [], confidence: 'unknown', note: 'Клеммы 11 12, -S1 и -S3 в Actividad 1.6: кнопка «Стоп», размыкающий контакт. Кандидаты: Pulsador seta NC 32915, Interruptor NC 32920.' },
    { code: 8005, family: 'pushbutton', label: 'Final de carrera NC', layout: ROWS2, commandIds: [32924], confidence: 'probable', note: 'Клеммы 11 12, имя -FC в Actividad 1.1.2: конечный выключатель, размыкающий контакт. Тип выведен по клеммам и имени (сам файл для проверки не приложен).' },
    { code: 8013, family: 'pushbutton', label: 'Pulsador NC', layout: ROWS2, commandIds: [32910], confidence: 'probable', note: 'Клеммы 11 12.' },
    { code: 8018, family: 'thermal-contact', label: 'Contacto auxiliar relé térmico NA-NC', layout: { kind: 'rows', rows: 2, pitchX: 9 }, commandIds: [32929], confidence: 'confirmed', note: 'Клеммы 95 97 96 98, шаг 9.' },
    { code: 9000, family: 'coil', label: 'Bobina contactor, relé', layout: ROWS2, commandIds: [32949], confidence: 'probable', note: 'Клеммы A1 A2.' },
    { code: 9004, family: 'coil', label: 'Temporizador a la conexión', layout: ROWS2, commandIds: [32952], confidence: 'probable', note: 'Клеммы A1 A2, в текстовых полях после клемм два параметра (в образцах 0 и 5, 0 и 10).' },
    // ── Катушки и сигнализация (панель «Bobinas, temporizadores…», 17 кнопок) ──
    // Образец: elementos_bobinas.cad, по одной кнопке панели. Коды 9000..9016 идут в порядке панели, кроме пары 9015/9014:
    // «Generador de pulsos» записан как 9015, «Interruptor horario» как 9014 (символы подтверждают: «E» и часы). Все новые типы пока только символы.
    { code: 9001, family: 'relay-coil', label: 'Bobina biestable contactor, relé', layout: BISTABLE_POINTS, commandIds: [32956], confidence: 'confirmed', note: 'Клеммы A1 B1 сверху, A2 снизу по центру; внутри две косые линии. Только символ.' },
    { code: 9002, family: 'relay-coil', label: 'Telerruptor', layout: ROWS2, commandIds: [32964], confidence: 'confirmed', note: 'Клеммы A1 A2; слева отсек со знаком «<». Только символ.' },
    { code: 9003, family: 'relay-coil', label: 'Bobina electroválvula', layout: ROWS2, commandIds: [32951], confidence: 'confirmed', note: 'Клеммы A1 A2, имя -EV; косая черта в корпусе и клапан справа. Только символ.' },
    { code: 9005, family: 'relay-coil', label: 'Temporizador a la desconexión', layout: ROWS2, commandIds: [32953], confidence: 'confirmed', note: 'Клеммы A1 A2 + параметры 0 и 1; слева залитый отсек. Только символ.' },
    { code: 9006, family: 'relay-coil', label: 'Temporizador a la conexión desconexión', layout: ROWS2, commandIds: [32954], confidence: 'confirmed', note: 'Клеммы A1 A2 + параметры 0 и 1; слева залитый отсек со знаком выдержки. Только символ.' },
    { code: 9007, family: 'relay-coil', label: 'Relé intermitente', layout: ROWS2, commandIds: [32955], confidence: 'confirmed', note: 'Клеммы A1 A2 + параметры 0 и 1; слева отсек со знаком «5». Только символ.' },
    { code: 9015, family: 'relay-coil', label: 'Generador de pulsos', layout: ROWS2, commandIds: [33223], confidence: 'probable', note: 'Клеммы A1 A2 + четыре параметра (0 1 0 1); слева отсек со знаком «E». Соответствие 9015 ↔ «Generador de pulsos» и 9014 ↔ «Interruptor horario» выведено из порядка и вида символов. Только символ.' },
    { code: 9014, family: 'relay-coil', label: 'Interruptor horario', layout: ROWS2, commandIds: [33098], confidence: 'probable', note: 'Клеммы A1 A2 + шесть параметров (расписание, в образце нули); в корпусе значок часов. Только символ.' },
    { code: 9016, family: 'relay-coil', label: 'Contador de pulsos', layout: COUNTER_POINTS, commandIds: [33236], confidence: 'confirmed', note: 'Клеммы A1 C D R сверху, A2 снизу; рамка 18×15. В файле флаги 0..3 и 6, метки лежат в слотах флагов (texts[2..5] и texts[8]), параметры 0 0 между ними. Только символ.' },
    { code: 9008, family: 'lamp', label: 'Piloto señalización', layout: ROWS2, commandIds: [32957], confidence: 'confirmed', note: 'Клеммы X1 X2; параметр после клемм: индекс цвета (в образцах 0, 1, 2).' },
    { code: 9009, family: 'lamp', label: 'Piloto señalización intermitente', layout: ROWS2, commandIds: [32958], confidence: 'confirmed', note: 'Клеммы X1 X2 + цвет, как у 9008; справа значок импульса. Мигание в движке пока не моделируется.' },
    { code: 9010, family: 'signal', label: 'Timbre', layout: ROWS2, commandIds: [32961], confidence: 'confirmed', note: 'Клеммы X1 X2, звонок «D» справа. Только символ.' },
    { code: 9011, family: 'signal', label: 'Zumbador', layout: ROWS2, commandIds: [32962], confidence: 'confirmed', note: 'Клеммы X1 X2, зуммер. Только символ.' },
    { code: 9012, family: 'signal', label: 'Sirena', layout: ROWS2, commandIds: [32960], confidence: 'confirmed', note: 'Клеммы X1 X2, треугольник сирены. Только символ.' },
    { code: 9013, family: 'signal', label: 'Bocina', layout: ROWS2, commandIds: [32959], confidence: 'confirmed', note: 'Клеммы X1 X2, квадрат с рупором. Только символ.' },
    { code: 4000, family: 'wire', label: 'Cable fase', layout: { kind: 'none' }, commandIds: [32884], confidence: 'confirmed', note: 'Провода фазы (L1 L2 L3 и цепь управления) в образцах.' },
    { code: 4009, family: 'wire', label: 'Cable neutro', layout: { kind: 'none' }, commandIds: [32895], confidence: 'confirmed', note: 'Идёт от 4-го полюса (N) аппаратов.' },
    { code: 4010, family: 'wire', label: 'Cable protección', layout: { kind: 'none' }, commandIds: [32896], confidence: 'confirmed', note: 'Идёт к клемме PE мотора.' },
    { code: 4001, family: 'junction', label: 'Conexión (точка)', layout: { kind: 'none' }, commandIds: [32889], confidence: 'probable', note: 'Нулевая длина; у видимых точек размер 3×3.' },
    { code: 20000, family: 'system', label: 'Служебный объект «XXX»', layout: { kind: 'none' }, commandIds: [], confidence: 'unknown', note: 'Есть во всех образцах на (42, 486), вне листа. Назначение неизвестно: сохраняется при записи, на листе не показывается.' },
];
const BY_CODE = new Map(TABLE.map((t) => [t.code, t]));
/** Тип для кода, которого нет в таблице. */
export function unknownCadType(code) {
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
export function getCadType(code) {
    return BY_CODE.get(code) ?? unknownCadType(code);
}
export function isKnownCadType(code) {
    return BY_CODE.has(code);
}
export function allCadTypes() {
    return TABLE;
}
/** Тип .cad для команды каталога (нужно при размещении нового элемента). */
export function cadTypeForCommand(commandId) {
    return TABLE.find((t) => t.commandIds.includes(commandId));
}
const WIRE_KIND = {
    4000: 'phase',
    4009: 'neutral',
    4010: 'protection',
    4001: 'junction',
};
export function wireKindOf(code) {
    return WIRE_KIND[code];
}
export function isWireType(code) {
    return code in WIRE_KIND;
}
/** Все id команд из таблицы реально есть в каталоге (проверяется тестом). */
export function missingCatalogIds() {
    const bad = [];
    for (const t of TABLE) {
        for (const id of t.commandIds)
            if (!catalog.getById(id))
                bad.push(id);
    }
    return bad;
}

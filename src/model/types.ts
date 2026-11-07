/** Модель данных схемы. Без DOM и без зависимостей от интерфейса. */

import type { CadFooter } from './cad-format';

export type ElementId = number;

/** Позиция в единицах .cad (во всех образцах координаты кратны 3, шаг клемм 6 или 9). */
export interface Point {
  x: number;
  y: number;
}

export interface Size {
  w: number;
  h: number;
}

export interface Terminal {
  /** Метка клеммы: A1, A2, 13, 14, U1 ... Для клемм без метки пустая строка. */
  label: string;
  /** Положение относительно элемента (с учётом поворота), в единицах сетки. */
  offset: Point;
}

/** Исходные поля записи .cad: нужны, чтобы при сохранении ничего не потерять. */
export interface CadRaw {
  texts: string[];
  nums: number[];
  /** Текст после закрывающего «#» записи (смысл не разгадан), пишется обратно как есть. */
  tail?: string;
  /** Записи-продолжения (тип -1), идущие сразу за записью элемента: дополнительные клеммы того же элемента. */
  continuations?: Array<{ id: number; type: number; texts: string[]; nums: number[]; tail?: string }>;
}

export type Rotation = 0 | 1 | 2 | 3;

export interface SchemaElement {
  id: ElementId;
  /** Код типа, как он записан в .cad (1000 = мотор, 9000 = катушка ...). */
  typeCode: number;
  /** Имя (Nombre): связывает катушки и контакты. */
  name: string;
  /** Функция (Función): описание, показывается в таблицах. */
  func: string;
  position: Point;
  /** Поворот по 90°, как в .cad. Проверен для 0 и 3 на двухклеммных элементах. */
  rotation: Rotation;
  /** Размер рамки символа из .cad. Высота между рядами клемм = h − 3. */
  size: Size;
  /** Смещение подписи относительно позиции. */
  labelOffset: Point;
  terminals: Terminal[];
  /** Параметры элемента: цвет лампы, шкала и значение таймера и т. п. */
  params: Record<string, number | string | boolean>;
  raw?: CadRaw;
}

/** Фаза / нейтраль / защитный провод и точка соединения. */
export type WireKind = 'phase' | 'neutral' | 'protection' | 'junction';

export interface WireSegment {
  id: ElementId;
  /** Код типа в .cad: 4000, 4009, 4010 или 4001. */
  typeCode: number;
  kind: WireKind;
  from: Point;
  to: Point;
  /** Толщина линии 1..4. У точки соединения 0. */
  thickness: number;
  /** Только для junction: рисовать ли точку. */
  dot: boolean;
  raw?: CadRaw;
}

export interface SheetInfo {
  title: string;
  author: string;
  entity: string;
  date: string;
  fileName: string;
  /** Номер листа (штамп, поле «Número»). */
  number: string;
  /** Всего листов (штамп: «de»). */
  total?: string;
  /** Штамп: графы «Dibujado» и «Comprobado» (дата, подпись; имя «Dibujado» — это `author`). */
  drawnDate?: string;
  drawnSign?: string;
  checkedName?: string;
  checkedDate?: string;
  checkedSign?: string;
  /** Размер листа, мм (в .cad у A4 горизонтально 279 × 210). */
  width: number;
  height: number;
  /** Подвал .cad как есть, чтобы сохранить неразобранные настройки. */
  cadFooter?: CadFooter;
}

export interface Schema {
  /** Версия нашего JSON-формата. */
  formatVersion: 1;
  elements: SchemaElement[];
  wires: WireSegment[];
  sheet: SheetInfo;
}

export function createEmptySchema(): Schema {
  return {
    formatVersion: 1,
    elements: [],
    wires: [],
    sheet: {
      title: '',
      author: 'Igor Lipskiy Vyatchin',
      entity: '',
      date: '',
      fileName: '',
      number: '',
      width: 420,
      height: 297,
    },
  };
}

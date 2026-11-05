/**
 * Типы движка симуляции. Чистый TypeScript, без DOM.
 *
 * Контракт: `simulate(EngineInput) -> EngineState`. Функция чистая: не меняет
 * вход, не хранит скрытого состояния, одинаковый вход даёт одинаковый результат.
 * Всё состояние, которое должно жить между вызовами (защёлки, таймеры), лежит
 * в `EngineInput.memory` и возвращается в `EngineState.memory`.
 *
 * Все структуры состояния состоят из чисел, строк, булевых значений, массивов и
 * `Record`, поэтому результат без потерь проходит через JSON.
 *
 * Модель описана в «modelo_circuito_y_elementos.md»: движок дискретный, есть
 * только «потенциал есть / нет», без токов и вольт.
 */

import type { ElementId, Schema } from '../model/types';

// ---------------------------------------------------------------------------
// Режим сессии (используется интерфейсом, не самим simulate)
// ---------------------------------------------------------------------------

export type SimMode = 'edit' | 'run' | 'pause' | 'step';

/** Состояние сессии симуляции: режим и симулированное время. */
export interface SimState {
  mode: SimMode;
  /** Симулированное время, секунды. */
  time: number;
}

export function createInitialState(): SimState {
  return { mode: 'edit', time: 0 };
}

// ---------------------------------------------------------------------------
// Адресация клемм и сетей
// ---------------------------------------------------------------------------

/** Клемма элемента: id элемента и индекс в `SchemaElement.terminals`. */
export interface TerminalRef {
  element: ElementId;
  index: number;
}

/** Строковый ключ клеммы для `Record`: `"<id>:<index>"`. */
export type TerminalKey = `${number}:${number}`;

export function terminalKey(element: ElementId, index: number): TerminalKey {
  return `${element}:${index}`;
}

export function terminalKeyOf(ref: TerminalRef): TerminalKey {
  return terminalKey(ref.element, ref.index);
}

/** Номер сети (электрически один узел). Присваивается на этапе 5.2. */
export type NetId = number;

// ---------------------------------------------------------------------------
// Потенциалы и линии
// ---------------------------------------------------------------------------

/**
 * Метка потенциала. AC: L1 L2 L3 N PE. DC: + и - (второй очереди, но метка
 * заложена сразу, чтобы не менять тип позже).
 */
export type PotentialLabel = 'L1' | 'L2' | 'L3' | 'N' | 'PE' | '+' | '-';

/** Тип линии по проводам сети: фаза 4000, нейтраль 4009, защитный 4010. */
export type LineKind = 'phase' | 'neutral' | 'protection';

// ---------------------------------------------------------------------------
// Вход
// ---------------------------------------------------------------------------

/**
 * Что пользователь делает со схемой в режиме симуляции. Всё привязано к id
 * элемента, а не к имени: у нескольких кнопок может быть одно имя.
 */
export interface UserInputs {
  /** Кнопка нажата / датчик обнаруживает. Нет записи = отпущена. */
  pressed: Record<ElementId, boolean>;
  /**
   * Положение переключателей и ручных аппаратов с фиксацией (рубильник,
   * переключатель, автомат включён). Нет записи = положение по умолчанию.
   */
  toggled: Record<ElementId, boolean>;
  /** Ручная имитация перегрузки: тепловое реле или автомат отключены. */
  tripped: Record<ElementId, boolean>;
}

/** Состояние, которое переживает вызовы `simulate` (защёлки, фронты, таймеры). */
export interface EngineMemory {
  /** Бистабильные катушки и телеруптор: имя -> включено. Заполняется в 5.5. */
  latches: Record<string, boolean>;
  /** Предыдущее состояние катушек по имени, для детектора фронтов. */
  prevCoils: Record<string, boolean>;
  /** Таймеры по id элемента. Заполняется в 5.7. */
  timers: Record<ElementId, TimerState>;
}

export interface TimerState {
  phase: 'idle' | 'counting' | 'done';
  /** Сколько секунд прошло с начала выдержки. */
  elapsed: number;
  /** Последнее симулируемое время, использованное для расчёта. */
  lastTime?: number;
}

export interface EngineOptions {
  /** Лимит итераций релейного цикла. По умолчанию 50 (раздел 4.7 модели). */
  maxRelayIterations: number;
}

export interface EngineInput {
  schema: Schema;
  inputs: UserInputs;
  /** Симулированное время, секунды. Продвигает вызывающий код (шаг 5.7: `tick`). */
  time: number;
  /** Память с предыдущего вызова. Нет значения = чистый старт. */
  memory?: EngineMemory;
  options?: Partial<EngineOptions>;
}

// ---------------------------------------------------------------------------
// Выход
// ---------------------------------------------------------------------------

/** Сеть после расчёта. */
export interface NetState {
  id: NetId;
  terminals: TerminalRef[];
  /** Тип линии по проводам сети. null: в сети нет проводов с кодом типа линии. */
  line: LineKind | null;
  /** Потенциалы, достигшие сети, без повторов, в порядке L1 L2 L3 N PE + -. */
  potentials: PotentialLabel[];
}

export interface MotorState {
  /** Запущен: U1/V1/W1 на трёх разных фазах. */
  running: boolean;
  /** Подключён, но запуск невозможен (обрыв фазы, нет питания). */
  faulted: boolean;
  /** Двигатель постоянного тока вращается в обратную сторону (на A1 минус, на A2 плюс). */
  reversed?: boolean;
}

export type FaultKind = 'short-circuit' | 'earth-leak' | 'unstable';

export interface Fault {
  kind: FaultKind;
  message: string;
  /** Для short-circuit: пара потенциалов, например ['L1','N']. */
  between?: [PotentialLabel, PotentialLabel];
  nets?: NetId[];
  /** Элемент, который отключился из-за неисправности (автомат, предохранитель). */
  trippedElement?: ElementId;
}

export interface EngineState {
  /** Время, для которого посчитано состояние (копия `EngineInput.time`). */
  time: number;
  /** Сети. Пусто до этапа 5.2. */
  nets: NetState[];
  /** Клемма -> сеть. Пусто до этапа 5.2. */
  terminalNet: Record<TerminalKey, NetId>;
  /** Катушки по имени: включена, если питается любая катушка с этим именем. */
  coils: Record<string, boolean>;
  /** Контакты и полюса по id: замкнут или нет. */
  contacts: Record<ElementId, boolean>;
  /** Лампы по id: горит или нет. */
  lamps: Record<ElementId, boolean>;
  /** Моторы по id. */
  motors: Record<ElementId, MotorState>;
  /** Аппараты, которые сработали (тепловые реле, автоматы, предохранители). */
  tripped: Record<ElementId, boolean>;
  /** Короткие замыкания, утечки, нестабильность. */
  faults: Fault[];
  /** Предупреждения (неизвестный код типа, лимит итераций и т. п.), текстом. */
  warnings: string[];
  /** Релейный цикл стабилизировался. */
  stable: boolean;
  /** Сколько итераций релейного цикла понадобилось. */
  iterations: number;
  /** Память для следующего вызова. */
  memory: EngineMemory;
}

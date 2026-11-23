// ── Условия переходов (receptividad) и действия этапов GRAFCET ───────────────────────────────────────
// Условие пишется как в тетради: «S1», «T1·/I7», «S1+S2», «(I1+I2)·/I3», «=1», «T2=3s».
//   И: «·», «*», «&» или просто пробел между операндами («S1 S2»);  ИЛИ: «+» или «|»;
//   НЕ: «/», «!», «¬» или «~» перед операндом (в тетради — черта сверху);  скобки ( ).
//   «1» / «=1» — всегда истина, «0» — ложь; «3s», «T2=3s», «500ms», «1min» — этап перед переходом
//   активен не меньше этого времени (по фото задачи: «T2 = 3s» под этапом 2).
// Действие этапа: операнды через пробел или запятую («H1 H2», «KM1.1»), каждый включён, пока этап активен;
//   «T1=5s» или «T1(5s)» — таймер этапа: операнд T1 включается через 5 с активности этапа.

export type GrafcetExpr =
  | { kind: 'const'; value: boolean }
  | { kind: 'operand'; name: string }
  | { kind: 'time'; seconds: number }
  | { kind: 'not'; expr: GrafcetExpr }
  | { kind: 'and' | 'or'; items: GrafcetExpr[] };

export interface GrafcetAction {
  name: string;
  /** Таймер этапа: операнд включается через seconds секунд активности этапа. */
  seconds?: number;
}

const AND = new Set(['·', '*', '&', '∙', '•', '⋅']);
const OR = new Set(['+', '|']);
const NOT = new Set(['/', '!', '¬', '~']);
const NAME = /[A-Za-z0-9_.,=:ºªÑñÁÉÍÓÚÜáéíóúüЀ-ӿ]/;

/** Время «3s», «3 s», «500ms», «1min», «2,5seg»; без единицы — секунды, если перед числом было «=». */
export function parseSeconds(text: string, unitRequired = true): number | undefined {
  const match = /^(\d+(?:[.,]\d+)?)\s*(ms|s|seg|sec|min|m)?$/i.exec(text.trim());
  if (!match) return undefined;
  const unit = (match[2] ?? '').toLowerCase();
  if (!unit && unitRequired) return undefined;
  const value = Number(match[1]!.replace(',', '.'));
  if (unit === 'ms') return value / 1000;
  if (unit === 'min' || unit === 'm') return value * 60;
  return value;
}

type Token = { kind: 'and' | 'or' | 'not' | 'open' | 'close' } | { kind: 'atom'; text: string };

function tokenize(source: string): Token[] {
  // «T2 = 3s» → «T2=3s»; черта сверху (U+0305) после имени → «/» перед ним.
  const text = source.replace(/\s*=\s*/g, '=').replace(/([A-Za-z0-9_.]+)̅+/g, '/$1');
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i]!;
    if (/\s/.test(ch)) { i += 1; continue; }
    if (AND.has(ch)) tokens.push({ kind: 'and' });
    else if (OR.has(ch)) tokens.push({ kind: 'or' });
    else if (NOT.has(ch)) tokens.push({ kind: 'not' });
    else if (ch === '(') tokens.push({ kind: 'open' });
    else if (ch === ')') tokens.push({ kind: 'close' });
    else if (NAME.test(ch) || ch === '↑' || ch === '↓') {
      let j = i;
      while (j < text.length && (NAME.test(text[j]!) || text[j] === '↑' || text[j] === '↓')) j += 1;
      // Фронты ↑ / ↓ считаем уровнем: в учебных задачах они ставятся у кнопок.
      tokens.push({ kind: 'atom', text: text.slice(i, j).replace(/[↑↓]/g, '') });
      i = j;
      continue;
    } else throw new SyntaxError(`Неожиданный символ «${ch}»`);
    i += 1;
  }
  return tokens;
}

function atom(text: string): GrafcetExpr {
  if (text === '1' || text === '=1') return { kind: 'const', value: true };
  if (text === '0' || text === '=0') return { kind: 'const', value: false };
  const eq = text.indexOf('=');
  if (eq >= 0) {
    // «T2=3s» и «=3s»: время этапа; «T2=3» — тоже секунды.
    const seconds = parseSeconds(text.slice(eq + 1), false);
    if (seconds !== undefined) return { kind: 'time', seconds };
  }
  const seconds = parseSeconds(text);
  if (seconds !== undefined) return { kind: 'time', seconds };
  return { kind: 'operand', name: text };
}

/** Разбор условия перехода. Пустое условие — undefined (переход не срабатывает). Ошибка — SyntaxError. */
export function parseReceptivity(source: string): GrafcetExpr | undefined {
  const tokens = tokenize(source);
  if (tokens.length === 0) return undefined;
  let pos = 0;
  const peek = (): Token | undefined => tokens[pos];
  const startsFactor = (token: Token | undefined): boolean =>
    token !== undefined && (token.kind === 'atom' || token.kind === 'not' || token.kind === 'open');
  const factor = (): GrafcetExpr => {
    const token = tokens[pos];
    if (!token) throw new SyntaxError('Условие обрывается');
    pos += 1;
    if (token.kind === 'not') return { kind: 'not', expr: factor() };
    if (token.kind === 'atom') return atom(token.text);
    if (token.kind === 'open') {
      const inner = expression();
      if (tokens[pos]?.kind !== 'close') throw new SyntaxError('Не закрыта скобка');
      pos += 1;
      return inner;
    }
    throw new SyntaxError('Ожидался операнд');
  };
  const term = (): GrafcetExpr => {
    const items = [factor()];
    for (;;) {
      if (peek()?.kind === 'and') { pos += 1; items.push(factor()); continue; }
      if (startsFactor(peek())) { items.push(factor()); continue; }
      break;
    }
    return items.length === 1 ? items[0]! : { kind: 'and', items };
  };
  const expression = (): GrafcetExpr => {
    const items = [term()];
    while (peek()?.kind === 'or') { pos += 1; items.push(term()); }
    return items.length === 1 ? items[0]! : { kind: 'or', items };
  };
  const result = expression();
  if (pos !== tokens.length) throw new SyntaxError('Лишние символы в условии');
  return result;
}

/** Разбор без исключений: ошибка и пустое условие — undefined. */
export function tryParseReceptivity(source: string): GrafcetExpr | undefined {
  try { return parseReceptivity(source); } catch { return undefined; }
}

export interface ExprContext {
  operand(name: string): boolean;
  /** Сколько секунд активны этапы перед переходом. */
  stepTime: number;
}

export function evaluateExpr(expr: GrafcetExpr | undefined, context: ExprContext): boolean {
  if (!expr) return false;
  switch (expr.kind) {
    case 'const': return expr.value;
    case 'operand': return context.operand(expr.name);
    case 'time': return context.stepTime >= expr.seconds - 1e-9;
    case 'not': return !evaluateExpr(expr.expr, context);
    case 'and': return expr.items.every((item) => evaluateExpr(item, context));
    case 'or': return expr.items.some((item) => evaluateExpr(item, context));
  }
}

/** Имена операндов условия (без времени и констант), в порядке появления. */
export function exprOperands(expr: GrafcetExpr | undefined, into: string[] = []): string[] {
  if (!expr) return into;
  if (expr.kind === 'operand' && !into.includes(expr.name)) into.push(expr.name);
  if (expr.kind === 'not') exprOperands(expr.expr, into);
  if (expr.kind === 'and' || expr.kind === 'or') for (const item of expr.items) exprOperands(item, into);
  return into;
}

/** Действия этапа: «H1 H2», «KM1.1, KM2», «T1=5s», «T1(5s)». */
export function parseActions(source: string): GrafcetAction[] {
  const text = source.replace(/\s*=\s*/g, '=').replace(/\(\s*/g, '(').replace(/\s*\)/g, ')')
    .replace(/(\d)\s+(ms|s|seg|min)\b/gi, '$1$2');
  const actions: GrafcetAction[] = [];
  for (const token of text.split(/[\s;]+|,(?!\d)/).filter(Boolean)) {
    const timer = /^(.+?)(?:=|\()(\d+(?:[.,]\d+)?\s*(?:ms|s|seg|sec|min)?)\)?$/i.exec(token);
    const seconds = timer ? parseSeconds(timer[2]!, false) : undefined;
    if (timer && seconds !== undefined) actions.push({ name: timer[1]!, seconds });
    else if (token !== '=1') actions.push({ name: token });
  }
  return actions;
}

/** Номер этапа как операнд: «X2» — этап с номером 2 активен. */
export const stepOperand = (name: string): string | undefined => /^X(\d+)$/i.exec(name)?.[1];

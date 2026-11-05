/**
 * Геометрия клемм и листа. Правила выведены из образцов .cad: концы проводов
 * в них совпадают с клеммами элементов, а расстояние между рядами клемм равно
 * высоте рамки минус 3.
 */
/** Поворот на k·90° по часовой стрелке на экране (ось y вниз). Проверен для 0 и 3. */
export function rotateOffset(p, k) {
    // "+ 0" превращает -0 в 0: иначе сравнение через Object.is видит разные числа.
    switch (k) {
        case 0:
            return { x: p.x, y: p.y };
        case 1:
            return { x: -p.y + 0, y: p.x };
        case 2:
            return { x: -p.x + 0, y: -p.y + 0 };
        case 3:
            return { x: p.y, y: -p.x + 0 };
    }
}
/**
 * В записях .cad размер рамки хранится в повёрнутой системе: у элемента, повёрнутого на 90° или 270°,
 * ширина и высота поменяны местами (горизонтальный контакт 7001 записан как 15×12, а не 6×15).
 * Эта функция возвращает размер в неповёрнутой системе, по которой считаются ряды клемм.
 */
export function unrotatedSize(size, rotation) {
    return rotation % 2 === 1 ? { w: size.h, h: size.w } : size;
}
/** Размер рамки в системе записи .cad для поворота (обратное к unrotatedSize). */
export function frameSize(size, rotation) {
    return unrotatedSize(size, rotation);
}
/** Смещения клемм до поворота. `count` = число клемм по флагам записи (для strip не нужно). */
export function baseTerminalOffsets(info, count, size) {
    const layout = info.layout;
    if (layout.kind === 'none')
        return [];
    if (layout.kind === 'points')
        return layout.points.map((point) => ({ ...point }));
    if (layout.kind === 'strip') {
        const n = Math.round(size.w / layout.pitchX);
        return Array.from({ length: n }, (_, i) => ({ x: i * layout.pitchX, y: 0 }));
    }
    if (count <= 0)
        return [];
    // Обычно ряды разнесены на высоту рамки − 3; у типов с рамкой выше ряда расстояние задано явно (rowGap).
    const rowGap = layout.rowGap ?? size.h - 3;
    if (layout.rows === 1) {
        return Array.from({ length: count }, (_, i) => ({ x: i * layout.pitchX, y: 0 }));
    }
    // Два ряда: верхний ряд слева направо, затем нижний. Нечётное число: верхний ряд длиннее.
    const cols = Math.ceil(count / 2);
    return Array.from({ length: count }, (_, i) => ({
        x: (i % cols) * layout.pitchX,
        y: i < cols ? 0 : rowGap,
    }));
}
/**
 * Собирает клеммы: метки берутся по порядку, недостающие остаются пустыми.
 * `size` — размер рамки в системе записи .cad (для поворота на 90°/270° ширина и высота поменяны).
 */
export function buildTerminals(info, count, size, rotation, labels) {
    return baseTerminalOffsets(info, count, unrotatedSize(size, rotation)).map((o, i) => ({
        label: labels[i] ?? '',
        offset: rotateOffset(o, rotation),
    }));
}
export function terminalPosition(el, index) {
    const t = el.terminals[index];
    if (!t)
        return undefined;
    return { x: el.position.x + t.offset.x, y: el.position.y + t.offset.y };
}
export function samePoint(a, b) {
    return a.x === b.x && a.y === b.y;
}
/** Концы провода (у точки соединения оба конца совпадают). */
export function wireEnds(w) {
    return [w.from, w.to];
}
/**
 * Границы схемы. Служебные объекты вне листа (тип 20000 на y = 486) не считаются,
 * иначе рамка «показать всё» уезжала бы далеко вниз.
 */
export function schemaBounds(schema, ignoreTypes = new Set([20000])) {
    const acc = { b: null };
    const add = (p) => {
        const b = acc.b;
        if (!b)
            acc.b = { minX: p.x, minY: p.y, maxX: p.x, maxY: p.y };
        else {
            b.minX = Math.min(b.minX, p.x);
            b.minY = Math.min(b.minY, p.y);
            b.maxX = Math.max(b.maxX, p.x);
            b.maxY = Math.max(b.maxY, p.y);
        }
    };
    for (const e of schema.elements) {
        if (ignoreTypes.has(e.typeCode))
            continue;
        add(e.position);
        for (let i = 0; i < e.terminals.length; i += 1) {
            const p = terminalPosition(e, i);
            if (p)
                add(p);
        }
    }
    for (const w of schema.wires) {
        add(w.from);
        add(w.to);
    }
    return acc.b;
}

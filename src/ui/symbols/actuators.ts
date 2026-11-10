import { circle, dashed, group, path } from "./svg-primitives";

/** Скоба и пунктирный привод кнопки. */
function pushActuator(x: number, nc: boolean, to = nc ? x + 1.5 : x - 1.5): SVGGElement {
  return group(
    "actuator",
    dashed(`M ${x - 6} 6 H ${to}`, "1.5 1.1"),
    path(`M ${x - 4.7} 4.5 H ${x - 6} V 7.5 H ${x - 4.7}`),
  );
}

/** Привод «грибок» (seta): полукруглая головка выпуклой стороной влево, короткий шток и пунктир к середине контакта. */
function setaActuator(x: number, nc: boolean, to = nc ? x + 1.5 : x - 1.5): SVGGElement {
  return group(
    "actuator",
    dashed(`M ${x - 4} 6 H ${to}`, "1.5 1.1"),
    path(`M ${x - 5} 3.6 V 8.4 M ${x - 5} 3.6 A 2.4 2.4 0 0 0 ${x - 5} 8.4 M ${x - 5} 6 H ${x - 4}`),
  );
}

/**
 * Привод ручного выключателя с фиксацией (Interruptor 8008–8011) по образцу accionamientos.cad:
 * ступенчатая скоба (вертикаль с коротким хвостом влево внизу и полкой вправо вверху) и пунктир к середине контакта.
 * Это не switchActuator (тот рисует привод автомата).
 */
export function maintainedActuator(x: number, nc: boolean, to = nc ? x + 1.5 : x - 1.5): SVGGElement {
  return group(
    "actuator",
    path(`M ${x - 7.5} 8.5 H ${x - 6.2} V 6 H ${x - 4.7}`),
    dashed(`M ${x - 4.7} 6 H ${to}`, "1.5 1.1"),
  );
}

/** Вид привода для кнопок и переключателей панели «Accionamientos». */
export type ActuatorKind = "push" | "seta" | "maintained" | "limit";

export const ACTUATORS: Readonly<Record<ActuatorKind, (x: number, nc: boolean, to?: number) => SVGGElement>> =
  {
    push: pushActuator,
    seta: setaActuator,
    maintained: maintainedActuator,
    limit: limitActuator,
  };

/** Привод конечного выключателя: пунктир к контакту и ролик на конце. */
export function limitActuator(x: number, nc: boolean, to = nc ? x + 1.5 : x - 1.5): SVGGElement {
  const midX = to;
  return group(
    "actuator",
    dashed(`M ${x - 5} 6 H ${midX}`, "1.5 1.1"),
    group(
      "actuator-roller",
      circle(x - 6.4, 6, 1.4, { "stroke-width": 0.8 }),
      path(`M ${x - 6.4} 4.6 V 3.2`, 0.7),
    ),
  );
}

/** Привод ручного выключателя (Interruptor): скоба слева, «V» и линия к середине лопасти первого полюса. */
export function switchActuator(x: number): SVGGElement {
  return group(
    "actuator",
    path(`M ${x - 9} 4 V 8 M ${x - 9} 6 H ${x - 7}`),
    path(`M ${x - 7} 6 L ${x - 5.2} 9 L ${x - 3.4} 6 H ${x - 1.5}`),
  );
}

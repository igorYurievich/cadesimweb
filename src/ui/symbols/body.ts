import type { SchemaElement } from "@model/types";
import { columns, contactColumn, contactorMark, drawInterlock, linkBar, rowGapOf } from "./contacts";
import { switchActuator } from "./actuators";
import { drawBrake, drawDcMotor, drawMotor, drawStepper } from "./motors";
import { drawStrip, stripNames } from "./terminal-strips";
import {
  drawBattery,
  drawDiode,
  drawFuse,
  drawGround,
  drawOutlet,
  drawPowerSupply,
  drawRectifier,
  drawTransformer,
} from "./power-sources";
import {
  drawBreakerPoles,
  drawDifferentialBlock,
  drawMotorProtection,
  drawSurgeLimiter,
  drawThermalAux,
  drawThermalCon,
  drawThermalSingle,
  drawTripBlock,
} from "./protection";
import { drawAuxContact } from "./auxiliary-contacts";
import {
  drawIndicator,
  drawPushChangeover,
  drawPushPair,
  drawSelector,
  drawSingleActuated,
} from "./switches";
import { drawCoil, drawCoilVariant, drawLamp } from "./coils";
import { drawBistable, drawCounter, drawFlashingLamp, drawSignal } from "./signals";
import {
  drawAutotransformer,
  drawControlUnit,
  drawDcDrive,
  drawDrive,
  drawDriveControl,
  drawElectronicStarter,
  drawResistor,
  drawStepperController,
} from "./drives";
import { drawPhotoBarrier } from "./sensors";
import { drawDetector } from "./detectors";
import { drawRealistic2d } from "./realistic-2d";
import { drawPoles2d } from "./realistic-2d-poles";
import { drawPilotSimple } from "./realistic-2d-pilot";
import { drawDelayBlock2d } from "./realistic-2d-delay";
import { drawThermalRelay2d } from "./realistic-2d-thermal";
import { drawAuxBlock2d } from "./realistic-2d-aux";
import { drawMotor2d } from "./motor-2d";
import { drawLadder } from "./ladder";
import { drawLadderBlock } from "./ladder-blocks";
import { LADDER_EXTRA, PLC_BLOCK } from "@model/plc-blocks";
import { drawLogo } from "./logo-symbol";
import { drawS7 } from "./s7-1200-symbol";
import { drawMechanism } from "./mechanism-symbol";
import { drawDm8 } from "./dm8-symbol";
import { drawDinPowerSupply } from "./din-psu-symbol";
import { drawStairTimer } from "./stair-timer-symbol";
import { drawVfd2d, drawVfd2dMono } from "./vfd-2d-symbol";
import { drawGrafcet } from "./grafcet-symbol";
import { drawLift } from "./lift-symbol";
import { LIFT_TYPE } from "@model/lift";
import { GRAFCET_TYPES } from "@model/grafcet";
import { LOGO_DM8 } from "@model/plc-modules";
import { LADDER_COIL, LADDER_NC, LADDER_NO, LOGO_TYPE } from "@model/plc-types";
import {
  BREAKER_2D, CONTACTOR_2D, PUSHBUTTON_2D, REALISTIC_2D_ORIGIN_DX, isDelayBlock2d, isSimpleView,
} from "@model/realistic-2d-types";
import { drawColor2d } from "./realistic-2d-color";
import { drawSwitchSimple } from "./realistic-2d-switch";
import { drawTerminalSimple } from "./realistic-2d-terminal";
import { drawDelayBlockColor } from "./realistic-2d-color-delay";
import { DETECTOR_CODES, EMITTER_TYPE } from "@model/detector-types";
import { PHOTO_BARRIER_TYPE } from "@model/cad-types-sensors";
import { INK, NAME_COLOR, label, shape } from "./svg-primitives";

type BodyDrawer = (g: SVGGElement, element: SchemaElement, rotation: number) => void;

const BODY_DRAWERS = new Map<number, BodyDrawer>();

function register(types: readonly number[], draw: BodyDrawer): void {
  for (const type of types) BODY_DRAWERS.set(type, draw);
}

/**
 * Символы 2D нарисованы от клеммы 1, а позиция элемента — левый край корпуса (как в CADe_SIMU):
 * рисунок сдвигается вправо на REALISTIC_2D_ORIGIN_DX.
 */
function register2d(types: readonly number[], draw: BodyDrawer): void {
  for (const type of types) {
    BODY_DRAWERS.set(type, (g, element, rotation) => {
      const inner = shape("g", { transform: `translate(${REALISTIC_2D_ORIGIN_DX[type] ?? 0} 0)` });
      // Цветной вид по умолчанию, «Vista simple» в свойствах — линейный рисунок.
      if (isSimpleView(element)) draw(inner, element, rotation);
      else if (isDelayBlock2d(type)) drawDelayBlockColor(inner, element, rotation);
      else if (!drawColor2d(inner, element, rotation)) draw(inner, element, rotation);
      g.append(inner);
    });
  }
}

function drawText(g: SVGGElement, element: SchemaElement): void {
  const text = String(element.params.text ?? element.raw?.tail ?? "");
  const annotation = shape("text", {
    x: 0,
    y: 0,
    fill: NAME_COLOR,
    // Шрифт растёт с высотой рамки (text-tool.ts): 2.8 при обычной высоте 4.
    "font-size": 0.7 * (element.size.h || 4),
    "font-weight": 700,
    "font-family": "Arial, Helvetica, sans-serif",
  });
  annotation.textContent = text;
  g.append(annotation);
}

function drawContactors(g: SVGGElement, element: SchemaElement): void {
  const xs = columns(element);
  for (const x of xs) {
    g.append(contactColumn(x, rowGapOf(element), { control: "engine" }));
    if (element.typeCode === 2008) g.append(contactorMark(x));
  }
  g.append(linkBar(xs));
}

function drawContactorsWithActuator(g: SVGGElement, element: SchemaElement): void {
  const xs = columns(element);
  for (const x of xs) g.append(contactColumn(x, rowGapOf(element), { control: "engine" }));
  g.append(linkBar(xs));
  g.append(switchActuator(xs[0] ?? 0));
}

function drawStripBody(g: SVGGElement, element: SchemaElement): void {
  const names = element.terminals.some((terminal) => terminal.label)
    ? element.terminals.map((terminal) => terminal.label)
    : stripNames(element.terminals.length, element.typeCode);
  drawStrip(g, element, names);
}

function drawBreakerWithDifferential(g: SVGGElement, element: SchemaElement): void {
  drawBreakerPoles(g, element);
  drawDifferentialBlock(g, element);
}

function drawBreakerWithTrip(g: SVGGElement, element: SchemaElement): void {
  drawBreakerPoles(g, element);
  drawTripBlock(g, element);
}

function drawPush(g: SVGGElement, element: SchemaElement): void {
  drawSingleActuated(g, element, element.typeCode === 8001, "push");
}

function drawSeta(g: SVGGElement, element: SchemaElement): void {
  drawSingleActuated(g, element, element.typeCode === 8005, "seta");
}

function drawMaintained(g: SVGGElement, element: SchemaElement): void {
  drawSingleActuated(g, element, element.typeCode === 8009, "maintained");
}

function drawLimit(g: SVGGElement, element: SchemaElement): void {
  drawSingleActuated(g, element, element.typeCode === 8013, "limit");
}

function drawThermal(g: SVGGElement, element: SchemaElement): void {
  drawThermalSingle(g, element, element.typeCode === 8017);
}

function drawFallback(g: SVGGElement, element: SchemaElement, rotation: number): void {
  const { w, h } = element.size;
  g.append(
    shape("rect", {
      x: 0.8,
      y: 0.8,
      width: Math.max(2, w - 1.6),
      height: Math.max(2, h - 1.6),
      fill: "#fff",
      stroke: INK,
      "stroke-width": 0.7,
      "stroke-dasharray": "2 1",
      "vector-effect": "non-scaling-stroke",
    }),
  );
  g.append(
    label(String(element.typeCode), w / 2, h / 2, {
      size: 2.4,
      anchor: "middle",
      upright: rotation,
    }),
  );
}

register([8], drawText);
// Мотор 2D — тот же 1000/1001 с params.motor2d, рисунок цветной (motor-2d.ts).
register([1000, 1001], (g, element) =>
  (element.params.motor2d === true && !isSimpleView(element) ? drawMotor2d(g, element) : drawMotor(g, element)));
register([1002, 1003, 1004, 1005, 1008, 1010], drawMotor);
register([1006, 1007], drawDcMotor);
register([1011, 1012], drawStepper);
register([1009], drawBrake);
register([2000, 2001, 2002, 2006, 2008], drawContactors);
register([2003, 2004, 2005, 2007], drawContactorsWithActuator);
register([2009], drawInterlock);
register([3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010, 3011], drawStripBody);
register([3015], drawGround);
register([3012, 3017], drawTransformer);
register([3016], drawDiode);
register([3013], (g) => drawRectifier(g));
register([3014, 3018], drawPowerSupply);
register([3019], drawBattery);
register([3020], (g) => drawOutlet(g));
register([5000, 5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008, 5009], drawFuse);
register([6000, 6001, 6002, 6003, 6004], drawBreakerPoles);
register([6005, 6006], drawBreakerWithDifferential);
register([6008, 6009, 6010, 6011, 6012], drawBreakerWithTrip);
register([6013, 6014], drawSurgeLimiter);
register([6007], drawMotorProtection);
register(
  [7000, 7001, 7002, 7003, 7004, 7005, 7006, 7007, 7008, 7009, 7010, 7011, 7012, 7013, 7014, 7015],
  drawAuxContact,
);
register([8023], (g, element) => drawIndicator(g, element));
register([8000, 8001], drawPush);
register([8004, 8005], drawSeta);
register([8008, 8009], drawMaintained);
register([8012, 8013], drawLimit);
register([8002], (g, element) => drawPushPair(g, element, "push"));
register([8006], (g, element) => drawPushPair(g, element, "seta"));
register([8010], (g, element) => drawPushPair(g, element, "maintained"));
register([8014], (g, element) => drawPushPair(g, element, "limit"));
register([8003], (g, element) => drawPushChangeover(g, element));
register([8007], (g, element) => drawPushChangeover(g, element, "seta"));
register([8011], (g, element) => drawPushChangeover(g, element, "maintained"));
register([8015], (g, element) => drawPushChangeover(g, element, "limit"));
register([8018], drawThermalAux);
register([8016, 8017], drawThermal);
register([8019], drawThermalCon);
register([8020, 8021, 8022], drawSelector);
register([9000], (g, element) => drawCoil(g, element, false));
register([9004], (g, element, rotation) => drawCoil(g, element, true, rotation));
register([9008], drawLamp);
register([9001], drawBistable);
register([9002, 9003, 9005, 9006, 9007, 9014, 9015], drawCoilVariant);
register([9016], drawCounter);
register([9009], drawFlashingLamp);
register([9010, 9011, 9012, 9013], drawSignal);
register([1050, 1051], drawResistor);
register([1052], (g) => drawAutotransformer(g));
register([1053], drawElectronicStarter);
register([1062, 1063], drawControlUnit);
register([1054, 1055], drawDrive);
register([1056, 1061], drawDriveControl);
register([1065, 1066, 1067], drawStepperController);
register([1057, 1058, 1059, 1060], drawDcDrive);
register([PHOTO_BARRIER_TYPE], drawPhotoBarrier);
register([...DETECTOR_CODES, EMITTER_TYPE], drawDetector);
register2d([PUSHBUTTON_2D, CONTACTOR_2D, BREAKER_2D], drawRealistic2d);
register2d([6017, 60171, 60172, 6018, 60182], drawPoles2d);
register2d([7020, 7021], drawDelayBlock2d);
register2d([6016], drawThermalRelay2d);
register2d([7019], drawAuxBlock2d);
register2d([8101], drawPilotSimple);
register2d([6019, 6020, 60191, 60201], drawSwitchSimple);
register2d([4011], drawTerminalSimple);
register([LADDER_NO, LADDER_NC, LADDER_COIL, ...LADDER_EXTRA], drawLadder);
register(Object.values(PLC_BLOCK), drawLadderBlock);
register([LOGO_TYPE], drawLogo);
register([LOGO_DM8], drawDm8);
register([10220], drawDinPowerSupply);
register([8110], drawStairTimer);
register([10230], drawS7);
register([10240], drawVfd2d);
register([10241], drawVfd2dMono);
register([8120, 8121, 8122, 8123, 8124, 8125], drawMechanism);
register(GRAFCET_TYPES, drawGrafcet);
register([LIFT_TYPE], drawLift);

export function drawBody(g: SVGGElement, element: SchemaElement, rotation: number): void {
  (BODY_DRAWERS.get(element.typeCode) ?? drawFallback)(g, element, rotation);
}

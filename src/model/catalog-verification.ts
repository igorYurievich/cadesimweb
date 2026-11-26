import type { GroupKey } from './catalog';
import { catalog } from './catalog';

/** Mirrors the green verification badges shown in the component palette. */
export function hasVerifiedBadge(group: GroupKey, id: number): boolean {
  return group === 'fuses'
    || (group === 'power-sources' && ![32995, 33045, 33043, 32997, 33263].includes(id))
    || (group === 'power-electronics' && [33004, 33002, 33003, 33006, 33007, 33011].includes(id)) // автотрансформатор; резисторы I и III; преобразователь частоты II/III и его управление
    // 32831 Dahlander, 32994 две скорости (две обмотки), 33237 трёхфазный как однофазный (конденсатор V1–W1)
    || (group === 'motors' && [32828, 32829, 32830, 33103, 32831, 32994, 33237].includes(id))
    || group === 'manual-controls'
    || group === 'aux-contacts'
    // Механизмы (только веб, model/mechanisms.ts): все.
    || group === 'mechanisms'
    // Инсталляции (только веб, model/lift.ts): лифт на 5 этажей.
    || group === 'installations'
    || (group === 'coils-signaling' && [32949, 32952, 32953, 32954, 32957, 32958, 32959, 32960, 32961, 32962].includes(id))
    || group === 'contactors'
    || (group === 'protection' && id !== 33054 && id !== 33055)
    // Датчики: все, что размещаются, включая излучатель барьера 33027 (питание 1-2, луч для привязанного приёмника,
    // engine/photo-beam.ts) и фотодатчик Réflex 34013 (только веб, model/reflex-sensor.ts).
    || (group === 'sensors'
      && [33032, 33020, 33021, 33022, 33023, 33024, 33025, 33027, 33034, 33033, 34013].includes(id))
    // Символы 2D, уже сделанные: моторы, кнопка, контактор, дисюнтор, автомат, дифавтомат, блоки контактов, термореле,
    // Interruptor и Seccionador (33386, 33390), клемма «Borna» (33319), минутник Alst 8 (34002, только веб).
    || (group === 'realistic-2d' && [
      33311, 33393, 33317, 33318, 33338, 33339, 33352, 33354, 33380, 33381, 33382, 33340, 33386, 33390, 34002,
      34009, 34010, 33319,
    ].includes(id))
    // LOGO! (CADe_S1.cad), блок питания 24 V (34001, только веб), S7-1200 (33240, только веб) и Ladder (ladder.cad): контакты, фронты,
    // First Scan, катушки, блоки и шины «+» / «−».
    || (group === 'io-plc' && [33238, 33336, 34001, 33240].includes(id))
    // GRAFCET (только веб-логика, model/grafcet.ts): этапы, переход, действие, разветвления и слияния «O» / «Y»,
    // линия связи и таблица назначений (34011).
    || (group === 'grafcet' && [33088, 33083, 33084, 33085, 33094, 33095, 33086, 33093, 33092, 34011].includes(id))
    || (group === 'ladder' && [
      33062, 33063, 33065, 33066, 33291, 33067, 33069, 33070, 33100, 33111, 33099, 33300, 33112, 33114, 33226,
      33097, 33277, 32876, 32877,
    ].includes(id));
}

/** Counts unique catalog commands that show a green badge in at least one palette group. */
export function countVerifiedCatalogComponents(): number {
  return catalog.components.filter((item) => item.groups.some((group) => hasVerifiedBadge(group, item.id))).length;
}

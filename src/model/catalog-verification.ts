import type { GroupKey } from './catalog';
import { catalog } from './catalog';

/** Mirrors the green verification badges shown in the component palette. */
export function hasVerifiedBadge(group: GroupKey, id: number): boolean {
  return group === 'fuses'
    || (group === 'power-sources' && ![32995, 33045, 33043, 32997, 33263].includes(id))
    || (group === 'power-electronics' && id === 33004)
    || (group === 'motors' && [32828, 32829, 32830, 33103].includes(id))
    || (group === 'manual-controls' && id !== 33278)
    || group === 'aux-contacts'
    || (group === 'coils-signaling' && [32949, 32952, 32953, 32954, 32957, 32958, 32959, 32960, 32961, 32962].includes(id))
    || group === 'contactors'
    || (group === 'protection' && id !== 33054 && id !== 33055)
    // Датчики: все, что размещаются, кроме излучателя барьера 33027 (у него нет контакта).
    || (group === 'sensors' && [33032, 33020, 33021, 33022, 33023, 33024, 33025, 33034, 33033].includes(id))
    // Символы 2D, уже сделанные: моторы, кнопка, контактор, дисюнтор, автомат, дифавтомат, блоки контактов, термореле.
    || (group === 'realistic-2d' && [
      33311, 33393, 33317, 33318, 33338, 33339, 33352, 33354, 33380, 33381, 33382, 33340,
    ].includes(id))
    // LOGO! (CADe_S1.cad) и Ladder (ladder.cad): контакты, фронты, First Scan, катушки, блоки и шины «+» / «−».
    || (group === 'io-plc' && (id === 33238 || id === 33336))
    || (group === 'ladder' && [
      33062, 33063, 33065, 33066, 33291, 33067, 33069, 33070, 33100, 33111, 33099, 33300, 33112, 33114, 33226,
      33097, 33277, 32876, 32877,
    ].includes(id));
}

/** Counts unique catalog commands that show a green badge in at least one palette group. */
export function countVerifiedCatalogComponents(): number {
  return catalog.components.filter((item) => item.groups.some((group) => hasVerifiedBadge(group, item.id))).length;
}

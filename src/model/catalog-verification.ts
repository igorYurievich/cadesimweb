import type { GroupKey } from './catalog';
import { catalog } from './catalog';

/** Mirrors the green verification badges shown in the component palette. */
export function hasVerifiedBadge(group: GroupKey, id: number): boolean {
  return group === 'fuses'
    || (group === 'power-sources' && ![32995, 33045, 33043, 32997, 33263].includes(id))
    || (group === 'power-electronics' && id === 33004)
    || (group === 'motors' && [32828, 32829, 32830].includes(id))
    || group === 'manual-controls'
    || group === 'aux-contacts'
    || (group === 'coils-signaling' && [32949, 32952, 32953, 32954, 32957, 32958, 32959, 32960, 32961, 32962].includes(id))
    || (group === 'contactors' && id !== 33392)
    || (group === 'protection' && id !== 33054 && id !== 33055);
}

/** Counts unique catalog commands that show a green badge in at least one palette group. */
export function countVerifiedCatalogComponents(): number {
  return catalog.components.filter((item) => item.groups.some((group) => hasVerifiedBadge(group, item.id))).length;
}

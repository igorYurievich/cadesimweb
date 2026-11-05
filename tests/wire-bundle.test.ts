import { describe, expect, it } from 'vitest';
import { detectBundleLayout, offsetRoute, orthogonalize, simplifyRoute } from '../src/ui/wire-routing';
import { createEmptySchema } from '../src/model/types';

describe('трёхфазный пучок проводов', () => {
  it('строит параллельные маршруты с общим изломом', () => {
    const route = simplifyRoute(orthogonalize([{ x: 30, y: 30 }, { x: 90, y: 90 }]));
    expect(route).toEqual([{ x: 30, y: 30 }, { x: 90, y: 30 }, { x: 90, y: 90 }]);
    expect(offsetRoute(route, 6)).toEqual([{ x: 30, y: 36 }, { x: 84, y: 36 }, { x: 84, y: 90 }]);
  });
  it('угол можно задать вертикально-первым', () => {
    expect(orthogonalize([{ x: 0, y: 0 }, { x: 6, y: 9 }], true)).toEqual([{ x: 0, y: 0 }, { x: 0, y: 9 }, { x: 6, y: 9 }]);
  });
  it('без клемм берёт шаг 6 и правую сторону', () => {
    expect(detectBundleLayout([{ x: 0, y: 0 }, { x: 0, y: 30 }], createEmptySchema())).toEqual({ spacing: 6, side: 1 });
  });
});

import { describe, expect, it } from 'vitest';
import { createEmptySchema } from '@model/index';
import { activeWireKinds, buildBundleRoutes, routeInsideSheet } from '@ui/wire-planner';

describe('wire planning', () => {
  it('expands the bundled wire options into their conductors', () => {
    expect(activeWireKinds('three')).toEqual(['phase', 'phase', 'phase']);
    expect(activeWireKinds('threeN')).toEqual(['phase', 'phase', 'phase', 'neutral']);
    expect(activeWireKinds('neutral')).toEqual(['neutral']);
  });

  it('keeps a single wire route orthogonal and unchanged in kind', () => {
    const routes = buildBundleRoutes(
      [{ x: 10, y: 10 }, { x: 35, y: 24 }],
      'phase',
      createEmptySchema(),
      false,
      false,
    );
    expect(routes).toEqual([{
      route: [{ x: 10, y: 10 }, { x: 35, y: 10 }, { x: 35, y: 24 }],
      kind: 'phase',
    }]);
  });

  it('checks routes against the sheet bounds', () => {
    const schema = createEmptySchema();
    expect(routeInsideSheet([{ x: 0, y: 0 }, { x: schema.sheet.width, y: schema.sheet.height }], schema)).toBe(true);
    expect(routeInsideSheet([{ x: -1, y: 0 }], schema)).toBe(false);
  });
});

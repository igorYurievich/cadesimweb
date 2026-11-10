import { describe, expect, it } from 'vitest';
import { createWireRoutePreference } from '@ui/wire-route-preference';

describe('wire route preference', () => {
  it('chooses the first bend direction from the pointer movement', () => {
    const preference = createWireRoutePreference();
    preference.observePointer({ x: 10, y: 20 }, true, [{ x: 0, y: 0 }]);
    expect(preference.verticalFirst()).toBe(true);
    preference.observePointer({ x: 30, y: 10 }, true, [{ x: 0, y: 0 }]);
    expect(preference.verticalFirst()).toBe(true);
  });

  it('allows the direction choice to be toggled and reset for a new wire', () => {
    const preference = createWireRoutePreference();
    preference.toggleCorner();
    expect(preference.verticalFirst()).toBe(true);
    preference.reset();
    expect(preference.verticalFirst()).toBe(false);
  });

  it('keeps bundle side independent from bend direction resets', () => {
    const preference = createWireRoutePreference();
    preference.flipBundle();
    preference.reset();
    expect(preference.bundleFlipped()).toBe(true);
  });
});

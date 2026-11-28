import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { startsOpen } from '../src/ui/constants';

const css = readFileSync(new URL('../src/ui/viewport.css', import.meta.url), 'utf8');

/** Аппараты, чьи полюса рисуются контактами by-open (symbols/body.ts → drawBreakerPoles). */
const BY_OPEN_TYPES = [6000, 6001, 6002, 6003, 6004, 6005, 6006, 6008, 6009, 6010, 6011, 6012];

describe('protection: breakers drawn open in the editor', () => {
  it('outside simulation the by-open blades show the open position', () => {
    expect(css).toContain('.schematic-element:not(.is-sim-active) .contact.by-open .blade-closed { display: none; }');
    expect(css).toContain('.schematic-element:not(.is-sim-active) .contact.by-open .blade-open { display: inline; }');
  });

  it('every by-open device also starts open when the simulation begins', () => {
    for (const code of BY_OPEN_TYPES) expect(startsOpen(code)).toBe(true);
  });
});

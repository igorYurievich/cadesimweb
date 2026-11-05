import { describe, it, expect } from 'vitest';
import { allCadTypes, cadTypeForCommand, getCadType, isKnownCadType, missingCatalogIds, wireKindOf } from '@model/cad-types';

describe('cad-types: table', () => {
  it('every command id points to an element that exists in the catalog', () => {
    expect(missingCatalogIds()).toEqual([]);
  });

  it('type codes are unique', () => {
    const codes = allCadTypes().map((t) => t.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('a command id belongs to one type only', () => {
    const ids = allCadTypes().flatMap((t) => t.commandIds);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('confirmed types always have a catalog command', () => {
    for (const t of allCadTypes()) {
      if (t.confidence === 'confirmed') expect(t.commandIds.length).toBeGreaterThan(0);
    }
  });

  it('unknown confidence never carries a command id', () => {
    for (const t of allCadTypes()) {
      if (t.confidence === 'unknown') expect(t.commandIds).toHaveLength(0);
    }
  });
});

describe('cad-types: lookup', () => {
  it('maps a catalog command to the .cad type and back', () => {
    expect(cadTypeForCommand(32828)?.code).toBe(1000); // Motor trifásico
    expect(cadTypeForCommand(32957)?.code).toBe(9008); // Piloto señalización
    expect(cadTypeForCommand(999999)).toBe(undefined);
  });

  it('gives a fallback for a code that is not in the table', () => {
    expect(isKnownCadType(9999)).toBe(false);
    const t = getCadType(9999);
    expect(t.family).toBe('unknown');
    expect(t.layout.kind).toBe('rows');
  });

  it('classifies wire codes', () => {
    expect(wireKindOf(4000)).toBe('phase');
    expect(wireKindOf(4009)).toBe('neutral');
    expect(wireKindOf(4010)).toBe('protection');
    expect(wireKindOf(4001)).toBe('junction');
    expect(wireKindOf(1000)).toBe(undefined);
  });
});

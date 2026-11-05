import { describe, it, expect } from 'vitest';
import { catalog, buildCatalog, normalizeText } from '@model/catalog';

describe('catalog: data integrity', () => {
  it('matches the numbers extracted from the original exe', () => {
    expect(catalog.groups).toHaveLength(19);
    expect(catalog.slotCount).toBe(328);
    expect(catalog.components).toHaveLength(309);
  });

  it('every group lists only ids that exist in the catalog', () => {
    for (const g of catalog.groups) {
      for (const id of g.componentIds) {
        expect(catalog.getById(id)).toBeDefined();
      }
    }
  });

  it('every component belongs to at least one group', () => {
    for (const c of catalog.components) {
      expect(c.groups.length).toBeGreaterThan(0);
    }
  });
});

describe('catalog: lookup', () => {
  it('finds the three-phase motor by command id', () => {
    const m = catalog.getById(32828);
    expect(m).toBeDefined();
    expect(m?.groups[0]).toBe('motors');
    expect(catalog.label(m!, 'en')).toBe('Three-phase motor');
  });

  it('keeps group order of the original toolbar', () => {
    const motors = catalog.inGroup('motors');
    expect(motors).toHaveLength(14);
    expect(motors[0]?.id).toBe(32828);
  });

  it('merges a command id that appears in several toolbars', () => {
    // 33035 "Cable positivo" aparece en Lógica, Ladder y Cables
    const c = catalog.getById(33035);
    expect(c?.groups).toEqual(['logic', 'ladder', 'wiring']);
    // 32889 "Conexión" aparece en Lógica y Cables
    expect(catalog.getById(32889)?.groups).toEqual(['logic', 'wiring']);
  });

  it('inGroup does not repeat an id', () => {
    for (const g of catalog.groups) {
      const ids = catalog.inGroup(g.key).map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('catalog: labels', () => {
  it('falls back to Spanish when a translation is missing', () => {
    const c = catalog.getById(33262); // sin traducción EN/IT
    expect(c?.names.en).toBe(null);
    expect(catalog.label(c!, 'en')).toBe('Control inversor electrónico c.a..');
  });

  it('falls back to English when Spanish is missing', () => {
    const c = catalog.getById(33226); // es = null
    expect(c?.names.es).toBe(null);
    expect(catalog.label(c!, 'es')).toBe('Pulse Generator');
  });

  it('falls back to the id when there are no names at all', () => {
    const empty = buildCatalog({
      groups: [{ name: 'Motores', toolbar: 173, items: [[1, null, null, null]] }],
    });
    expect(empty.label(empty.getById(1)!, 'es')).toBe('1');
  });
});

describe('catalog: search', () => {
  it('ignores case and accents', () => {
    const a = catalog.search('relé térmico').map((c) => c.id);
    const b = catalog.search('RELE TERMICO').map((c) => c.id);
    expect(a.length).toBeGreaterThan(0);
    expect(b).toEqual(a);
  });

  it('searches across languages', () => {
    const ids = catalog.search('thermal relay').map((c) => c.id);
    expect(ids).toContain(32865);
  });

  it('returns nothing for an empty query', () => {
    expect(catalog.search('   ')).toHaveLength(0);
  });

  it('normalizeText strips diacritics', () => {
    expect(normalizeText('Alimentación  Protección')).toBe('alimentacion proteccion');
  });
});

describe('catalog: release split', () => {
  it('puts Ladder and Logic in v2 (confirmed by the author)', () => {
    expect(catalog.getGroup('ladder')?.release).toBe('v2');
    expect(catalog.getGroup('logic')?.release).toBe('v2');
    // elemento exclusivo de Ladder
    expect(catalog.getById(33062)?.release).toBe('v2'); // NA (ladder)
  });

  it('keeps core power and control devices in v1', () => {
    for (const id of [32828, 32833, 32949, 32865, 32909, 32957]) {
      expect(catalog.getById(id)?.release).toBe('v1');
    }
  });

  it('an id shared with the wiring group stays in v1', () => {
    expect(catalog.getById(33035)?.release).toBe('v1');
  });

  it('applies per-component overrides', () => {
    expect(catalog.getById(33002)?.release).toBe('v1'); // Resistencia I
    expect(catalog.getById(33295)?.release).toBe('v2'); // paso a paso unipolar
  });

  it('v1 and v2 partition the whole catalog', () => {
    const v1 = catalog.byRelease('v1').length;
    const v2 = catalog.byRelease('v2').length;
    expect(v1 + v2).toBe(catalog.components.length);
  });
});

describe('catalog: errors', () => {
  it('rejects an unknown group name', () => {
    expect(() =>
      buildCatalog({ groups: [{ name: 'Grupo inventado', toolbar: 1, items: [] }] }),
    ).toThrow();
  });
});

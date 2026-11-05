import { describe, expect, it } from 'vitest';
import { createEngineInput, simulate } from '../src/engine';
import { parseCad, serializeCad } from '../src/model/cad-format';
import { importCad as importSchema } from '../src/model/cad-import';
import { fixture } from './helpers';

describe('engine robustness on imported CAD (5.8c)', () => {
  it('keeps an unknown CAD type, reports it, and does not throw', () => {
    const parsed = parseCad(fixture('a1_1_1.cad'));
    const firstKnownElement = parsed.records.find((record) => record.type === 1000);
    expect(firstKnownElement).toBeDefined();
    if (!firstKnownElement) return;
    firstKnownElement.type = 99999;

    const imported = importSchema(serializeCad(parsed));
    expect(imported.unknownTypes).toContain(99999);
    const state = simulate(createEngineInput(imported.schema));
    expect(state.warnings.some((warning) => warning.includes('unknown-type'))).toBe(true);
  });

  it('imports and simulates a truncated CAD file without throwing', () => {
    const truncatedText = fixture('a1_5.cad').slice(0, 500);
    const imported = importSchema(truncatedText);
    expect(imported.warnings.length).toBeGreaterThan(0);
    expect(() => simulate(createEngineInput(imported.schema))).not.toThrow();
  });
});

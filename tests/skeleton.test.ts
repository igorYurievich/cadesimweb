import { describe, it, expect } from 'vitest';
import { createEmptySchema } from '@model/index';
import { createInitialState } from '@engine/index';

describe('skeleton', () => {
  it('empty schema has author and no elements', () => {
    const s = createEmptySchema();
    expect(s.formatVersion).toBe(1);
    expect(s.elements).toHaveLength(0);
    expect(s.sheet.author).toBe('IGOR LIPSKIY');
  });

  it('initial sim state is edit mode at t=0', () => {
    const st = createInitialState();
    expect(st.mode).toBe('edit');
    expect(st.time).toBe(0);
  });
});

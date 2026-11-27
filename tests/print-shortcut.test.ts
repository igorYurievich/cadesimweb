import { describe, expect, it } from 'vitest';
import { isPrintShortcut } from '../src/ui/keyboard-shortcuts';

const key = (code: string, mods: Partial<Record<'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey', boolean>> = {}) =>
  ({ code, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...mods });

describe('Ctrl+P — печать схемы', () => {
  it('срабатывает на Ctrl+P и Cmd+P в любой раскладке (по коду клавиши)', () => {
    expect(isPrintShortcut(key('KeyP', { ctrlKey: true }))).toBe(true);
    expect(isPrintShortcut(key('KeyP', { metaKey: true }))).toBe(true);
  });

  it('не срабатывает без Ctrl, с Shift/Alt и на других клавишах', () => {
    expect(isPrintShortcut(key('KeyP'))).toBe(false);
    expect(isPrintShortcut(key('KeyP', { ctrlKey: true, shiftKey: true }))).toBe(false);
    expect(isPrintShortcut(key('KeyP', { ctrlKey: true, altKey: true }))).toBe(false);
    expect(isPrintShortcut(key('KeyS', { ctrlKey: true }))).toBe(false);
  });
});

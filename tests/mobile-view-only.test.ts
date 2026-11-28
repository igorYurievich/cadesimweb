import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/ui/viewport.css', import.meta.url), 'utf8');

/** Правило (селекторы + тело), в списке селекторов которого есть данный селектор. */
function ruleWith(selector: string): { selectors: string[]; body: string } {
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = plain.matchAll(/([^{}]+)\{([^{}]*)\}/g);
  for (const [, head, body] of rules) {
    const selectors = head.split(',').map((part) => part.trim());
    if (selectors.includes(selector)) return { selectors, body };
  }
  throw new Error(`no rule for ${selector}`);
}

/** На телефоне (mobile.ts ставит data-mobile) — только просмотр, симуляция и экспорт. */
const HIDDEN_ON_PHONE = [
  '.palette-toggle',
  '.component-palette',
  '.properties-panel',
  '.wire-controls',
  '.document-tab-add',
  '#fullscreen-toggle',
  '.menu-command[data-command="new"]',
  '.menu-command[data-command="fit"]',
].map((selector) => `#app[data-mobile="true"] ${selector}`);

describe('mobile: view-only layout', () => {
  it('editor panels are hidden on the phone', () => {
    for (const selector of HIDDEN_ON_PHONE) {
      expect(ruleWith(selector).body.replace(/\s+/g, ' ')).toContain('display: none !important');
    }
  });

  it('the hide list is not glued to the workspace layout rule', () => {
    const rule = ruleWith('#app[data-mobile="true"] .editor-workspace');
    expect(rule.selectors).toEqual(['#app[data-mobile="true"] .editor-workspace']);
  });

  it('hiding applies only in mobile mode, never on desktop', () => {
    const rule = ruleWith('#app[data-mobile="true"] .component-palette');
    for (const selector of rule.selectors) expect(selector.startsWith('#app[data-mobile="true"] ')).toBe(true);
  });
});

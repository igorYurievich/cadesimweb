import { afterEach, describe, expect, it, vi } from 'vitest';
import { safeFileName, saveTextFile } from '../src/ui/save-file';

describe('сохранение файла с выбором имени', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('чистит имя, введённое пользователем, и ставит нужное расширение', () => {
    expect(safeFileName('Mi esquema', 'Esquema', '.json')).toBe('Mi esquema.json');
    expect(safeFileName('  Mi esquema.JSON ', 'Esquema', '.json')).toBe('Mi esquema.json');
    expect(safeFileName('a/b:c', 'Esquema', '.cad')).toBe('a_b_c.cad');
    expect(safeFileName('   ', 'Esquema', '.json')).toBe('Esquema.json');
    expect(safeFileName('motor.cad', 'Esquema', '.json')).toBe('motor.cad.json');
  });

  it('пишет через диалог «Сохранить как» и возвращает выбранное имя', async () => {
    const written: string[] = [];
    const picker = vi.fn(async () => ({
      name: 'Otro nombre.json',
      createWritable: async () => ({ write: async (data: string) => { written.push(data); }, close: async () => {} }),
    }));
    vi.stubGlobal('window', { showSaveFilePicker: picker });
    const name = await saveTextFile('{"a":1}', { baseName: 'Esquema', extension: '.json', description: 'JSON', mime: 'application/json' });
    expect(name).toBe('Otro nombre.json');
    expect(written).toEqual(['{"a":1}']);
    expect(picker).toHaveBeenCalledWith({
      suggestedName: 'Esquema.json',
      types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
    });
  });

  it('отмена диалога — не ошибка, а null', async () => {
    vi.stubGlobal('window', { showSaveFilePicker: async () => { throw new DOMException('cancel', 'AbortError'); } });
    const name = await saveTextFile('x', { baseName: 'Esquema', extension: '.json', description: 'JSON', mime: 'application/json' });
    expect(name).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { EXAMPLES, EXAMPLE_FOLDERS, MOTORS_FOLDER } from '../src/data/examples';
import { EXAMPLE_FOLDER_TRANSLATIONS, EXAMPLE_TITLE_TRANSLATIONS } from '../src/data/example-titles';

// Окно «Примеры»: раздел «Motores» вместо старого «Ejemplos».

describe('примеры: раздел «Motores»', () => {
  const motors = EXAMPLES.filter((example) => example.folder === MOTORS_FOLDER);

  it('идёт вторым, сразу после примеров автора; старого раздела «Ejemplos» нет', () => {
    expect(EXAMPLE_FOLDERS[1]).toBe(MOTORS_FOLDER);
    expect(EXAMPLE_FOLDERS).not.toContain('Ejemplos');
    expect(EXAMPLES.some((example) => example.folder === 'Ejemplos')).toBe(false);
    expect(Object.keys(EXAMPLE_FOLDER_TRANSLATIONS[MOTORS_FOLDER] ?? {})).toHaveLength(5);
  });

  it('десять схем JSON по порядку номеров, за ними две .cad; у каждой название на всех языках', () => {
    const numbers = motors.map((example) => example.file.slice(0, 2));
    expect(numbers).toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', 'Ej', 'Ej']);
    expect(motors.slice(10).map((example) => example.file)).toEqual(['Ejemplo 2.4.cad', 'Ejemplo 2.8.cad']);
    for (const example of motors) {
      // По расширению document-io.ts решает, открывать файл как JSON или как .cad.
      expect(example.fileName.split('.').pop()).toBe(example.file.split('.').pop());
      expect(Object.keys(EXAMPLE_TITLE_TRANSLATIONS[example.file] ?? {})).toHaveLength(5);
    }
  });

  it('«Iluminación de escalera a 4 hilos (moderno)» в разделе автора — новая схема JSON', () => {
    const stair = EXAMPLES.find((example) => example.file === 'Iluminacion_escalera_4_hilos_(moderno).json');
    expect(stair?.fileName).toMatch(/\.json$/);
    expect(EXAMPLES.some((example) => example.file === 'Arranque_estrella_triangulo_2D.cad')).toBe(false);
  });

  it('текст схемы скачивается по запросу', async () => {
    const text = await motors[0]!.load();
    expect(JSON.parse(text).formatVersion).toBe(1);
  });
});

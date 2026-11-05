import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Читает образец .cad из tests/fixtures (тесты запускаются из корня проекта). */
export function fixture(name: string): string {
  return readFileSync(resolve(process.cwd(), 'tests/fixtures', name), 'utf8');
}

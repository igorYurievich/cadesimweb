import { describe, expect, it } from 'vitest';
import { catalog, loadCatalogTranslations } from '@model/catalog';
import { GRAFCET } from '@model/grafcet';
import { LIFT_TYPE } from '@model/lift';
import { LOGO_TYPE } from '@model/plc-types';
import { createEmptySchema } from '@model/index';
import type { SchemaElement } from '@model/types';
import { EXAMPLES } from '../src/data/examples';
import { interfaceText, loadInterfaceText } from '../src/ui/i18n';
import { featureOfType } from '../src/ui/features/feature-codes';
import { ensureSchemaFeatures, isFeatureLoaded, onFeatureLoaded } from '../src/ui/features/loader';

// Части программы, вынесенные из стартовой загрузки: примеры, языки, ПЛК / GRAFCET / лифт, переводы каталога.

describe('ленивые куски сборки', () => {
  it('примеры: в списке все файлы, текст .cad скачивается по запросу', async () => {
    expect(EXAMPLES.length).toBeGreaterThan(20);
    const lift = EXAMPLES.find((example) => example.file === 'Ascensor_5_plantas_con_variador.cad');
    expect(lift).toBeDefined();
    const text = await lift!.load();
    expect(text.length).toBeGreaterThan(1000);
    expect(new Set(EXAMPLES.map((example) => example.number)).size).toBe(EXAMPLES.length);
  });

  it('языки: тексты есть только после загрузки, неизвестный код — испанский', async () => {
    const ru = await loadInterfaceText('ru');
    expect(ru.file).toBe('Файл');
    expect(interfaceText('ru')).toBe(ru);
    const es = await loadInterfaceText('xx');
    expect(es.file).toBe('Archivo');
    // Язык ещё не скачан: временно — уже скачанный испанский, чтобы интерфейс не падал.
    expect(interfaceText('it').file).toBe('Archivo');
    expect((await loadInterfaceText('it')).file).toBe('File');
  });

  it('ПЛК / GRAFCET / лифт: части скачиваются по элементам схемы', async () => {
    expect(featureOfType(LOGO_TYPE)).toBe('plc');
    expect(featureOfType(GRAFCET.step)).toBe('grafcet');
    expect(featureOfType(LIFT_TYPE)).toBe('lift');
    expect(featureOfType(3000)).toBeUndefined();
    const schema = createEmptySchema();
    schema.elements.push({ typeCode: LOGO_TYPE } as SchemaElement, { typeCode: LIFT_TYPE } as SchemaElement);
    const loadedKeys: string[] = [];
    const stop = onFeatureLoaded((key) => loadedKeys.push(key));
    await ensureSchemaFeatures(schema);
    stop();
    expect(isFeatureLoaded('plc')).toBe(true);
    expect(isFeatureLoaded('lift')).toBe(true);
    expect(isFeatureLoaded('grafcet')).toBe(false);
    expect(loadedKeys.sort()).toEqual(['lift', 'plc']);
  });

  it('названия элементов на fr: после загрузки словаря, до этого — испанские', async () => {
    const def = catalog.getById(33025)!;
    expect(catalog.label(def, 'es')).toBe('Detector de barrera fotoeléctrico');
    await loadCatalogTranslations('fr');
    expect(catalog.label(def, 'fr')).toBe('Détecteur à barrière photoélectrique');
  });
});

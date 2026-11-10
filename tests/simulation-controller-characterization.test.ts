import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';
import { importCad } from '../src/model/cad-import';
import type { Schema } from '../src/model/types';
import { setupSimulation } from '../src/ui/sim-controller';
import type { AppContext } from '../src/ui/context';
import { INTERFACE_TEXT } from '../src/ui/i18n';

type ScenarioTrace = [string, unknown[]];

class FakeStyle {
  readonly properties = new Map<string, string>();
  filter = '';
  setProperty(name: string, value: string): void { this.properties.set(name, value); }
  removeProperty(name: string): void { this.properties.delete(name); }
}

class FakeNode {
  readonly attributes = new Map<string, string>();
  readonly classes = new Set<string>();
  readonly style = new FakeStyle();
  readonly children = new Map<string, FakeNode>();
  readonly dataset: Record<string, string> = {};
  textContent = '';
  hidden = false;
  disabled = false;

  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  removeAttribute(name: string): void { this.attributes.delete(name); }
  querySelector<T extends Element>(selector: string): T | null {
    const timer = selector === '.timer-readout' ? this.children.get('timer-readout') : undefined;
    const match = selector.match(/\[data-(?:wire|element)-id="(\d+)"\]/);
    const found = timer ?? (match ? this.children.get(match[1]!) : undefined);
    return (found as unknown as T | undefined) ?? null;
  }
  get classList() {
    return {
      toggle: (name: string, active?: boolean): boolean => {
        const next = active ?? !this.classes.has(name);
        if (next) this.classes.add(name);
        else this.classes.delete(name);
        return next;
      },
    };
  }
  getBoundingClientRect(): DOMRect { return { width: 120, height: 40 } as DOMRect; }
  remove(): void { /* Узел-заглушка не включён в дерево. */ }
}

function layer(schema: Schema, field: 'wires' | 'elements'): FakeNode {
  const root = new FakeNode();
  const values = schema[field];
  for (const value of values) {
    const node = new FakeNode();
    if (field === 'elements' && 'typeCode' in value && [9004, 9005, 9006].includes(value.typeCode)) {
      node.children.set('timer-readout', new FakeNode());
    }
    root.children.set(String(value.id), node);
  }
  root.querySelector = function <T extends Element>(selector: string): T | null {
    const match = selector.match(/\[data-(?:wire|element)-id="(\d+)"\]/);
    const found = match ? this.children.get(match[1]!) : undefined;
    return (found as unknown as T | undefined) ?? null;
  };
  return root;
}

interface SimulationHarness {
  schema: Schema;
  wireLayer: FakeNode;
  elementLayer: FakeNode;
  message: FakeNode;
  messageText: FakeNode;
  stateValue: FakeNode;
  status: FakeNode;
  simulation: ReturnType<typeof setupSimulation>;
  callbacks: Map<number, FrameRequestCallback>;
  renderCount(): number;
}

function createHarness(schema: Schema): SimulationHarness {
  const callbacks = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = ++nextFrame;
    callbacks.set(id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { callbacks.delete(id); });
  const wireLayer = layer(schema, 'wires');
  const elementLayer = layer(schema, 'elements');
  const message = new FakeNode();
  const messageText = new FakeNode();
  const stateValue = new FakeNode();
  const status = new FakeNode();
  const menu = new FakeNode();
  const overload = new FakeNode();
  let renderCount = 0;
  const ctx = { schema } as AppContext;
  const simulation = setupSimulation(ctx, {
    wireLayer: wireLayer as unknown as SVGGElement,
    elementLayer: elementLayer as unknown as SVGGElement,
    simulationMessage: message as unknown as HTMLElement,
    simulationMessageText: messageText as unknown as HTMLElement,
    runButton: new FakeNode() as unknown as HTMLButtonElement,
    stopButton: new FakeNode() as unknown as HTMLButtonElement,
    simStateValue: stateValue as unknown as HTMLElement,
    simulationContextMenu: menu as unknown as HTMLElement,
    overloadAction: overload as unknown as HTMLButtonElement,
    status: status as unknown as HTMLElement,
    uiText: () => INTERFACE_TEXT.ru,
    renderSchema: () => { renderCount += 1; },
    uniformWireColors: () => false,
    clearSelection: () => undefined,
  });

  return {
    schema, wireLayer, elementLayer, message, messageText, stateValue, status, simulation, callbacks,
    renderCount: () => renderCount,
  };
}

function snapshot(harness: SimulationHarness, name: string): unknown {
  const { schema, wireLayer, elementLayer } = harness;
  return {
    name,
    wires: schema.wires.map((wire) => {
      const node = wireLayer.children.get(String(wire.id))!;
      return [wire.id, [...node.classes].sort(), [...node.attributes].sort(), node.style.filter];
    }),
    elements: schema.elements.map((element) => {
      const node = elementLayer.children.get(String(element.id))!;
      const readout = node.children.get('timer-readout');
      return [element.id, [...node.classes].sort(), [...node.attributes].sort(),
        [...node.style.properties].sort(), readout?.textContent ?? ''];
    }),
    message: [harness.message.hidden, harness.messageText.textContent],
    state: [harness.stateValue.textContent, [...harness.stateValue.attributes].sort()],
    status: harness.status.textContent,
    renderCount: harness.renderCount(),
    pendingFrames: harness.callbacks.size,
  };
}

function runScenario(harness: SimulationHarness): unknown[] {
  const { schema, simulation, callbacks } = harness;
  simulation.rebuildWireTerminalMap();
  simulation.startSimulation();
  const trace = [snapshot(harness, 'start')];
  for (const time of [0, 125, 500]) {
    const [id, callback] = [...callbacks.entries()][0]!;
    callbacks.delete(id);
    callback(time);
    trace.push(snapshot(harness, `tick-${time}`));
  }
  const button = schema.elements.find((element) => simulation.isMomentaryType(element.typeCode));
  if (button) {
    simulation.pressMomentary(button.id);
    trace.push(snapshot(harness, 'press'));
    simulation.releaseMomentary(button.id);
    trace.push(snapshot(harness, 'release'));
  }
  const thermal = schema.elements.find((element) => element.typeCode === 6007);
  if (thermal) {
    simulation.simulateOverload(thermal.id);
    trace.push(snapshot(harness, 'overload'));
  }
  simulation.stopSimulation();
  trace.push(snapshot(harness, 'stop'));
  vi.unstubAllGlobals();
  return trace;
}

function capture(schema: Schema): unknown[] {
  return runScenario(createHarness(schema));
}

function digest(value: unknown): string {
  const text = JSON.stringify(value);
  if (text === undefined) throw new Error('Trace value cannot be serialized.');
  return createHash('sha256').update(text).digest('hex');
}

function scenarioFingerprints(scenarios: ScenarioTrace[]): Array<[string, string[]]> {
  return scenarios.map(([name, stages]) => [name, stages.map((stage) => digest(stage))]);
}

describe('simulation controller behavior characterization', () => {
  it('matches the pre-refactor UI trace for representative examples', () => {
    const examples = [
      ['Ejemplo 10', '../src/data/examples/Ejemplos/Ejemplo 10.cad'],
      ['Ejemplo 9', '../src/data/examples/Ejemplos/Ejemplo 9.cad'],
      ['Ejemplo 2.5', '../src/data/examples/Ejemplos 2/Ejemplo 2.5.cad'],
      ['self-locking and thermal relay', '../src/data/examples/Ejemplos/Ejemplo 9.cad'],
      ['timer', '../src/data/examples/Ejemplos 2/Ejemplo 2.7.cad'],
    ] as const;
    const trace: ScenarioTrace[] = examples.map(([name, path]) => {
      const cad = readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
      return [name, capture(importCad(cad).schema)];
    });
    const baselineFile = fileURLToPath(new URL(
      './fixtures/simulation-controller-characterization.json.gz',
      import.meta.url,
    ));
    const baselineText = gunzipSync(readFileSync(baselineFile)).toString('utf8');
    const baseline = JSON.parse(baselineText) as ScenarioTrace[];
    expect(scenarioFingerprints(trace)).toEqual(scenarioFingerprints(baseline));
  });
});

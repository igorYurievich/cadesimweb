import { createEmptyInputs, createEmptyMemory, simulate } from '@engine/simulate';
import { terminalKey } from '@engine/types';
import type { EngineMemory, EngineState, PotentialLabel, TerminalKey, UserInputs } from '@engine/types';
import { POSITION_SPECS, currentPosition, getBehavior } from '@engine/behaviors';
import { auxContactActive, auxContactActuatorActive } from '@engine/switching';
import { resolveThermalState } from '@engine/thermal';
import { buildWireLinks, pointOnSegment } from '@engine/wire-links';
import { terminalPosition } from '@model/geometry';
import type { AppContext } from './context';
import { armedByDefaultTypes, CONFLICT_COLOR, IDLE_WIRE_COLORS, latchedTypes, PHASE_LABELS, POTENTIAL_COLORS, POTENTIAL_ORDER, startsOpen, UNIFORM_LIVE_COLOR } from './constants';
import type { InterfaceText } from './i18n';

export interface SimulationController {
  readonly mode: 'edit' | 'run';
  speed: number;
  readonly inputs: UserInputs;
  readonly heldInputs: Set<number>;
  contextElementId: number | undefined;
  isMomentaryType(typeCode: number): boolean;
  isMaintainedType(typeCode: number): boolean;
  isTrippableType(typeCode: number): boolean;
  rebuildWireTerminalMap(): void;
  applySimulationInput(): void;
  updateSimulationControls(): void;
  applySimulationVisuals(): void;
  resetSimulation(): void;
  evaluateSimulation(): void;
  startSimulation(): void;
  stopSimulation(): void;
  pressMomentary(id: number): void;
  releaseMomentary(id: number): void;
  resetSimulationInputs(): void;
  simulateOverload(id: number): void;
  showSimulationContextMenu(event: MouseEvent, elementId?: number): void;
}

export function setupSimulationSpeedControl(button: HTMLButtonElement, simulation: SimulationController): void {
  const speedLevels = [1, 1.25, 1.5, 2, 0.25, 0.5];
  const updateSpeedButton = (): void => {
    const label = `${simulation.speed}×`;
    button.textContent = label;
    button.setAttribute('aria-label', `Скорость симуляции: ${label}`);
  };
  button.addEventListener('click', () => {
    const currentIndex = speedLevels.indexOf(simulation.speed);
    simulation.speed = speedLevels[(currentIndex + 1) % speedLevels.length]!;
    updateSpeedButton();
  });
}

export interface SimulationSetup {
  wireLayer: SVGGElement; elementLayer: SVGGElement; simulationMessage: HTMLElement;
  runButton: HTMLButtonElement; stopButton: HTMLButtonElement; simStateValue: HTMLElement;
  simulationContextMenu: HTMLElement; overloadAction: HTMLButtonElement; status: HTMLElement;
  uiText(): InterfaceText; renderSchema(): void; uniformWireColors(): boolean;
  clearSelection(): void;
}

export function setupSimulation(ctx: AppContext, deps: SimulationSetup): SimulationController {
  let simMode: 'edit' | 'run' = 'edit';
  let simTime = 0;
  let simSpeed = 1;
  let simMemory: EngineMemory = createEmptyMemory();
  /** Пустые входы: автоматы и выключатели по умолчанию ВЫКЛЮЧЕНЫ (включает пользователь кликом), тепловая защита 6007 взведена. */
  const createSimInputs = (): UserInputs => {
    const inputs = createEmptyInputs();
    inputs.positions = {};  // положения Conmutador: нет записи = позиция покоя
    for (const element of ctx.schema.elements) if (startsOpen(element.typeCode)) inputs.toggled[element.id] = false;
    return inputs;
  };
  let simInputs: UserInputs = createEmptyInputs();
  let simResult: EngineState | undefined;
  let lastFrameTime: number | undefined;
  let animationFrame: number | undefined;
  const heldInputs = new Set<number>();
  let contextElementId: number | undefined;
  const motorStartTimes = new Map<number, number>();
  let wireGroupOf = new Map<number, number>();
  let wireTerminalKeys = new Map<number, Set<TerminalKey>>();

  const rebuildWireTerminalMap = (): void => {
    const links = buildWireLinks(ctx.schema.wires);
    wireGroupOf = links.groupOf;
    wireTerminalKeys = new Map();
    for (const group of links.groupOf.values()) if (!wireTerminalKeys.has(group)) wireTerminalKeys.set(group, new Set<TerminalKey>());
    for (const element of ctx.schema.elements) {
      element.terminals.forEach((_, index) => {
        const point = terminalPosition(element, index);
        if (!point) return;
        const key = terminalKey(element.id, index);
        for (const wire of ctx.schema.wires) {
          if (!pointOnSegment(point, wire.from, wire.to)) continue;
          const group = links.groupOf.get(wire.id);
          if (group !== undefined) wireTerminalKeys.get(group)?.add(key);
        }
      });
    }
  };
  const applySimulationVisuals = (): void => {
    const result = simResult;
    const thermalState = resolveThermalState(ctx.schema, simInputs);
    const nets = new Map((result?.nets ?? []).map((net) => [net.id, net] as const));
    const motorCurrentGroups = new Set<number>();
    const autotransformerCurrentGroups = new Set<number>();
    if (result) {
      const parent = new Map(result.nets.map((net) => [net.id, net.id] as const));
      const root = (id: number): number => {
        let current = id;
        while (parent.get(current) !== undefined && parent.get(current) !== current) current = parent.get(current)!;
        return current;
      };
      const join = (a: number, b: number): void => { const ra = root(a); const rb = root(b); if (ra !== rb) parent.set(ra, rb); };
      // Главный трёхполюсный контактор замыкает каждую пару клемм синхронно.
      for (const contactor of ctx.schema.elements) {
        if (contactor.typeCode !== 2001 || !result.contacts[contactor.id]) continue;
        for (const link of getBehavior(contactor.typeCode).links) {
          if (link.kind !== 'switch') continue;
          const [a, b] = link.terminals;
          const na = result.terminalNet[terminalKey(contactor.id, a!)];
          const nb = result.terminalNet[terminalKey(contactor.id, b!)];
          if (na !== undefined && nb !== undefined) join(na, nb);
        }
      }
      // У работающего двигателя метки потенциалов не переходят через обмотки.
      // Для отображения тока продолжаем цветовой путь через замкнутые полюса
      // тепловых реле (например, от U2/V2/W2 к входам контактора K2).
      for (const relay of ctx.schema.elements) {
        if (relay.typeCode !== 6007 || !result.contacts[relay.id] || result.tripped[relay.id]) continue;
        for (const link of getBehavior(relay.typeCode).links) {
          if (link.kind !== 'switch') continue;
          const [a, b] = link.terminals;
          const na = result.terminalNet[terminalKey(relay.id, a!)];
          const nb = result.terminalNet[terminalKey(relay.id, b!)];
          if (na !== undefined && nb !== undefined) join(na, nb);
        }
      }
      for (const motor of ctx.schema.elements) {
        if (motor.typeCode !== 1001 || !result.motors[motor.id]?.running) continue;
        // У мотора Y/Δ ток протекает через обмотки, но движок не переносит
        // потенциал между верхними и нижними клеммами. Поэтому отдельно
        // подсвечиваем подключённые к U2/V2/W2 провода, если в их сети нет метки.
        const bottomTerminalNets = new Set([4, 5, 6]
          .map((index) => result.terminalNet[terminalKey(motor.id, index)])
          .filter((id): id is number => id !== undefined));
        for (const [group, keys] of wireTerminalKeys) {
          if ([...keys].some((key) => {
            const netId = result.terminalNet[key];
            return netId !== undefined && bottomTerminalNets.has(netId) && !(nets.get(netId)?.potentials.length);
          })) motorCurrentGroups.add(group);
        }
        // В звезде W2/U2/V2 и звёздная перемычка соединены замкнутыми KM3,
        // но эта плавающая точка не имеет метки фазы.
        const bottomNets = [5, 6, 4].map((index) => result.terminalNet[terminalKey(motor.id, index)]);
        const starRoot = bottomNets[0];
        const isStar = starRoot !== undefined
          && bottomNets.every((id) => id !== undefined && root(id) === root(starRoot))
          && !result.nets.some((net) => root(net.id) === root(starRoot) && net.potentials.some((potential) => PHASE_LABELS.includes(potential)));
        if (!isStar) continue;
        const currentNets = new Set(result.nets.filter((net) => root(net.id) === root(starRoot)).map((net) => net.id));
        for (const [group, keys] of wireTerminalKeys) {
          if ([...keys].some((key) => currentNets.has(result.terminalNet[key] ?? -1))) motorCurrentGroups.add(group);
        }
      }

      // У автотрансформатора выводы 2/5/8 образуют общую точку без отдельной
      // метки фазы. При пуске через AT ток обмоток есть, но потенциалы L1/L2/L3
      // туда переносить нельзя: это ошибочно выглядело бы как короткое замыкание.
      const motorRunning = ctx.schema.elements.some((element) =>
        (element.typeCode === 1000 || element.typeCode === 1001) && Boolean(result.motors[element.id]?.running));
      if (motorRunning) {
        for (const transformer of ctx.schema.elements) {
          if (transformer.typeCode !== 1052) continue;
          const inputPhases = [0, 1, 2].map((index) => {
            const netId = result.terminalNet[terminalKey(transformer.id, index)];
            return nets.get(netId ?? -1)?.potentials.filter((potential) => PHASE_LABELS.includes(potential)) ?? [];
          });
          const hasThreeInputPhases = inputPhases.every((phases) => phases.length === 1)
            && new Set(inputPhases.map((phases) => phases[0])).size === 3;
          if (!hasThreeInputPhases) continue;

          const starNets = new Set([3, 4, 5]
            .map((index) => result.terminalNet[terminalKey(transformer.id, index)])
            .filter((id): id is number => id !== undefined));
          for (const [group, keys] of wireTerminalKeys) {
            if (![...keys].some((key) => starNets.has(result.terminalNet[key] ?? -1))) continue;
            motorCurrentGroups.add(group);
            autotransformerCurrentGroups.add(group);
          }
        }
      }
    }
    for (const wire of ctx.schema.wires) {
      const lineOrDot = deps.wireLayer.querySelector<SVGElement>(`[data-wire-id="${wire.id}"]`);
      if (!lineOrDot) continue;
      const group = wireGroupOf.get(wire.id);
      const potentials = new Set<PotentialLabel>();
      for (const key of group === undefined ? [] : wireTerminalKeys.get(group) ?? []) {
        const netId = result?.terminalNet[key];
        for (const potential of nets.get(netId ?? -1)?.potentials ?? []) potentials.add(potential);
      }
      const ordered = POTENTIAL_ORDER.filter((potential) => potentials.has(potential));
      const carriesMotorCurrent = group !== undefined && motorCurrentGroups.has(group);
      const carriesAutotransformerCurrent = group !== undefined && autotransformerCurrentGroups.has(group);
      const energized = ordered.length > 0 || carriesMotorCurrent;
      const idleColor = wire.kind === 'junction' ? IDLE_WIRE_COLORS.junction : IDLE_WIRE_COLORS[wire.kind];
      const first = ordered[0];
      const liveColor = first ? (deps.uniformWireColors() && PHASE_LABELS.includes(first) ? UNIFORM_LIVE_COLOR : POTENTIAL_COLORS[first]) : idleColor;
      const color = ordered.length > 1 ? CONFLICT_COLOR : carriesMotorCurrent ? UNIFORM_LIVE_COLOR : liveColor;
      const isDot = wire.kind === 'junction';
      lineOrDot.classList.toggle('is-energized', energized);
      lineOrDot.style.filter = '';
      deps.wireLayer.querySelector(`[data-halo-for="${wire.id}"]`)?.remove();
      if (isDot) lineOrDot.setAttribute('fill', color);
      else {
        const base = Math.max(1, wire.thickness || 1) * 1.35;
        lineOrDot.setAttribute('stroke', color);
        // Без свечения: цвет показывает потенциал, толщина остаётся одной и той же.
        lineOrDot.setAttribute('stroke-width', String(base));
      }
      lineOrDot.setAttribute('aria-label', ordered.length
        ? `Провод под напряжением: ${ordered.join(', ')}`
        : carriesAutotransformerCurrent
          ? 'Провод с током через автотрансформатор'
          : carriesMotorCurrent
            ? 'Провод с током в режиме «звезда»'
            : 'Провод без потенциала');
    }
    for (const element of ctx.schema.elements) {
      const symbol = deps.elementLayer.querySelector<SVGGElement>(`[data-element-id="${element.id}"]`);
      if (!symbol) continue;
      const tripped = Boolean(simInputs.tripped[element.id] || result?.tripped[element.id]);
      const thermalContactTripped = [8016, 8017, 8018, 8019].includes(element.typeCode)
        && (Boolean(simInputs.tripped[element.id]) || (element.name !== '' && thermalState.trippedNames.has(element.name)));
      const defaultClosed = armedByDefaultTypes.has(element.typeCode);
      const manuallyOpen = result !== undefined && latchedTypes.has(element.typeCode) && !(simInputs.toggled[element.id] ?? defaultClosed);
      // У выключателя с фиксацией лопасть рисуется по тому же классу, что и у нажатой кнопки.
      symbol.classList.toggle('is-sim-pressed', (simInputs.pressed[element.id] ?? false) || (maintainedTypes.has(element.typeCode) && simInputs.toggled[element.id] === true));
      if (POSITION_SPECS[element.typeCode]) symbol.setAttribute('data-position', String(currentPosition(element.typeCode, simInputs.positions?.[element.id])));
      // Тепловое реле отображает состояние цветом, не поворачивая силовые лопасти.
      // Электрически контакты при срабатывании по-прежнему размыкаются в движке.
      symbol.classList.toggle('is-sim-open', element.typeCode !== 6007 && (manuallyOpen || tripped));
      symbol.classList.toggle('is-sim-tripped', tripped);
      symbol.classList.toggle('is-thermal-relay-tripped', element.typeCode === 6007 && tripped);
      symbol.classList.toggle('is-thermal-tripped', thermalContactTripped);
      symbol.classList.toggle('is-sim-fault-glow', Boolean(simInputs.tripped[element.id]));
      symbol.classList.toggle('is-sim-closed', result?.contacts[element.id] ?? false);
      // Вспомогательные контакты: общий признак срабатывания (катушка или таймер с тем же именем) для НО и НЗ полюсов.
      const auxSwitches = element.typeCode >= 7000 && element.typeCode <= 7015 && getBehavior(element.typeCode).links.some((link) => link.kind === 'switch');
      const timedSinglePoleActive = element.typeCode === 7004
        ? result?.contacts[element.id]
        : element.typeCode === 7005
          ? result !== undefined && !result.contacts[element.id]
          : undefined;
      const auxActive = timedSinglePoleActive ?? (result !== undefined && (
        auxContactActive(element, ctx.schema, result.coils, result.memory.timers)
        || auxContactActuatorActive(element, ctx.schema, simInputs)
      ));
      symbol.classList.toggle('is-aux-active', auxSwitches && result !== undefined && auxActive);
      symbol.classList.toggle('is-coil-energized', element.typeCode === 9000 || element.typeCode === 9004 ? (result?.coils[element.name] ?? false) : element.typeCode === 9005 ? (result?.memory.timers[element.id]?.powered ?? false) : false);
      symbol.classList.toggle('is-lamp-lit', element.typeCode === 9008 ? (result?.lamps[element.id] ?? false) : false);
      if (element.typeCode === 9004 || element.typeCode === 9005) {
        const readout = symbol.querySelector<SVGTextElement>('.timer-readout');
        const timer = result?.memory.timers[element.id];
        const total = Math.max(0, Number(element.params.time ?? 0));
        const formatTime = (value: number): string => (Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ','));
        const timerDone = timer?.phase === 'done' || timer?.phase === 'releasing';
        const shown = timerDone ? total : Math.min(total, Math.max(0, timer?.elapsed ?? 0));
        const readoutText = result === undefined ? '' : `${timer?.phase === 'counting' ? shown.toFixed(1).replace('.', ',') : formatTime(shown)} / ${formatTime(total)} с`;
        if (readout && readout.textContent !== readoutText) readout.textContent = readoutText;
        symbol.classList.toggle('is-timer-counting', timer?.phase === 'counting');
        symbol.classList.toggle('is-timer-done', timerDone);
      }
      const motor = result?.motors[element.id];
      symbol.classList.toggle('is-motor-running', motor?.running ?? false);
      symbol.classList.toggle('is-motor-faulted', motor?.faulted ?? false);
      const motorPhaseNets = [0, 1, 2].map((index) => {
        const netId = result?.terminalNet[terminalKey(element.id, index)];
        return netId === undefined ? undefined : nets.get(netId);
      });
      const motorPhases = motorPhaseNets.map((net) => net?.potentials.filter((potential) => potential === 'L1' || potential === 'L2' || potential === 'L3') ?? []);
      let motorDirection: 'normal' | 'reverse' | undefined;
      if (motor?.reversed) motorDirection = 'reverse';
      else if (motorPhases.every((phases) => phases.length === 1)) {
        const phaseOrder = motorPhases.map((phases) => ['L1', 'L2', 'L3'].indexOf(phases[0] as string));
        let inversions = 0;
        for (let i = 0; i < phaseOrder.length; i += 1) {
          for (let j = i + 1; j < phaseOrder.length; j += 1) {
            if ((phaseOrder[i] as number) > (phaseOrder[j] as number)) inversions += 1;
          }
        }
        motorDirection = inversions % 2 === 0 ? 'normal' : 'reverse';
      }
      symbol.classList.toggle('is-sim-active', result !== undefined);
      const powered = element.terminals.some((_, index) => (nets.get(result?.terminalNet[terminalKey(element.id, index)] ?? -1)?.potentials.length ?? 0) > 0);
      // Выключенный/сработавший аппарат защиты не подсвечивается красным: остаётся серым.
      symbol.classList.toggle('is-powered', element.typeCode !== 6007 && powered && !(latchedTypes.has(element.typeCode) && (manuallyOpen || tripped)));
      if (motor?.running) {
        // Постоянная скорость: менять animation-duration на лету нельзя — браузер пересчитывает фазу и стрелка «дёргается».
        symbol.style.setProperty('--motor-period', '0.9s');
        symbol.style.setProperty('--motor-play-state', simMode === 'run' ? 'running' : 'paused');
        symbol.style.setProperty('--motor-direction', motorDirection ?? 'normal');
        symbol.style.setProperty('--motor-mirror', motorDirection === 'reverse' ? '-1' : '1');
      } else {
        motorStartTimes.delete(element.id);
        symbol.style.removeProperty('--motor-period'); symbol.style.removeProperty('--motor-play-state'); symbol.style.removeProperty('--motor-direction'); symbol.style.removeProperty('--motor-mirror');
      }
    }
    const messages: string[] = [];
    for (const fault of result?.faults ?? []) {
      const details = fault.message.replace(/^[a-z-]+:\s*/i, '');
      if (fault.kind === 'short-circuit') messages.push(`Короткое замыкание: ${details}`);
      else if (fault.kind === 'earth-leak') messages.push(`Утечка на PE: ${details}`);
      else if (fault.kind === 'unstable') messages.push(`Нестабильная схема: ${details}`);
    }
    for (const element of ctx.schema.elements) {
      if ((element.typeCode !== 1000 && element.typeCode !== 1001) || !result?.motors[element.id]?.faulted) continue;
      messages.push(`Потеря фазы: двигатель ${element.name || `M${element.id}`} не получил три разные фазы на U1/V1/W1.`);
    }
    const messageText = [...new Set(messages)].join(' ');
    deps.simulationMessage.hidden = messageText.length === 0;
    if (deps.simulationMessage.textContent !== messageText) deps.simulationMessage.textContent = messageText;
  };

  const updateSimulationControls = (): void => {
    const running = simMode === 'run';
    deps.runButton.disabled = running;
    deps.stopButton.disabled = simMode === 'edit';
    const modeLabel = simMode === 'run' ? deps.uiText().running : deps.uiText().editor;
    if (deps.simStateValue.textContent !== modeLabel) deps.simStateValue.textContent = modeLabel;
    deps.simStateValue.dataset.mode = simMode;
    if (simResult?.faults.length) deps.simStateValue.title = simResult.faults.map((fault) => fault.message).join('\n');
    else if (simResult?.warnings.length) deps.simStateValue.title = simResult.warnings.join('\n');
    else deps.simStateValue.removeAttribute('title');
  };
  const resetSimulation = (): void => {
    if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
    animationFrame = undefined; lastFrameTime = undefined; simMode = 'edit'; simTime = 0;
    simMemory = createEmptyMemory(); simInputs = createSimInputs(); simResult = undefined;
    updateSimulationControls();
    applySimulationVisuals();
  };
  const evaluateSimulation = (): void => {
    simResult = simulate({ schema: ctx.schema, inputs: simInputs, time: simTime, memory: simMemory });
    simMemory = simResult.memory;
    updateSimulationControls();
    applySimulationVisuals();
  };
  const simulationTick = (timestamp: number): void => {
    if (simMode !== 'run') { animationFrame = undefined; return; }
    const previous = lastFrameTime ?? timestamp;
    const elapsed = Math.min(0.25, Math.max(0, (timestamp - previous) / 1000));
    lastFrameTime = timestamp; simTime += elapsed * simSpeed;
    evaluateSimulation();
    animationFrame = requestAnimationFrame(simulationTick);
  };
  const startSimulation = (): void => {
    if (simMode === 'run') return;
    for (const element of ctx.schema.elements) if (startsOpen(element.typeCode) && simInputs.toggled[element.id] === undefined) simInputs.toggled[element.id] = false;
    simMode = 'run'; lastFrameTime = undefined; evaluateSimulation();
    deps.clearSelection();
    animationFrame = requestAnimationFrame(simulationTick);
  };
  /** Полная остановка: время в 0, память, нажатые кнопки и результат расчёта сброшены, схема возвращается в редактор. */
  const stopSimulation = (): void => {
    heldInputs.clear();
    deps.simulationContextMenu.hidden = true;
    resetSimulation();
    deps.renderSchema();
    deps.status.textContent = 'Симуляция остановлена.';
  };
  const momentaryTypes = new Set([8000, 8001, 8002, 8003, 8004, 8005, 8006, 8007, 8012, 8013, 8014, 8015]);
  /** Ручные выключатели с фиксацией (Interruptor): клик переключает привод, toggled = «привод включён», нет записи = покой. Не входят в latchedTypes. */
  const maintainedTypes = new Set([8008, 8009, 8010, 8011]);
  const trippableTypes = new Set([6000, 6001, 6002, 6003, 6004, 6005, 6006, 6007, 6008, 6009, 6010, 6011, 6012, 8016, 8017, 8018, 8019]);
  const applySimulationInput = (): void => { evaluateSimulation(); deps.renderSchema(); };
  const pressMomentary = (id: number): void => {
    if (simMode === 'edit' || heldInputs.has(id)) return;
    heldInputs.add(id); simInputs.pressed[id] = true; applySimulationInput();
  };
  const releaseMomentary = (id: number): void => {
    if (!heldInputs.delete(id)) return;
    delete simInputs.pressed[id]; applySimulationInput();
  };
  const resetSimulationInputs = (): void => {
    simInputs = createSimInputs(); heldInputs.clear(); simMemory = createEmptyMemory(); simTime = 0; simResult = undefined;
    lastFrameTime = undefined; evaluateSimulation(); deps.renderSchema();
    deps.status.textContent = 'Входы и память симуляции сброшены.';
  };
  const simulateOverload = (id: number): void => {
    if (simMode === 'edit') startSimulation();
    simInputs.tripped[id] = true; applySimulationInput();
    const element = ctx.schema.elements.find((candidate) => candidate.id === id);
    deps.status.textContent = `Смоделирована перегрузка: ${element?.name || `элемент ${id}`}.`;
  };
  const showSimulationContextMenu = (event: MouseEvent, elementId?: number): void => {
    contextElementId = elementId;
    const element = elementId === undefined ? undefined : ctx.schema.elements.find((candidate) => candidate.id === elementId);
    deps.overloadAction.hidden = !element || !trippableTypes.has(element.typeCode);
    deps.simulationContextMenu.hidden = false;
    const bounds = deps.simulationContextMenu.getBoundingClientRect();
    deps.simulationContextMenu.style.left = `${Math.max(8, Math.min(event.clientX, innerWidth - bounds.width - 8))}px`;
    deps.simulationContextMenu.style.top = `${Math.max(8, Math.min(event.clientY, innerHeight - bounds.height - 8))}px`;
  };


  return {
    get mode() { return simMode; },
    get speed() { return simSpeed; }, set speed(value) { simSpeed = value; },
    get inputs() { return simInputs; },
    heldInputs,
    get contextElementId() { return contextElementId; }, set contextElementId(value) { contextElementId = value; },
    isMomentaryType: (typeCode) => momentaryTypes.has(typeCode),
    isMaintainedType: (typeCode) => maintainedTypes.has(typeCode),
    isTrippableType: (typeCode) => trippableTypes.has(typeCode),
    updateSimulationControls, applySimulationVisuals, resetSimulation, evaluateSimulation, rebuildWireTerminalMap, applySimulationInput,
    startSimulation, stopSimulation, pressMomentary, releaseMomentary, resetSimulationInputs,
    simulateOverload, showSimulationContextMenu,
  };
}

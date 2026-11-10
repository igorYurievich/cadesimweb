import type { SimulationController } from './controller';

export function setupSimulationSpeedControl(
  button: HTMLButtonElement,
  simulation: SimulationController,
): void {
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

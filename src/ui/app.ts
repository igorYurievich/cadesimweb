import { setupApp } from './app-setup';
import './viewport.css';

/** Mount the SVG viewer for a CADe SIMU sheet. */
export function mountApp(root: HTMLElement): void {
  setupApp(root);
}

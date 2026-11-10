import { createAppSetupBase } from './app-setup-base';
import { setupAppEditor } from './app-setup-editor';
import { setupAppCommands } from './app-setup-commands';
import { setupAppEvents } from './app-setup-events';

export function setupApp(root: HTMLElement): void {
  const state = createAppSetupBase(root);
  const editor = setupAppEditor(state);
  const commands = setupAppCommands(state, editor);
  setupAppEvents(state, editor, commands);
}

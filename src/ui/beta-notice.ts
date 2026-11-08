import { BETA_NOTICE_KEY } from './constants';
import type { AppContext } from './context';

export function setupBetaNotice(ctx: AppContext): void {
  const { root } = ctx;
  // Предупреждение о бета-версии показывается только при первом открытии сайта.
  const betaDialog = root.querySelector<HTMLDialogElement>('#beta-dialog');
  const betaAlreadySeen = (): boolean => { try { return localStorage.getItem(BETA_NOTICE_KEY) === '1'; } catch { return false; } };
  const markBetaSeen = (): void => { try { localStorage.setItem(BETA_NOTICE_KEY, '1'); } catch { /* Notice may show again if storage is unavailable. */ } };
  betaDialog?.addEventListener('close', markBetaSeen);
  root.querySelector<HTMLButtonElement>('#beta-ok')?.addEventListener('click', () => betaDialog?.close());
  if (betaDialog && !betaAlreadySeen()) betaDialog.showModal();
}

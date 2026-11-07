import { ACCESS_FNV, ACCESS_KEY, ACCESS_SHA256, BETA_NOTICE_KEY } from './constants';
import type { AppContext } from './context';

async function passwordMatches(value: string): Promise<boolean> {
  const bytes = new TextEncoder().encode(value);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('') === ACCESS_SHA256;
  }
  let h = 0x811c9dc5;
  for (const b of bytes) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16) === ACCESS_FNV;
}

export function setupAccess(ctx: AppContext): void {
  const { root } = ctx;
  // Предупреждение о бета-версии: показывается только при первом открытии сайта.
  const betaDialog = root.querySelector<HTMLDialogElement>('#beta-dialog');
  const betaAlreadySeen = (): boolean => { try { return localStorage.getItem(BETA_NOTICE_KEY) === '1'; } catch { return false; } };
  const markBetaSeen = (): void => { try { localStorage.setItem(BETA_NOTICE_KEY, '1'); } catch { /* Notice may show again if storage is unavailable. */ } };
  betaDialog?.addEventListener('close', markBetaSeen);
  root.querySelector<HTMLButtonElement>('#beta-ok')?.addEventListener('click', () => betaDialog?.close());
  const showBetaNotice = (): void => { if (betaDialog && !betaAlreadySeen()) betaDialog.showModal(); };
  // Пароль при первом запуске: после успешного ввода запоминается, дальше окно не появляется.
  const accessDialog = root.querySelector<HTMLDialogElement>('#access-dialog');
  const accessInput = root.querySelector<HTMLInputElement>('#access-input');
  const accessError = root.querySelector<HTMLElement>('#access-error');
  const accessGranted = (): boolean => { try { return localStorage.getItem(ACCESS_KEY) === '1'; } catch { return false; } };
  if (accessDialog && accessInput && !accessGranted()) {
    accessDialog.addEventListener('cancel', (event) => event.preventDefault());
    root.querySelector<HTMLFormElement>('#access-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      void passwordMatches(accessInput.value).then((ok) => {
        if (!ok) { if (accessError) accessError.hidden = false; accessInput.value = ''; accessInput.focus(); return; }
        try { localStorage.setItem(ACCESS_KEY, '1'); } catch { /* Password will be asked again if storage is unavailable. */ }
        accessDialog.close();
        showBetaNotice();
      });
    });
    accessDialog.showModal();
  } else showBetaNotice();
}

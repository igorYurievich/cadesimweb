/**
 * Пункт «Пароль» в меню «Ayuda» открывает окошко для секретного пароля (snake-unlock.ts: matchSecret).
 * ФИО автора открывает «Змейку по проводам», код 4962 — достижение «Старая школа» (snake-achievement.ts).
 * Сама игра (snake-modal.ts) — отдельный кусок сборки: скачивается только при запуске.
 */
import './snake-entry.css';
import { currentText, fillText } from '../i18n';
import { errorReason } from '../helpers';
import { showAchievement } from './snake-achievement';
import { matchSecret, unlockSnake } from './snake-unlock';

interface PasswordDialog {
  dialog: HTMLDialogElement;
  title: HTMLHeadingElement;
  input: HTMLInputElement;
  error: HTMLParagraphElement;
  cancel: HTMLButtonElement;
  confirm: HTMLButtonElement;
}

function menuButton(className: string): HTMLButtonElement {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = `menu-command ${className}`;
  return node;
}

function buildDialog(root: HTMLElement): PasswordDialog {
  const dialog = document.createElement('dialog');
  dialog.className = 'app-dialog password-dialog';
  const form = document.createElement('form');
  form.method = 'dialog';
  const title = document.createElement('h2');
  title.id = 'password-dialog-title';
  dialog.setAttribute('aria-labelledby', title.id);
  const input = document.createElement('input');
  input.type = 'password';
  input.autocomplete = 'off';
  input.maxLength = 60;
  input.className = 'password-dialog-input';
  const error = document.createElement('p');
  error.className = 'password-dialog-error';
  error.hidden = true;
  const actions = document.createElement('div');
  actions.className = 'dialog-actions';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  const confirm = document.createElement('button');
  confirm.type = 'submit';
  confirm.className = 'primary-action';
  actions.append(cancel, confirm);
  form.append(title, input, error, actions);
  dialog.append(form);
  root.append(dialog);
  return { dialog, title, input, error, cancel, confirm };
}

export function setupSnakeEntry(root: HTMLElement): void {
  const popover = root.querySelector('.menu-group [data-command="about"]')?.closest('.menu-popover');
  if (!popover) return;
  const passwordButton = menuButton('password-command');
  popover.append(passwordButton);
  const ui = buildDialog(root);
  const status = root.querySelector<HTMLElement>('#status');
  const closeMenus = (): void => {
    root.querySelectorAll<HTMLDetailsElement>('.menu-group[open]').forEach((group) => { group.open = false; });
  };
  const applyTexts = (): void => {
    const t = currentText();
    passwordButton.textContent = t.helpPassword;
    ui.title.textContent = t.passwordTitle;
    ui.input.setAttribute('aria-label', t.passwordTitle);
    ui.error.textContent = t.passwordWrong;
    ui.cancel.textContent = t.cancel;
    ui.confirm.textContent = t.done;
  };
  const launch = (): void => {
    closeMenus();
    import('./snake-modal').then(
      (module) => { module.openWireSnake(root); },
      (error: unknown) => {
        if (status) status.textContent = fillText(currentText().snakeLoadFailed, { reason: errorReason(error) });
      },
    );
  };
  passwordButton.addEventListener('click', () => {
    closeMenus();
    applyTexts();
    ui.input.value = '';
    ui.error.hidden = true;
    ui.dialog.showModal();
    ui.input.focus();
  });
  ui.dialog.addEventListener('submit', (event) => {
    const secret = matchSecret(ui.input.value);
    if (!secret) {
      // Неверный код: окошко остаётся открытым, поле очищается.
      event.preventDefault();
      ui.input.value = '';
      ui.error.hidden = false;
      ui.input.focus();
      return;
    }
    if (secret === 'old-school') {
      showAchievement(root, currentText().achievementTitle, currentText().achievementOldSchool);
      return;
    }
    unlockSnake();
    if (status) status.textContent = currentText().snakeUnlocked;
    launch();
  });
  ui.input.addEventListener('input', () => { ui.error.hidden = true; });
  ui.cancel.addEventListener('click', () => ui.dialog.close());
  // Тексты — при каждом открытии «Ayuda»: язык мог смениться, пока меню было закрыто.
  popover.closest('details')?.addEventListener('toggle', applyTexts);
  applyTexts();
}

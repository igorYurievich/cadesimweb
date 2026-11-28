/**
 * Всплывающее «достижение» (пароль 4962 → «Старая школа»): плашка с кубком въезжает сверху,
 * вспыхивает и через несколько секунд уезжает сама. Клик — закрыть сразу.
 */

const SHOW_MS = 4500;
const LEAVE_MS = 400;

export function showAchievement(root: HTMLElement, caption: string, title: string): void {
  root.querySelector('.achievement-toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'achievement-toast';
  toast.setAttribute('role', 'status');
  const icon = document.createElement('span');
  icon.className = 'achievement-icon';
  icon.textContent = '🏆';
  const text = document.createElement('span');
  text.className = 'achievement-text';
  const small = document.createElement('small');
  small.textContent = caption;
  const big = document.createElement('strong');
  big.textContent = title;
  text.append(small, big);
  toast.append(icon, text);
  root.append(toast);
  let timer = 0;
  const leave = (): void => {
    window.clearTimeout(timer);
    toast.classList.add('is-leaving');
    window.setTimeout(() => toast.remove(), LEAVE_MS);
  };
  toast.addEventListener('click', leave);
  timer = window.setTimeout(leave, SHOW_MS);
}

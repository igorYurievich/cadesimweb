import type { AppContext } from './context';

/**
 * Kept as a compatibility hook for older integrations. Password access was
 * removed; the beta notice is handled separately by beta-notice.ts.
 */
export function setupAccess(_ctx: AppContext): void {
  // Access control is no longer part of the application.
}

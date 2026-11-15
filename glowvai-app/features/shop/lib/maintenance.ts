// Maintenance mode for the whole /shop. The admin switches it on in the layout reply (maintenance: { enabled, message,
// until }). The gate checks it when the shop loads and when the tab regains focus, from the layout request the home
// already makes: no polling and no extra endpoint. A staff preview (?preview=<token>) is never blocked.

export interface MaintenanceInfo { enabled: boolean; message: string; until: number | null }

type Listener = (state: MaintenanceInfo) => void;
const listeners = new Set<Listener>();
let current: MaintenanceInfo = { enabled: false, message: '', until: null };

export function subscribeMaintenance(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export const currentMaintenance = (): MaintenanceInfo => current;

// Called with every layout reply the shop receives. A staff preview reply never turns maintenance on.
export function publishMaintenance(next: MaintenanceInfo, preview: boolean): void {
  current = preview ? { enabled: false, message: '', until: null } : next;
  listeners.forEach((fn) => fn(current));
}

// True when the maintenance page must replace the app: switched on, and `until` is missing or still in the future.
export function maintenanceActive(m: MaintenanceInfo, now: number, previewing: boolean): boolean {
  if (previewing || !m.enabled) return false;
  return m.until === null || m.until > now;
}

// "back at 6:30 pm" in the visitor's time, or '' when there is no end time.
export function backAtLabel(until: number | null, now: number): string {
  if (until === null || until <= now) return '';
  try {
    return `Back at ${new Date(until).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  } catch {
    return '';
  }
}

export function isPreviewRequest(search: string): boolean {
  try {
    return Boolean(new URLSearchParams(search).get('preview'));
  } catch {
    return false;
  }
}

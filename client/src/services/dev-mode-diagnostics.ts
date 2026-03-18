export const DEV_MODE_LAG_MIN_MS = 500;
export const DEV_MODE_LAG_MAX_MS = 3000;
const DEV_MODE_DEFAULT_LAG_MS = 1000;
const DEV_MODE_MAX_LOG_ENTRIES = 200;

export type DevModeLogDirection = 'inbound' | 'outbound' | 'lifecycle';

export interface DevModeLogEntry {
  id: number;
  timestampIso: string;
  direction: DevModeLogDirection;
  eventName: string;
  details: string | null;
}

export interface DevModeDiagnosticsState {
  lagEnabled: boolean;
  lagDelayMs: number;
  socketLogs: DevModeLogEntry[];
}

type DiagnosticsSubscriber = () => void;

let nextLogId = 1;
let diagnosticsState: DevModeDiagnosticsState = {
  lagEnabled: false,
  lagDelayMs: DEV_MODE_DEFAULT_LAG_MS,
  socketLogs: [],
};

const subscribers = new Set<DiagnosticsSubscriber>();

function notifySubscribers() {
  subscribers.forEach((subscriber) => {
    subscriber();
  });
}

function updateState(updater: (prev: DevModeDiagnosticsState) => DevModeDiagnosticsState) {
  diagnosticsState = updater(diagnosticsState);
  notifySubscribers();
}

export function subscribeToDevModeDiagnostics(subscriber: DiagnosticsSubscriber): () => void {
  subscribers.add(subscriber);

  return () => {
    subscribers.delete(subscriber);
  };
}

export function getDevModeDiagnosticsState(): DevModeDiagnosticsState {
  return diagnosticsState;
}

export function setDevModeLagEnabled(enabled: boolean): void {
  updateState((prev) => ({
    ...prev,
    lagEnabled: enabled,
  }));
}

export function setDevModeLagDelayMs(delayMs: number): void {
  const clampedDelay = Math.min(Math.max(Math.round(delayMs), DEV_MODE_LAG_MIN_MS), DEV_MODE_LAG_MAX_MS);

  updateState((prev) => ({
    ...prev,
    lagDelayMs: clampedDelay,
  }));
}

export function appendDevModeSocketLog(
  direction: DevModeLogDirection,
  eventName: string,
  details?: string,
): void {
  // @ts-expect-error - standard vitest behavior might lack import.meta.env in non-component tests depending on suite config
  if (import.meta.env.VITE_DEV_MODE !== 'true') {
    return;
  }

  const nextEntry: DevModeLogEntry = {
    id: nextLogId,
    timestampIso: new Date().toISOString(),
    direction,
    eventName,
    details: details ?? null,
  };

  nextLogId += 1;

  updateState((prev) => ({
    ...prev,
    socketLogs: [...prev.socketLogs, nextEntry].slice(-DEV_MODE_MAX_LOG_ENTRIES),
  }));
}

export function getDevModeLagDelayMs(): number | null {
  if (!diagnosticsState.lagEnabled) {
    return null;
  }

  return diagnosticsState.lagDelayMs;
}

export function runWithDevModeLag(task: () => void): void {
  // @ts-expect-error
  if (import.meta.env.VITE_DEV_MODE !== 'true') {
    task();
    return;
  }

  const lagDelay = getDevModeLagDelayMs();

  if (lagDelay === null) {
    task();
    return;
  }

  globalThis.setTimeout(task, lagDelay);
}

export function resetDevModeDiagnosticsForTests(): void {
  nextLogId = 1;
  diagnosticsState = {
    lagEnabled: false,
    lagDelayMs: DEV_MODE_DEFAULT_LAG_MS,
    socketLogs: [],
  };
  subscribers.clear();
}

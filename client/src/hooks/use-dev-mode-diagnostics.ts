import { useSyncExternalStore } from 'react';
import {
  getDevModeDiagnosticsState,
  setDevModeLagDelayMs,
  setDevModeLagEnabled,
  subscribeToDevModeDiagnostics,
} from '../services/dev-mode-diagnostics';

export function useDevModeDiagnostics() {
  const state = useSyncExternalStore(subscribeToDevModeDiagnostics, getDevModeDiagnosticsState, getDevModeDiagnosticsState);

  return {
    state,
    setLagEnabled: setDevModeLagEnabled,
    setLagDelayMs: setDevModeLagDelayMs,
  };
}

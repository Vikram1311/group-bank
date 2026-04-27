import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { useStore, hydrateFromSharedState, forceSyncWithRemote, SHG_STORAGE_KEY } from "./store/useStore";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// ─── Console Calibration API ────────────────────────────────────────────────
// Open DevTools console and use window.__shg to inspect or calibrate the app.
//
// Examples:
//   await window.__shg.sync()          // push local → remote, then pull latest
//   await window.__shg.pull()          // pull remote if newer than local
//   window.__shg.getState().members    // inspect current Zustand state
//   window.__shg.setState({ language: 'en' })  // patch state directly
//   window.__shg.seed()                // re-seed historical contributions
//   copy(window.__shg.exportJSON())    // copy full state JSON to clipboard
//   window.__shg.importJSON('...')     // restore state from a JSON string
// ────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = SHG_STORAGE_KEY;

declare global {
  interface Window {
    __shg: typeof calibrationApi;
  }
}

const calibrationApi = {
  /** Push local state to remote then pull any even-newer remote state. */
  sync: () => forceSyncWithRemote(),

  /** Pull remote state and apply it locally if it is newer than the local copy. */
  pull: () => hydrateFromSharedState(),

  /** Return the full current Zustand state for inspection. */
  getState: () => useStore.getState(),

  /**
   * Patch the Zustand store directly (use with care).
   * WARNING: This bypasses any action-level logic, computed derivations, and
   * the Zustand persist middleware — the patch is written directly into memory.
   * For a safe, persisted import use importJSON() instead.
   */
  setState: (patch: Parameters<typeof useStore.setState>[0]) => useStore.setState(patch),

  /** Re-seed historical contribution records for eligible members. */
  seed: () => useStore.getState().seedHistoricalContributions(),

  /**
   * Export the full persisted state from localStorage as a JSON string.
   * Tip: pass the result to copy() in Chrome DevTools to copy it to clipboard.
   */
  exportJSON: (): string => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return JSON.stringify(useStore.getState(), null, 2);
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  },

  /**
   * Import/restore state from a JSON string produced by exportJSON().
   * Accepts either the raw localStorage envelope ({ state: {...} }) or
   * a plain state object ({ members: [...], ... }).
   */
  importJSON: (jsonString: string): void => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonString) as Record<string, unknown>;
    } catch (e) {
      console.error('[__shg] importJSON: invalid JSON', e);
      return;
    }
    // Unwrap Zustand localStorage envelope if present
    const statePayload =
      parsed.state && typeof parsed.state === 'object'
        ? (parsed.state as Record<string, unknown>)
        : parsed;
    useStore.setState(statePayload as Parameters<typeof useStore.setState>[0]);
    // Persist to localStorage so the in-memory and stored states stay in sync.
    // Wrap in the Zustand envelope format that the persist middleware expects.
    const envelope = { state: useStore.getState(), version: 0 };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    } catch (e) {
      console.warn('[__shg] importJSON: could not write to localStorage', e);
    }
    console.info('[__shg] importJSON: state applied ✓');
  },
};

window.__shg = calibrationApi;

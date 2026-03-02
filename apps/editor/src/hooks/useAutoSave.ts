/**
 * useAutoSave — debounced auto-save when the document is dirty
 * and a file handle exists.
 *
 * Behavior:
 * - Watches `isDirty` and `fileHandle` from the store
 * - When both are truthy, starts a 2s debounce timer
 * - Calls `saveDocument()` silently on expiry
 * - Shows a brief "Saved" status via a returned state value
 */

import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "../store/editor-store";
import { saveDocument } from "../utils/file-commands";

const AUTO_SAVE_DELAY_MS = 2000;
const SAVED_INDICATOR_MS = 1500;

const STORAGE_KEY = "sand-auto-save-enabled";

function getStoredPreference(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== "false"; // default true
  } catch {
    return true;
  }
}

export function useAutoSave() {
  const [enabled, setEnabled] = useState(getStoredPreference);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indicatorRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleEnabled = (value: boolean) => {
    setEnabled(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // localStorage unavailable
    }
  };

  useEffect(() => {
    if (!enabled) return;

    // Track previous state to detect changes
    let prevDirty = useEditorStore.getState().isDirty;

    const unsubscribe = useEditorStore.subscribe((state) => {
      const { isDirty, fileHandle } = state;

      // Only react to isDirty changes
      if (isDirty === prevDirty) return;
      prevDirty = isDirty;

      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (isDirty && fileHandle) {
        timerRef.current = setTimeout(async () => {
          try {
            await saveDocument();
            const now = new Date();
            setLastSavedAt(now);
            setShowSaved(true);

            // Hide "Saved" indicator after a brief period
            if (indicatorRef.current) clearTimeout(indicatorRef.current);
            indicatorRef.current = setTimeout(() => setShowSaved(false), SAVED_INDICATOR_MS);
          } catch (err) {
            console.error("Auto-save failed:", err);
          }
        }, AUTO_SAVE_DELAY_MS);
      }
    });

    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (indicatorRef.current) clearTimeout(indicatorRef.current);
    };
  }, [enabled]);

  return { enabled, toggleEnabled, lastSavedAt, showSaved };
}

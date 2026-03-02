import { useEffect } from "react";
import { useEditorStore } from "../store/editor-store";

/**
 * Global keyboard shortcuts for the Sand editor.
 *
 * | Key              | Action          |
 * |------------------|-----------------|
 * | Delete/Backspace | Delete selected |
 * | Ctrl+Z / ⌘Z     | Undo            |
 * | Ctrl+Shift+Z / ⌘⇧Z | Redo         |
 * | Escape           | Deselect        |
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;

      // Delete / Backspace → delete selected node
      if (e.key === "Delete" || e.key === "Backspace") {
        const selectedIds = useEditorStore.getState().selectedSandNodeIds;
        if (selectedIds.length > 0) {
          e.preventDefault();
          useEditorStore.getState().deleteSelectedSandNodes();
        }
        return;
      }

      // Ctrl+Z / ⌘Z → Undo
      if (isMod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        useEditorStore.getState().undo();
        return;
      }

      // Ctrl+Shift+Z / ⌘⇧Z → Redo
      if (isMod && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        useEditorStore.getState().redo();
        return;
      }

      // Ctrl+Y / ⌘Y → Redo (alternative)
      if (isMod && e.key === "y") {
        e.preventDefault();
        useEditorStore.getState().redo();
        return;
      }

      // Escape → Deselect
      if (e.key === "Escape") {
        e.preventDefault();
        useEditorStore.getState().clearSandNodeSelection();
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}

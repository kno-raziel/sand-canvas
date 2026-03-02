import { useCallback, useEffect, useState } from "react";
import { SandCanvas } from "./canvas/SandCanvas";
import { ComponentPanel } from "./components/ComponentPanel";
import { LayersPanel } from "./components/LayersPanel";
import { PropertyPanel } from "./components/PropertyPanel";
import { ConversationPanel } from "./components/ConversationPanel";
import { ContextMenu } from "./components/ContextMenu";
import { useEditorStore } from "./store/editor-store";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useAutoSave } from "./hooks/useAutoSave";
import { useScreenshotApi } from "./hooks/useScreenshotApi";
import { saveDocument, openDocument, loadFromFile } from "./utils/file-commands";

function useTheme() {
  const [theme, setThemeState] = useState<"lemonade" | "abyss">(() => {
    const stored = localStorage.getItem("sand-theme");
    if (stored === "lemonade" || stored === "abyss") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "abyss" : "lemonade";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("sand-theme", theme);

    // Sync the document's activeTheme so frame rendering matches the editor theme
    const { themes, setActiveTheme } = useEditorStore.getState();
    if (themes.colorScheme) {
      const scheme = theme === "abyss" ? "dark" : "light";
      setActiveTheme("colorScheme", scheme);
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setThemeState((prev) => (prev === "lemonade" ? "abyss" : "lemonade"));
  }, []);

  return { theme, toggle };
}

export function App() {
  const addScreen = useEditorStore((s) => s.addScreen);
  const nodeCount = useEditorStore((s) => s.nodes.length);
  const selectedIds = useEditorStore((s) => s.selectedSandNodeIds);
  const clearSelection = useEditorStore((s) => s.clearSandNodeSelection);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.canUndo);
  const canRedo = useEditorStore((s) => s.canRedo);
  const fileName = useEditorStore((s) => s.currentFileName);
  const isDirty = useEditorStore((s) => s.isDirty);

  const [isDragging, setIsDragging] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  useKeyboardShortcuts();
  useScreenshotApi();
  const { enabled: autoSaveEnabled, toggleEnabled: toggleAutoSave, showSaved } = useAutoSave();

  // Keyboard shortcuts for Save/Open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveDocument();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "o") {
        e.preventDefault();
        openDocument();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // beforeunload warning for unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (useEditorStore.getState().isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Drag-and-drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      await loadFromFile(file);
    }
  }, []);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: root container drag-and-drop
    <div
      className="flex h-screen w-screen flex-col bg-base-300"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-base-content/10 bg-base-100 px-4 py-2 shadow-sm z-50 overflow-visible">
        <span className="text-lg font-bold">🏖️ Sand</span>
        <div className="divider divider-horizontal mx-1" />

        {/* File actions */}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => openDocument()}
          title="Open (⌘O)"
        >
          📂
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => saveDocument()}
          title="Save (⌘S)"
        >
          💾
        </button>
        <div className="divider divider-horizontal mx-0" />

        <button type="button" className="btn btn-sm btn-primary" onClick={() => addScreen()}>
          + Add Screen
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline border-amber-500/50 text-amber-600 hover:bg-amber-500/10 hover:border-amber-500/80"
          onClick={() => {
            useEditorStore.getState().startConversation({
              id: `conv-${crypto.randomUUID().slice(0, 8)}`,
              status: "open",
              messages: [
                {
                  id: `msg-${crypto.randomUUID().slice(0, 8)}`,
                  author: "user",
                  content: "",
                  createdAt: new Date().toISOString(),
                },
              ],
              color: "#fef3c7",
              createdAt: new Date().toISOString(),
            });
          }}
        >
          <span className="mr-1">💬</span> Comment
        </button>
        <div className="divider divider-horizontal mx-0" />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (⌘Z)"
        >
          ↩
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (⌘⇧Z)"
        >
          ↪
        </button>

        {/* File name + dirty/saved indicator + theme toggle */}
        <span className="ml-auto flex items-center gap-2 text-sm text-base-content/70">
          {showSaved && <span className="text-success text-xs animate-pulse">✓ Saved</span>}
          <label className="flex items-center gap-1 cursor-pointer" title="Auto-save">
            <input
              type="checkbox"
              className="toggle toggle-xs toggle-success"
              checked={autoSaveEnabled}
              onChange={(e) => toggleAutoSave(e.target.checked)}
            />
            <span className="text-xs text-base-content/40">Auto</span>
          </label>
          <span className="font-medium">
            {isDirty && (
              <span className="text-warning mr-1" title="Unsaved changes">
                ●
              </span>
            )}
            {fileName}
          </span>
          <span className="text-xs text-base-content/40">
            {nodeCount} screen{nodeCount !== 1 ? "s" : ""}
          </span>
          <div className="divider divider-horizontal mx-0" />
          <button
            type="button"
            className="btn btn-ghost btn-sm text-base"
            onClick={toggleTheme}
            title={`Switch to ${theme === "lemonade" ? "dark" : "light"} mode`}
          >
            {theme === "lemonade" ? "🌙" : "☀️"}
          </button>
        </span>
      </div>

      {/* Main area: Left Sidebar + Canvas + Right Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar (Layers & Components) */}
        <div className="w-64 shrink-0 border-r border-base-content/10 bg-base-100 flex flex-col">
          {/* Layers Top Half */}
          <div className="flex-1 overflow-y-auto border-b border-base-content/10 flex flex-col min-h-0">
            <div className="sticky top-0 bg-base-100/95 backdrop-blur z-10 border-b border-base-content/5 px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-base-content/60">
                Layers
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <LayersPanel />
            </div>
          </div>

          {/* Components Bottom Half */}
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
            <div className="sticky top-0 bg-base-100/95 backdrop-blur z-10 border-b border-base-content/5 px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-base-content/60">
                Components
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ComponentPanel />
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          <SandCanvas />
          {/* Drop overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg pointer-events-none">
              <div className="text-lg font-semibold text-primary">Drop .sand file to open</div>
            </div>
          )}
        </div>

        {/* Right sidebar — Properties + Annotations */}
        <div className="w-72 shrink-0 border-l border-base-content/10 bg-base-100 flex flex-col overflow-hidden">
          {selectedIds.length > 0 && (
            <div className="flex-1 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-base-content/10 px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-base-content/50">
                  Properties
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => clearSelection()}
                >
                  ✕
                </button>
              </div>
              <PropertyPanel />
            </div>
          )}
          <ConversationPanel />
        </div>
      </div>

      {/* Context Menu (right-click) */}
      <ContextMenu />
    </div>
  );
}

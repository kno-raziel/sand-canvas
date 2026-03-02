/**
 * File Commands — Save/Open .sand files using File System Access API.
 *
 * Falls back to download/upload for browsers without File System Access API (Firefox).
 */

import { parseSandDocument, serializeSandDocument } from "@sand/core";
import { useEditorStore } from "../store/editor-store";

// File System Access API types (not available in all browsers)
const win = window as unknown as Record<string, unknown>;

const SAND_FILE_OPTS = {
  types: [
    {
      description: "Sand Design Files",
      accept: { "application/json": [".sand"] },
    },
  ],
};

/**
 * Save the current document to disk.
 * Uses existing file handle if available, otherwise prompts for location.
 */
export async function saveDocument(): Promise<boolean> {
  const store = useEditorStore.getState();
  const doc = store.exportDocument();
  const json = serializeSandDocument(doc);

  // Try File System Access API first
  if ("showSaveFilePicker" in window) {
    try {
      let handle = store.fileHandle;

      if (!handle) {
        const showSavePicker = win.showSaveFilePicker as (
          opts: unknown
        ) => Promise<FileSystemFileHandle>;
        handle = await showSavePicker({
          suggestedName: `${store.currentFileName}.sand`,
          ...SAND_FILE_OPTS,
        });
        store.setFileHandle(handle, handle.name.replace(".sand", ""));
      }

      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      store.clearDirty();
      return true;
    } catch (err) {
      // User cancelled the picker
      if (err instanceof DOMException && err.name === "AbortError") return false;
      throw err;
    }
  }

  // Fallback: download as file
  downloadFile(json, `${store.currentFileName}.sand`);
  store.clearDirty();
  return true;
}

/**
 * Open a .sand file from disk.
 */
export async function openDocument(): Promise<boolean> {
  // Try File System Access API first
  if ("showOpenFilePicker" in window) {
    try {
      const showOpenPicker = win.showOpenFilePicker as (
        opts: unknown
      ) => Promise<FileSystemFileHandle[]>;
      const [handle] = await showOpenPicker({
        ...SAND_FILE_OPTS,
        multiple: false,
      });
      const file = await handle.getFile();
      const json = await file.text();
      return loadFromJson(json, file.name, handle);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return false;
      throw err;
    }
  }

  // Fallback: file input element
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".sand";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(false);
        return;
      }
      const json = await file.text();
      resolve(loadFromJson(json, file.name));
    };
    input.click();
  });
}

/**
 * Load from a File dropped onto the canvas.
 */
export async function loadFromFile(file: File): Promise<boolean> {
  if (!file.name.endsWith(".sand")) return false;
  const json = await file.text();
  return loadFromJson(json, file.name);
}

// ─── Helpers ──────────────────────────────────────────────────

function loadFromJson(json: string, fileName: string, handle?: FileSystemFileHandle): boolean {
  const result = parseSandDocument(json);

  if (!result.ok) {
    console.error("Failed to parse .sand file:", result.error);
    alert(`Failed to open file: ${result.error}`);
    return false;
  }

  const store = useEditorStore.getState();
  store.loadDocument(result.document, undefined, handle);

  // Update the file name from the actual file
  const cleanName = fileName.replace(".sand", "");
  if (handle) {
    store.setFileHandle(handle, cleanName);
  }

  return true;
}

function downloadFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

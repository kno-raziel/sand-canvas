import { toPng } from "html-to-image";

/**
 * Captures a specific SandNode's rendered DOM element as a PNG buffer/data URL.
 */
export async function exportNodeToImage(nodeId: string): Promise<string> {
  const element = document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement;
  if (!element) {
    throw new Error(`DOM element not found for selector [data-node-id="${nodeId}"]`);
  }

  try {
    const dataUrl = await Promise.race([
      toPng(element, {
        cacheBust: true,
        pixelRatio: 2,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("html-to-image toPng timed out after 5000ms")), 5000)
      ),
    ]);
    return dataUrl;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to export node to image", err);
    throw new Error(`html-to-image failed: ${message}`);
  }
}

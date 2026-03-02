import type { ComponentDefinition, Adapter } from "@sand/core";

/**
 * In-memory registry of component library adapters.
 *
 * The editor registers adapters at startup. FrameRenderer uses
 * the registry to resolve `ref` nodes into React components.
 */
class AdapterRegistryImpl {
  private adapters = new Map<string, Adapter>();

  /** Register an adapter (daisyUI, Mantine, etc.) */
  register(adapter: Adapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  /** Unregister an adapter */
  unregister(adapterId: string): void {
    this.adapters.delete(adapterId);
  }

  /**
   * Resolve a ref string ("daisyui:Button") to a component definition.
   * Also accepts "adapterId" + "componentName" as separate args.
   */
  resolve(adapterId: string, componentName: string): ComponentDefinition | undefined {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) return undefined;
    return adapter.components.find((c) => c.name === componentName);
  }

  /** List all registered adapters */
  listAdapters(): Adapter[] {
    return Array.from(this.adapters.values());
  }

  /** List all components across all adapters (or filtered by adapter) */
  listComponents(adapterId?: string): Array<{ adapter: Adapter; component: ComponentDefinition }> {
    const result: Array<{ adapter: Adapter; component: ComponentDefinition }> = [];
    for (const adapter of this.adapters.values()) {
      if (adapterId && adapter.id !== adapterId) continue;
      for (const component of adapter.components) {
        result.push({ adapter, component });
      }
    }
    return result;
  }
}

/** Singleton adapter registry for the editor */
export const adapterRegistry = new AdapterRegistryImpl();

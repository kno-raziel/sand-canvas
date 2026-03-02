/**
 * Variable Resolution — resolves `$variable.name` references to their values.
 *
 * Used by FrameRenderer to resolve color/string/number/font variables
 * in node properties at render time.
 */

import type { VariableDefinition, ThemeValue } from "../store/editor-store";

/**
 * Resolve a value that might be a variable reference (starts with `$`).
 * Returns the resolved value, or the original if it's not a reference.
 */
export function resolveVariable(
  value: string | undefined,
  variables: Record<string, VariableDefinition>,
  activeTheme: Record<string, string>
): string | undefined {
  if (!value) return value;

  // Support both `$variable_name` and `var(variable_name)` reference formats
  let varName: string | undefined;
  if (value.startsWith("$")) {
    varName = value.slice(1);
  } else if (value.startsWith("var(") && value.endsWith(")")) {
    varName = value.slice(4, -1);
  }

  if (!varName) return value; // Not a variable reference — return as-is

  const definition = variables[varName];
  if (!definition) return value; // Variable not found — return raw reference

  if (typeof definition.value === "string") {
    return definition.value;
  }

  // Theme-aware variable — find the best matching value
  return resolveThemeValue(definition.value, activeTheme);
}

/**
 * Find the best matching theme value based on active theme settings.
 * Falls back to the first value if no match is found.
 */
function resolveThemeValue(values: ThemeValue[], activeTheme: Record<string, string>): string {
  // 1. Try exact match on all theme axes
  for (const entry of values) {
    const isMatch = Object.entries(entry.theme).every(([axis, val]) => activeTheme[axis] === val);
    if (isMatch) return entry.value;
  }

  // 2. Fallback: first value
  if (values.length > 0) return values[0].value;

  return "";
}

/**
 * Resolve a numeric value that might be a variable reference.
 */
export function resolveNumericVariable(
  value: number | string | undefined,
  variables: Record<string, VariableDefinition>,
  activeTheme: Record<string, string>
): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.startsWith("$")) {
    const resolved = resolveVariable(value, variables, activeTheme);
    if (resolved !== undefined) {
      const num = Number(resolved);
      return Number.isNaN(num) ? undefined : num;
    }
  }
  return undefined;
}

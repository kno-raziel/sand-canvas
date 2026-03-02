/**
 * @sand/adapter-daisyui — daisyUI component adapter for Sand.
 *
 * Uses the CSS-Class Engine (Level 1) to auto-generate component definitions
 * from declarative specs. Adding a new daisyUI component = adding ~10 lines of data.
 */

import { buildCssAdapter } from "@sand/core";
import { specs } from "./components";

export const daisyuiAdapter = buildCssAdapter("daisyui", "daisyUI", "5.5.17", specs);

export { specs } from "./components";

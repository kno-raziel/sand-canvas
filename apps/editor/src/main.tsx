import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "daisyui/themes.css";
import "daisyui/daisyui.css";
import "./app.css";

// Register component library adapters
import { adapterRegistry } from "./registry/adapter-registry";
import { daisyuiAdapter } from "@sand/adapter-daisyui";

adapterRegistry.register(daisyuiAdapter);

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);

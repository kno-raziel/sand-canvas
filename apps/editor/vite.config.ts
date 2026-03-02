import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { sandScreenshotPlugin } from "./src/plugins/screenshot-plugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), sandScreenshotPlugin()],
  server: {
    port: 4003,
  },
  resolve: {
    dedupe: ["react", "react-dom"],
  },
});

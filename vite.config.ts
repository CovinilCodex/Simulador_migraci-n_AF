import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Native file watching can fail on mapped drives and network shares on Windows.
  server: { watch: { usePolling: process.platform === "win32", interval: 300 } },
});

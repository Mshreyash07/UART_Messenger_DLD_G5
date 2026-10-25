import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    // In production build for GitHub Pages repository G5_DLD_UART_Messenger
    base: mode === "production" ? "/G5_DLD_UART_Messenger/" : "/",
    build: {
      outDir: "dist",
      assetsDir: "assets",
      sourcemap: false
    }
  };
});

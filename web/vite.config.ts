import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
return {
plugins: [react()],
// GitHub Pages repository path
base: mode === "production" ? "/UART_Messenger_DLD_G5/" : "/",
build: {
outDir: "dist",
assetsDir: "assets",
sourcemap: false
}
};
});

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const BACKEND_ORIGIN: string = "http://localhost:3000";

// The dev server forwards /api to the backend, so the browser sees a single
// origin and no CORS configuration is needed on the API.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: BACKEND_ORIGIN,
        changeOrigin: true,
      },
    },
  },
});

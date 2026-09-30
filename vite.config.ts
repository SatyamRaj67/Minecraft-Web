import { defineConfig } from "vite";

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "0.0.0"),
    __DEV__: JSON.stringify(process.env.NODE_ENV !== "production"),
  },
});

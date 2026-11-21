import { defineConfig } from "vite";

export default defineConfig({
  base: "/avari-fc-miniapp/",
  define: {
    __AVARI_BUILD__: JSON.stringify(process.env.GITHUB_SHA || "dev"),
  },
  server: {
    host: "127.0.0.1",
    port: 43123,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 43123,
    strictPort: true,
  },
});

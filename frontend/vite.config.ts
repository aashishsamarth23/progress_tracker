import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite"; // <-- ADD THIS IMPORT

export default defineConfig({
  plugins: [
    tanstackStart({
      server: { entry: "server" }, 
    }),
    nitro({ 
      preset: "vercel" 
    }),
    viteReact(),
    tsconfigPaths(),
    tailwindcss(), // <-- ADD THIS PLUGIN
  ],
});
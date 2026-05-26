import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [
    // Keep your custom server entry point for error handling
    tanstackStart({
      server: { entry: "server" }, 
    }),
    // Force the Nitro engine to output Vercel Serverless Functions
    nitro({ 
      preset: "vercel" 
    }),
    viteReact(),
    tsconfigPaths(),
  ],
});
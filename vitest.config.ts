import path from 'path';
import { config } from "dotenv";
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
        "@": path.resolve(__dirname, "./src")
    }
  },
  test: {
    env: {
        ...config({ path: ".env" }).parsed
    }
  }
});
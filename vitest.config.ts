import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"]
  },
  resolve: {
    alias: {
      "@ronr/contracts": new URL("./packages/contracts/src/index.ts", import.meta.url).pathname,
      "@ronr/providers": new URL("./packages/providers/src/index.ts", import.meta.url).pathname,
      "@ronr/agents": new URL("./packages/agents/src/index.ts", import.meta.url).pathname,
      "@ronr/core": new URL("./packages/core/src/index.ts", import.meta.url).pathname,
      "@ronr/web": new URL("./apps/web/src", import.meta.url).pathname
    }
  }
});

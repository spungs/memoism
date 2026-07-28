import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      // next 빌드는 "server-only"를 내부적으로 별칭 처리하지만 vitest는 모른다.
      // 자세한 이유는 test/server-only-mock.ts 참고.
      "server-only": new URL("./test/server-only-mock.ts", import.meta.url)
        .pathname,
      // tsconfig.json의 "@/*" -> "./src/*" 경로 별칭을 vitest에도 반영.
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});

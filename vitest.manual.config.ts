import { defineConfig } from "vitest/config";
import base from "./vitest.config";

/**
 * 손으로 돌리는 검증용 설정 — `*.manual.test.ts`만 실행한다.
 * 실제 Gemini를 호출하므로 기본 설정(vitest.config.ts)에선 제외돼 있다.
 *
 *   pnpm fence:recall
 */
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ["src/**/*.manual.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});

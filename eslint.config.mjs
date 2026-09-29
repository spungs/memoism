import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".claude/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "public/sw.js",
      "public/sw.js.map",
      "public/swe-worker-*.js",
      "public/workbox-*.js",
      // 빌드가 만드는 커스텀 워커 번들 (.gitignore와 같은 목록, 점검 D3)
      "public/worker-*.js",
      "public/worker-*.js.map",
      "public/fallback-*.js",
    ],
  },
];

export default eslintConfig;

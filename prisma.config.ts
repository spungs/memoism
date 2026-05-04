import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Load Next.js-style env files. .env.local takes precedence so individual
// devs can override shared defaults from .env without committing secrets.
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});

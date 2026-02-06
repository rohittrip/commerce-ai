import "dotenv/config";
import { defineConfig, env } from "prisma/config";
import path from "path";

// Load .env from project root
const envPath = path.resolve(__dirname, "../../.env");
require("dotenv").config({ path: envPath });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("NODE_DATABASE_URL"),
  },
});

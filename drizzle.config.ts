import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// This file is not used in the actual package - it is purely used to generate the schema
export default defineConfig({
    out: "./drizzle",
    schema: "./src/db/schema.ts",
    dialect: "sqlite",
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
});

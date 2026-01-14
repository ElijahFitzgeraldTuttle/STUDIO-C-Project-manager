
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8");
    envConfig.split("\n").forEach((line) => {
        const parts = line.split("=");
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join("=").trim();
            process.env[key] = value;
        }
    });
}

async function main() {
    const { pool } = await import("../server/db");

    if (!pool) {
        console.error("No database connection");
        process.exit(1);
    }

    console.log("Fixing schema manually...");

    try {
        // Tasks table missing columns
        await pool.query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium'");
        console.log("Checked/Added priority");

        await pool.query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tracking text NOT NULL DEFAULT '{}'");
        console.log("Checked/Added tracking");

        await pool.query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false");
        console.log("Checked/Added archived");

        await pool.query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archived_at timestamp");
        console.log("Checked/Added archived_at");

        await pool.query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0");
        console.log("Checked/Added sort_order");

        await pool.query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date timestamp");
        console.log("Checked/Added due_date");

        await pool.query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT NOW()");
        console.log("Checked/Added updated_at");

        await pool.query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignees text[] NOT NULL DEFAULT ARRAY[]::text[]");
        console.log("Checked/Added assignees");

        await pool.query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT ARRAY[]::text[]");
        console.log("Checked/Added tags");

        // Drop old columns
        const oldCols = ['delivered_tracking', 'invoiced_tracking', 'paid_tracking', 'distributed_tracking'];
        for (const col of oldCols) {
            await pool.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS ${col}`);
            console.log(`Dropped ${col}`);
        }

    } catch (e: any) {
        console.error("Error fixing schema:", e);
    } finally {
        process.exit(0);
    }
}

main();

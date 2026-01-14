
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { tasks, subtasks, payouts, payees, dashboards, columns, receivables } from "@shared/schema";

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

async function seed() {
    const { db } = await import("../server/db");
    console.log("Seeding database...");

    // Seed Dashboards
    const studioC = (await db.insert(dashboards).values({
        name: "Studio C Productions",
        trackingFields: ['delivered', 'invoiced', 'paid', 'distributed'],
        trackingLabels: '{}'
    }).returning())[0];

    const marketing = (await db.insert(dashboards).values({
        name: "Marketing Campaign",
        trackingFields: ['strategy_approved', 'content_ready'],
        trackingLabels: '{}'
    }).returning())[0];

    // Create default columns for Studio C
    const defaultColumns = [
        { dashboardId: studioC.id, name: "prospect", color: "#f1f5f9", order: 0 },
        { dashboardId: studioC.id, name: "scheduled", color: "#fef3c7", order: 1 },
        { dashboardId: studioC.id, name: "in-progress", color: "#dbeafe", order: 2 },
        { dashboardId: studioC.id, name: "complete", color: "#d1fae5", order: 3 },
    ];
    await db.insert(columns).values(defaultColumns);

    // Create default columns for Marketing
    const marketingColumns = [
        { dashboardId: marketing.id, name: "prospect", color: "#f1f5f9", order: 0 },
        { dashboardId: marketing.id, name: "scheduled", color: "#fef3c7", order: 1 },
        { dashboardId: marketing.id, name: "in-progress", color: "#dbeafe", order: 2 },
        { dashboardId: marketing.id, name: "complete", color: "#d1fae5", order: 3 },
    ];
    await db.insert(columns).values(marketingColumns);

    // Seed Tasks for Studio C
    const task1 = (await db.insert(tasks).values({
        title: "Commercial Shoot - Nike",
        description: "Full day shoot at downtown location. High priority for VFX team.",
        status: "in-progress",
        assignees: ["Eli", "Miles"],
        tags: ["production"],
        tracking: JSON.stringify({ delivered: true, invoiced: true, paid: false, distributed: false }),
        dashboardId: studioC.id,
        dueDate: new Date(Date.now() + 86400000 * 2), // 2 days from now
    }).returning())[0];

    await db.insert(subtasks).values({
        taskId: task1.id,
        title: "Confirm crew list",
        completed: true,
        assignees: ["Eli"],
        dueDate: new Date(),
    });

    await db.insert(subtasks).values({
        taskId: task1.id,
        title: "Equipment check",
        completed: false,
        assignees: ["Miles"],
        dueDate: new Date(Date.now() + 86400000),
    });

    // Payout for Nike
    const nikePayout = (await db.insert(payouts).values({
        taskId: task1.id,
        totalAmount: 8500
    }).returning())[0];

    await db.insert(payees).values([
        { payoutId: nikePayout.id, name: "Miles", amount: 2500, reason: "Camera Operator - Full Day", paid: false },
        { payoutId: nikePayout.id, name: "Eli", amount: 2000, reason: "Director / Producer", paid: false },
        { payoutId: nikePayout.id, name: "Sarah", amount: 1500, reason: "Lighting Technician", paid: true },
        { payoutId: nikePayout.id, name: "Jake", amount: 1200, reason: "Sound Engineer", paid: false },
        { payoutId: nikePayout.id, name: "Studio Rental", amount: 1300, reason: "Equipment & Space", paid: true }
    ]);

    const task2 = (await db.insert(tasks).values({
        title: "Post-Production: Coca Cola",
        description: "Color grading and sound design for the 30s spot.",
        status: "scheduled",
        assignees: ["Chase"],
        tags: ["post"],
        tracking: JSON.stringify({ delivered: false, invoiced: false, paid: false, distributed: false }),
        dashboardId: studioC.id,
        dueDate: new Date(Date.now() + 86400000 * 5),
    }).returning())[0];

    // Payout for Coca Cola
    const cocaPayout = (await db.insert(payouts).values({
        taskId: task2.id,
        totalAmount: 4200
    }).returning())[0];

    await db.insert(payees).values([
        { payoutId: cocaPayout.id, name: "Chase", amount: 1800, reason: "Color Grading", paid: false },
        { payoutId: cocaPayout.id, name: "Miles", amount: 1200, reason: "Sound Design & Mix", paid: false },
        { payoutId: cocaPayout.id, name: "VFX Studio", amount: 1200, reason: "Motion Graphics", paid: false }
    ]);

    const task3 = (await db.insert(tasks).values({
        title: "Wedding Video - Johnson",
        description: "Full wedding coverage with drone footage.",
        status: "complete",
        assignees: ["Eli", "Chase"],
        tags: ["wedding"],
        tracking: JSON.stringify({ delivered: true, invoiced: true, paid: true, distributed: false }),
        dashboardId: studioC.id,
        dueDate: new Date(Date.now() - 86400000 * 3),
    }).returning())[0];

    // Payout for Wedding
    const weddingPayout = (await db.insert(payouts).values({
        taskId: task3.id,
        totalAmount: 3500
    }).returning())[0];

    await db.insert(payees).values([
        { payoutId: weddingPayout.id, name: "Eli", amount: 1500, reason: "Lead Videographer", paid: false },
        { payoutId: weddingPayout.id, name: "Chase", amount: 1200, reason: "Second Camera", paid: false },
        { payoutId: weddingPayout.id, name: "Drone Pilot", amount: 800, reason: "Aerial Footage", paid: true }
    ]);

    // Marketing Task
    const task4 = (await db.insert(tasks).values({
        title: "Social Media Strategy",
        description: "Develop the Q1 strategy for Instagram and TikTok.",
        status: "prospect",
        assignees: ["Eli"],
        tags: ["marketing"],
        tracking: JSON.stringify({ strategy_approved: false, content_ready: false }),
        dashboardId: marketing.id,
        dueDate: new Date(Date.now() + 86400000 * 10),
    }).returning())[0];

    // Payout for Social Media
    const socialPayout = (await db.insert(payouts).values({
        taskId: task4.id,
        totalAmount: 2000
    }).returning())[0];

    await db.insert(payees).values([
        { payoutId: socialPayout.id, name: "Eli", amount: 1200, reason: "Strategy & Content Planning", paid: false },
        { payoutId: socialPayout.id, name: "Graphic Designer", amount: 800, reason: "Visual Assets", paid: false }
    ]);

    // Receivables
    await db.insert(receivables).values([
        {
            clientName: "Nike",
            description: "Commercial Shoot - Final Payment",
            amount: 15000,
            received: false,
        },
        {
            clientName: "Coca Cola",
            description: "Post-Production Deposit",
            amount: 5000,
            received: false,
        },
        {
            clientName: "Johnson Family",
            description: "Wedding Video - Balance Due",
            amount: 2500,
            received: false,
        },
        {
            clientName: "Local Restaurant",
            description: "Promo Video - Full Payment",
            amount: 1800,
            received: true,
        }
    ]);

    console.log("Seeding complete!");
    process.exit(0);
}

seed().catch((err) => {
    console.error(err);
    process.exit(1);
});

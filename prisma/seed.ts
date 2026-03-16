/**
 * Seed: system settings + default users for all roles.
 * Run: npx prisma db seed
 *
 * Default login (override with env: SEED_*_EMAIL, SEED_*_PASSWORD):
 * - Admin:   admin@example.com   / admin123
 * - Manager: manager@example.com / manager123
 * - Agent:   agent@example.com   / agent123
 * - Client:  client@example.com  / client123
 *
 * Re-running seed resets the admin password to admin123.
 */
import { PrismaClient } from "@prisma/client";
import { runSeed } from "../lib/seed-runner";

const prisma = new PrismaClient();

runSeed(prisma)
  .then(() => {
    console.log("Seed completed.");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

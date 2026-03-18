/**
 * Shared seed logic: system settings + default users.
 * Used by: prisma/seed.ts (CLI) and runSeedNow server action (admin).
 */
import type { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

export async function runSeed(prisma: PrismaClient): Promise<void> {
  // System settings
  await prisma.systemSetting.upsert({
    where: { settingKey: "default_timezone" },
    update: {},
    create: {
      settingKey: "default_timezone",
      settingValue: "Africa/Accra",
      settingType: "string",
      category: "system",
      description: "Default timezone",
    },
  });
  await prisma.systemSetting.upsert({
    where: { settingKey: "penalty_rate_percent_per_day" },
    update: {},
    create: {
      settingKey: "penalty_rate_percent_per_day",
      settingValue: "0.5",
      settingType: "number",
      category: "loans",
      description: "Daily penalty rate for overdue",
    },
  });
  await prisma.systemSetting.upsert({
    where: { settingKey: "session_timeout" },
    update: {},
    create: {
      settingKey: "session_timeout",
      settingValue: "30",
      settingType: "number",
      category: "system",
      description: "Session timeout in minutes",
    },
  });
  await prisma.systemSetting.upsert({
    where: { settingKey: "app_name" },
    update: {},
    create: {
      settingKey: "app_name",
      settingValue: "The Determiners Susu System",
      settingType: "string",
      category: "system",
      description: "Application name",
    },
  });
  await prisma.systemSetting.upsert({
    where: { settingKey: "app_logo" },
    update: {},
    create: {
      settingKey: "app_logo",
      settingValue: "",
      settingType: "string",
      category: "system",
      description: "Application logo path",
    },
  });

  const systemSettingsToSeed: Array<{ key: string; value: string; type: "string" | "number" | "boolean"; category: string; description: string }> = [
    { key: "currency", value: "GHS", type: "string", category: "system", description: "Display currency (amounts stored in GHS)" },
    {
      key: "currency_rate_from_ghs",
      value: "1",
      type: "number",
      category: "system",
      description: "Legacy display rate (hidden; use USD/EUR rows below)",
    },
    {
      key: "currency_rate_usd_per_ghs",
      value: "0.0916",
      type: "number",
      category: "system",
      description: "USD per 1 GHS (display)",
    },
    {
      key: "currency_rate_eur_per_ghs",
      value: "0.055",
      type: "number",
      category: "system",
      description: "EUR per 1 GHS (display)",
    },
    { key: "default_interest_rate", value: "0.5", type: "number", category: "loans", description: "Default interest rate (%)" },
    { key: "min_loan_amount", value: "5", type: "number", category: "loans", description: "Minimum loan amount" },
    { key: "max_loan_amount", value: "8", type: "number", category: "loans", description: "Maximum loan amount" },
    { key: "late_payment_fee", value: "1", type: "number", category: "loans", description: "Late payment fee" },
    { key: "backup_frequency", value: "Daily", type: "string", category: "system", description: "Backup frequency" },
    { key: "sms_enabled", value: "1", type: "boolean", category: "notifications", description: "Enable SMS notifications" },
    { key: "email_enabled", value: "1", type: "boolean", category: "notifications", description: "Enable email notifications" },
    { key: "maintenance_mode", value: "0", type: "boolean", category: "maintenance", description: "Maintenance mode" },
    { key: "max_login_attempts", value: "5", type: "number", category: "security", description: "Max login attempts" },
    { key: "password_min_length", value: "8", type: "number", category: "security", description: "Password min length" },
    { key: "require_2fa", value: "0", type: "boolean", category: "security", description: "Require 2FA" },
    { key: "lockout_duration", value: "30", type: "number", category: "security", description: "Lockout duration (minutes)" },
    { key: "business_name", value: "The Determiners", type: "string", category: "business", description: "Business name" },
    { key: "business_phone", value: "+233 123 456 789", type: "string", category: "business", description: "Business phone" },
    { key: "business_email", value: "thedeterminers@site.com", type: "string", category: "business", description: "Business email" },
    { key: "business_address", value: "232 Nii Kwashiefio Avenue, Abofu - Achimota, Ghana", type: "string", category: "business", description: "Business address" },
    { key: "business_support_email", value: "support@thedeterminers.com", type: "string", category: "business", description: "Support email" },
    { key: "business_loans_email", value: "loans@thedeterminers.com", type: "string", category: "business", description: "Loans email" },
    { key: "business_info_email", value: "info@thedeterminers.com", type: "string", category: "business", description: "Info email" },
    { key: "business_support_phone", value: "+233 302 123 457", type: "string", category: "business", description: "Support phone" },
    { key: "business_emergency_phone", value: "+233 302 123 458", type: "string", category: "business", description: "Emergency phone" },
    { key: "business_weekdays_hours", value: "Mon-Fri: 8:00 AM - 6:00 PM", type: "string", category: "business", description: "Weekdays hours" },
    { key: "business_saturday_hours", value: "Sat: 9:00 AM - 2:00 PM", type: "string", category: "business", description: "Saturday hours" },
    { key: "business_sunday_hours", value: "Sun: Closed", type: "string", category: "business", description: "Sunday hours" },
    { key: "notification_retention_days", value: "30", type: "number", category: "notifications", description: "Notification retention (days)" },
    { key: "auto_notify_payment_due", value: "0", type: "string", category: "notifications", description: "Auto notify payment due" },
    { key: "maintenance_message", value: "", type: "string", category: "maintenance", description: "Maintenance message" },
    { key: "public_home_url", value: "/", type: "string", category: "system", description: "Public home URL" },
    { key: "log_retention_days", value: "30", type: "number", category: "maintenance", description: "Log retention (days)" },
    { key: "auto_cleanup_enabled", value: "0", type: "boolean", category: "maintenance", description: "Auto cleanup" },
    { key: "debug_mode", value: "0", type: "boolean", category: "maintenance", description: "Debug mode" },
  ];
  for (const s of systemSettingsToSeed) {
    await prisma.systemSetting.upsert({
      where: { settingKey: s.key },
      update: {},
      create: {
        settingKey: s.key,
        settingValue: s.value,
        settingType: s.type,
        category: s.category,
        description: s.description,
      },
    });
  }

  const defaultPassword = (p: string) => hash(p, 10);

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  const adminHash = await defaultPassword(adminPassword);
  const adminExisting = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (adminExisting) {
    await prisma.user.update({
      where: { id: adminExisting.id },
      data: { passwordHash: adminHash, status: "active" },
    });
  } else {
    await prisma.user.create({
      data: {
        username: "admin",
        email: adminEmail,
        passwordHash: adminHash,
        role: "business_admin",
        firstName: "Admin",
        lastName: "User",
        phone: "+233000000000",
        status: "active",
      },
    });
  }

  const managerEmail = process.env.SEED_MANAGER_EMAIL ?? "manager@example.com";
  const managerHash = await defaultPassword(process.env.SEED_MANAGER_PASSWORD ?? "manager123");
  const managerExisting = await prisma.user.findUnique({ where: { email: managerEmail } });
  if (!managerExisting) {
    await prisma.user.create({
      data: {
        username: "manager",
        email: managerEmail,
        passwordHash: managerHash,
        role: "manager",
        firstName: "Manager",
        lastName: "User",
        phone: "+233000000001",
        status: "active",
      },
    });
  }

  const agentEmail = process.env.SEED_AGENT_EMAIL ?? "agent@example.com";
  const agentHash = await defaultPassword(process.env.SEED_AGENT_PASSWORD ?? "agent123");
  let agentUser = await prisma.user.findUnique({ where: { email: agentEmail } });
  if (!agentUser) {
    agentUser = await prisma.user.create({
      data: {
        username: "agent",
        email: agentEmail,
        passwordHash: agentHash,
        role: "agent",
        firstName: "Agent",
        lastName: "User",
        phone: "+233000000002",
        status: "active",
      },
    });
  }
  const agentRecord = await prisma.agent.findFirst({ where: { userId: agentUser.id } });
  if (!agentRecord) {
    await prisma.agent.create({
      data: {
        userId: agentUser.id,
        agentCode: "AG001",
        hireDate: new Date(),
        commissionRate: 5,
        status: "active",
      },
    });
  }

  const clientEmail = process.env.SEED_CLIENT_EMAIL ?? "client@example.com";
  const clientHash = await defaultPassword(process.env.SEED_CLIENT_PASSWORD ?? "client123");
  const agentForClient = await prisma.agent.findFirst({ where: { agentCode: "AG001" } });
  if (!agentForClient) throw new Error("Agent AG001 required for client seed");
  let clientUser = await prisma.user.findUnique({ where: { email: clientEmail } });
  if (!clientUser) {
    clientUser = await prisma.user.create({
      data: {
        username: "client",
        email: clientEmail,
        passwordHash: clientHash,
        role: "client",
        firstName: "Client",
        lastName: "User",
        phone: "+233000000003",
        status: "active",
      },
    });
  }
  const clientRecord = await prisma.client.findFirst({ where: { userId: clientUser.id } });
  if (!clientRecord) {
    await prisma.client.create({
      data: {
        userId: clientUser.id,
        agentId: agentForClient.id,
        clientCode: "CL001",
        dailyDepositAmount: 50,
        depositType: "fixed_amount",
        registrationDate: new Date(),
        status: "active",
      },
    });
    const createdClient = await prisma.client.findFirst({ where: { clientCode: "CL001" } });
    if (createdClient) {
      await prisma.savingsAccount.upsert({
        where: { clientId: createdClient.id },
        update: {},
        create: { clientId: createdClient.id, balance: 0 },
      });
    }
  }
}

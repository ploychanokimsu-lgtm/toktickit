import { readdirSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { seedLab4 } from "../../prisma/seed-lab4.js";
import { getPrisma } from "../../src/prisma.js";
import { assertTestDatabase } from "../helpers/test-session.js";

const prisma = getPrisma();

const migrationsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../prisma/migrations"
);

function lab4MigrationSql(): string {
  const folder = readdirSync(migrationsDir).find((name) =>
    name.endsWith("_lab4_actions_taken")
  );

  if (!folder) {
    throw new Error("Lab 4 migration folder not found.");
  }

  return readFileSync(path.join(migrationsDir, folder, "migration.sql"), "utf8");
}

describe("Lab 4 migration and seed", () => {
  it("MIG-01: the Lab 4 migration only adds the ActionTaken enum and table", () => {
    const statements = lab4MigrationSql()
      .split(";")
      .map((statement) =>
        statement
          .split("\n")
          .filter((line) => !line.trim().startsWith("--"))
          .join(" ")
          .trim()
      )
      .filter(Boolean);

    expect(statements.length).toBeGreaterThan(0);

    for (const statement of statements) {
      // Foreign-key referential actions are not data changes.
      const withoutReferentialActions = statement.replace(
        /ON (DELETE|UPDATE) (RESTRICT|CASCADE|SET NULL|NO ACTION)/gi,
        ""
      );

      expect(withoutReferentialActions).not.toMatch(
        /\b(DROP|DELETE|UPDATE|TRUNCATE|RENAME)\b/i
      );

      if (/^ALTER TABLE/i.test(statement)) {
        expect(statement).toMatch(/^ALTER TABLE "ActionTaken"/);
      }

      if (/^CREATE TABLE/i.test(statement)) {
        expect(statement).toMatch(/^CREATE TABLE "ActionTaken"/);
      }
    }
  });

  it("MIG-01: Lab 1-3 tables remain available alongside ActionTaken", async () => {
    assertTestDatabase();

    const rows = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    `;

    const tables = rows.map((row) => row.table_name);

    for (const table of [
      "Category",
      "RelatedSystem",
      "RequesterUser",
      "Session",
      "Ticket",
      "Attachment",
      "PublicComment",
      "InternalNote",
      "ActionTaken",
    ]) {
      expect(tables).toContain(table);
    }

    // Existing data is still readable through the existing models.
    await expect(prisma.ticket.count()).resolves.toBeGreaterThanOrEqual(0);
    await expect(prisma.internalNote.count()).resolves.toBeGreaterThanOrEqual(0);
  });

  it("MIG-02: ActionTaken has its foreign keys, indexes and rule checks", async () => {
    assertTestDatabase();

    const constraints = await prisma.$queryRaw<{ conname: string }[]>`
      SELECT conname FROM pg_constraint
      WHERE conrelid = '"ActionTaken"'::regclass
    `;

    const names = constraints.map((row) => row.conname);

    expect(names).toEqual(
      expect.arrayContaining([
        "ActionTaken_ticketId_fkey",
        "ActionTaken_performedById_fkey",
        "ActionTaken_assigneeId_fkey",
        "ActionTaken_updatedById_fkey",
        "ActionTaken_followUpNote_check",
        "ActionTaken_completedResult_check",
        "ActionTaken_version_check",
      ])
    );

    const indexes = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes WHERE tablename = 'ActionTaken'
    `;

    expect(indexes.map((row) => row.indexname)).toEqual(
      expect.arrayContaining([
        "ActionTaken_ticketId_actionAt_id_idx",
        "ActionTaken_performedById_actionAt_idx",
        "ActionTaken_ticketId_clientRequestId_key",
      ])
    );
  });

  it("MIG-03: the Lab 4 seed is idempotent and covers the required scenarios", async () => {
    assertTestDatabase();

    // Requires the Lab 3 seed users and reference data (npm run prisma:seed).
    await seedLab4(prisma);

    const where = { clientSubmissionId: { startsWith: "lab4-seed-" } };
    const ticketCount = await prisma.ticket.count({ where });
    const actionCount = await prisma.actionTaken.count({
      where: { ticket: where },
    });

    await seedLab4(prisma);

    expect(await prisma.ticket.count({ where })).toBe(ticketCount);
    expect(await prisma.actionTaken.count({ where: { ticket: where } })).toBe(
      actionCount
    );

    const seeded = await prisma.ticket.findMany({
      where,
      select: {
        currentStatus: true,
        itPriority: true,
        ownerId: true,
        _count: { select: { actionsTaken: true } },
      },
    });

    expect(new Set(seeded.map((ticket) => ticket.currentStatus)).size).toBe(8);
    expect(new Set(seeded.map((ticket) => ticket.itPriority)).size).toBe(3);
    expect(seeded.some((ticket) => ticket.ownerId === null)).toBe(true);
    expect(seeded.some((ticket) => ticket.ownerId !== null)).toBe(true);

    const actionCounts = seeded.map((ticket) => ticket._count.actionsTaken);

    expect(actionCounts).toContain(0);
    expect(actionCounts).toContain(1);
    expect(Math.max(...actionCounts)).toBeGreaterThanOrEqual(3);

    const statuses = await prisma.actionTaken.groupBy({
      by: ["status"],
      where: { ticket: where },
    });

    expect(statuses.map((row) => row.status).sort()).toEqual([
      "CANCELLED",
      "COMPLETED",
      "PLANNED",
    ]);

    // At least one action was performed by someone other than the owner.
    const actions = await prisma.actionTaken.findMany({
      where: { ticket: where },
      select: { performedById: true, ticket: { select: { ownerId: true } } },
    });

    expect(
      actions.some((action) => action.performedById !== action.ticket.ownerId)
    ).toBe(true);

    // A Requester with no Tickets exists for zero dashboard metrics.
    const emptyRequester = await prisma.user.findUnique({
      where: { email: "ploy.srisuk@example.com" },
      select: { _count: { select: { requesterTickets: true } } },
    });

    expect(emptyRequester?._count.requesterTickets).toBe(0);
  });
});

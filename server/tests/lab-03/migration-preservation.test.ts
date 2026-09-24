import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { assertTestDatabase } from "../helpers/test-session.js";

const prisma = getPrisma();

const migrationPath = resolve(
  process.cwd(),
  "prisma",
  "migrations",
  "20260919065657_lab3_user_auth",
  "migration.sql"
);

describe("Lab 3 migration preservation", () => {
  it("preserves the existing Lab 2 tables and physical requester table", async () => {
    assertTestDatabase();

    const tables = await prisma.$queryRaw<
      Array<{ table_name: string }>
    >`
      SELECT "table_name"
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'RequesterUser',
          'Ticket',
          'Attachment'
        )
      ORDER BY "table_name"
    `;

    expect(tables.map((table) => table.table_name)).toEqual([
      "Attachment",
      "RequesterUser",
      "Ticket",
    ]);
  });

  it("keeps ticket ownership and attachment relationships valid", async () => {
    assertTestDatabase();

    const orphanedTickets = await prisma.$queryRaw<
      Array<{ count: bigint }>
    >`
      SELECT COUNT(*)::bigint AS "count"
      FROM "Ticket" AS ticket
      LEFT JOIN "RequesterUser" AS requester
        ON requester."id" = ticket."requesterId"
      WHERE requester."id" IS NULL
    `;

    const orphanedAttachments = await prisma.$queryRaw<
      Array<{ count: bigint }>
    >`
      SELECT COUNT(*)::bigint AS "count"
      FROM "Attachment" AS attachment
      LEFT JOIN "Ticket" AS ticket
        ON ticket."id" = attachment."ticketId"
      WHERE ticket."id" IS NULL
    `;

    const missingPriorities = await prisma.$queryRaw<
      Array<{ count: bigint }>
    >`
      SELECT COUNT(*)::bigint AS "count"
      FROM "Ticket"
      WHERE "itPriority" IS NULL
    `;

    expect(orphanedTickets[0]?.count).toBe(0n);
    expect(orphanedAttachments[0]?.count).toBe(0n);
    expect(missingPriorities[0]?.count).toBe(0n);
  });

  it("backfills IT Priority before making it required without dropping Lab 2 data", async () => {
    const migration = await readFile(
      migrationPath,
      "utf8"
    );

    expect(migration).not.toMatch(
      /DROP\s+TABLE\s+"(?:Ticket|Attachment|RequesterUser)"/i
    );

    expect(migration).toContain(
      'ALTER TABLE "RequesterUser" ADD COLUMN'
    );

    expect(migration).toContain(
      'SET "itPriority" = "requestedPriority"'
    );

    const backfillPosition = migration.indexOf(
      'SET "itPriority" = "requestedPriority"'
    );

    const requiredPosition = migration.indexOf(
      'ALTER COLUMN "itPriority" SET NOT NULL'
    );

    expect(backfillPosition).toBeGreaterThan(-1);
    expect(requiredPosition).toBeGreaterThan(-1);
    expect(backfillPosition).toBeLessThan(requiredPosition);
  });
});
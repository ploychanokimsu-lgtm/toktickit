import { createHash, randomBytes } from "node:crypto";

import { TicketStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { app } from "../../src/app.js";
import { ACTIVE_STATUSES } from "../../src/dashboards.js";
import { getPrisma } from "../../src/prisma.js";
import { assertTestDatabase } from "../helpers/test-session.js";

const prisma = getPrisma();
const unique = `${Date.now()}-${Math.random()}`;
const DAY = 24 * 60 * 60 * 1000;

const ids = {
  requester: 0,
  other: 0,
  empty: 0,
  staff: 0,
  category: 0,
  system: 0,
};
const cookies = { requester: "", other: "", empty: "", staff: "" };
const ticketIds: number[] = [];
let counter = 0;

async function sessionCookie(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");

  await prisma.session.create({
    data: {
      userId,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  return `toktickit_session=${token}`;
}

async function createTicket(
  requesterId: number,
  currentStatus: TicketStatus,
  updatedDaysAgo = 1
): Promise<number> {
  counter += 1;
  const updatedAt = new Date(Date.now() - updatedDaysAgo * DAY);

  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: `LAB4-RD-${counter}-${unique}`,
      clientSubmissionId: `lab4-rd-${counter}-${unique}`,
      requesterId,
      categoryId: ids.category,
      relatedSystemId: ids.system,
      summary: `Requester dashboard ${counter}`,
      description: "Lab 4 Requester dashboard test ticket.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus,
      createdAt: new Date(updatedAt.getTime() - DAY),
      updatedAt,
    },
  });

  ticketIds.push(ticket.id);
  return ticket.id;
}

function getDashboard(cookie: string) {
  return request(app).get("/api/dashboard/requester").set("Cookie", cookie);
}

describe("Lab 4 Requester dashboard API", () => {
  beforeAll(async () => {
    assertTestDatabase();

    const make = async (label: string, role: "REQUESTER" | "IT_STAFF") =>
      (
        await prisma.user.create({
          data: {
            name: `Lab4 Dashboard ${label}`,
            email: `lab4-rdash-${label}-${unique}@example.test`,
            role,
            isActive: true,
            mustChangePassword: false,
          },
        })
      ).id;

    ids.requester = await make("requester", "REQUESTER");
    ids.other = await make("other", "REQUESTER");
    ids.empty = await make("empty", "REQUESTER");
    ids.staff = await make("staff", "IT_STAFF");

    ids.category = (
      await prisma.category.create({ data: { name: `Lab4 RDash ${unique}` } })
    ).id;
    ids.system = (
      await prisma.relatedSystem.create({ data: { name: `Lab4 RDash ${unique}` } })
    ).id;

    // Requester: 3 active (1 waiting), 2 resolved, 1 closed, 1 cancelled.
    await createTicket(ids.requester, "NEW", 0);
    await createTicket(ids.requester, "IN_PROGRESS", 2);
    await createTicket(ids.requester, "WAITING_FOR_REQUESTER", 3);
    await createTicket(ids.requester, "RESOLVED", 1);
    await createTicket(ids.requester, "RESOLVED", 20);
    await createTicket(ids.requester, "CLOSED", 30);
    await createTicket(ids.requester, "CANCELLED", 10);

    // Another Requester's Tickets must never be counted.
    await createTicket(ids.other, "WAITING_FOR_REQUESTER", 0);
    await createTicket(ids.other, "RESOLVED", 0);

    cookies.requester = await sessionCookie(ids.requester);
    cookies.other = await sessionCookie(ids.other);
    cookies.empty = await sessionCookie(ids.empty);
    cookies.staff = await sessionCookie(ids.staff);
  });

  afterAll(async () => {
    assertTestDatabase();

    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });

    const userIds = Object.values({
      a: ids.requester,
      b: ids.other,
      c: ids.empty,
      d: ids.staff,
    }).filter(Boolean);
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });

    if (ids.category) await prisma.category.delete({ where: { id: ids.category } });
    if (ids.system) await prisma.relatedSystem.delete({ where: { id: ids.system } });
  });

  it("DASH-01: counts only the signed-in Requester's Tickets and matches the database", async () => {
    const response = await getDashboard(cookies.requester);

    expect(response.status).toBe(200);

    const counts = Object.fromEntries(
      response.body.metrics.map((metric: { key: string; count: number }) => [
        metric.key,
        metric.count,
      ])
    );

    const where = { requesterId: ids.requester };

    expect(counts).toEqual({
      openTickets: await prisma.ticket.count({
        where: { ...where, currentStatus: { in: [...ACTIVE_STATUSES] } },
      }),
      waitingForMe: await prisma.ticket.count({
        where: { ...where, currentStatus: "WAITING_FOR_REQUESTER" },
      }),
      resolved: await prisma.ticket.count({ where: { ...where, currentStatus: "RESOLVED" } }),
      closed: await prisma.ticket.count({ where: { ...where, currentStatus: "CLOSED" } }),
    });

    expect(counts).toEqual({ openTickets: 3, waitingForMe: 1, resolved: 2, closed: 1 });
  });

  it("DASH-02: recent lists contain only owned Tickets, newest first, within limits", async () => {
    const response = await getDashboard(cookies.requester);
    const owned = await prisma.ticket.findMany({
      where: { requesterId: ids.requester },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((ticket) => ticket.id));

    const recent = response.body.recentlyUpdated as { id: number; updatedAt: string }[];
    const resolved = response.body.recentlyResolved as { id: number; currentStatus: string }[];

    for (const ticket of [...recent, ...resolved]) {
      expect(ownedIds.has(ticket.id)).toBe(true);
    }

    // Last 7 days only: NEW (0d), RESOLVED (1d), IN_PROGRESS (2d), WAITING (3d).
    expect(recent).toHaveLength(4);
    const times = recent.map((ticket) => new Date(ticket.updatedAt).getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);

    expect(resolved).toHaveLength(2);
    expect(resolved.every((ticket) => ticket.currentStatus === "RESOLVED")).toBe(true);

    expect(response.body.timeZone).toBe("Asia/Bangkok");
    expect(recent[0]).not.toHaveProperty("description");
  });

  it("DASH-03: returns zero counts and empty lists for a Requester with no Tickets", async () => {
    const response = await getDashboard(cookies.empty);

    expect(response.status).toBe(200);
    expect(
      response.body.metrics.every((metric: { count: number }) => metric.count === 0)
    ).toBe(true);
    expect(response.body.recentlyUpdated).toEqual([]);
    expect(response.body.recentlyResolved).toEqual([]);
  });

  it("DASH-04: every metric has a My Tickets drill-down with its statuses", async () => {
    const response = await getDashboard(cookies.requester);

    expect(
      response.body.metrics.map(
        (metric: { key: string; drillDown: { screen: string; query: { status: string } } }) => [
          metric.key,
          metric.drillDown.screen,
          metric.drillDown.query.status,
        ]
      )
    ).toEqual([
      ["openTickets", "my-tickets", "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED"],
      ["waitingForMe", "my-tickets", "WAITING_FOR_REQUESTER"],
      ["resolved", "my-tickets", "RESOLVED"],
      ["closed", "my-tickets", "CLOSED"],
    ]);
  });

  it("DASH-05: My Tickets filters by one or more statuses and rejects invalid values", async () => {
    const single = await request(app)
      .get("/api/tickets?status=RESOLVED&pageSize=50")
      .set("Cookie", cookies.requester);

    expect(single.status).toBe(200);
    expect(single.body.tickets).toHaveLength(2);
    expect(
      single.body.tickets.every((ticket: { currentStatus: string }) => ticket.currentStatus === "RESOLVED")
    ).toBe(true);

    const multiple = await request(app)
      .get(`/api/tickets?status=${ACTIVE_STATUSES.join(",")}&pageSize=50`)
      .set("Cookie", cookies.requester);

    expect(multiple.status).toBe(200);
    expect(multiple.body.pagination.totalItems).toBe(3);

    const invalid = await request(app)
      .get("/api/tickets?status=RESOLVED,DONE")
      .set("Cookie", cookies.requester);

    expect(invalid.status).toBe(400);

    // The filter never widens ownership.
    const other = await request(app)
      .get("/api/tickets?status=WAITING_FOR_REQUESTER&pageSize=50")
      .set("Cookie", cookies.other);

    expect(other.body.pagination.totalItems).toBe(1);
  });

  it("SEC-06: IT Staff cannot read the Requester dashboard", async () => {
    const response = await getDashboard(cookies.staff);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("SEC-05: unauthenticated requests return 401", async () => {
    const response = await request(app).get("/api/dashboard/requester");

    expect(response.status).toBe(401);
  });
});

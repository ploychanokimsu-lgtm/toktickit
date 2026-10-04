import { createHash, randomBytes } from "node:crypto";

import { TicketStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { app } from "../../src/app.js";
import { ACTIVE_STATUSES, recentSince } from "../../src/dashboards.js";
import { getPrisma } from "../../src/prisma.js";
import { assertTestDatabase } from "../helpers/test-session.js";

const prisma = getPrisma();
const unique = `${Date.now()}-${Math.random()}`;
const DAY = 24 * 60 * 60 * 1000;

const ids = {
  staffA: 0,
  staffB: 0,
  admin: 0,
  requester: 0,
  category: 0,
  system: 0,
};
const cookies = { staffA: "", staffB: "", admin: "", requester: "" };
const ticketIds: number[] = [];
let counter = 0;

type Metric = { key: string; count: number; drillDown: unknown };
type DashboardTicket = {
  id: number;
  currentStatus: string;
  itPriority: string;
  updatedAt: string;
};

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
  currentStatus: TicketStatus,
  ownerId: number | null,
  itPriority: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM",
  updatedDaysAgo = 1
): Promise<number> {
  counter += 1;
  const updatedAt = new Date(Date.now() - updatedDaysAgo * DAY);

  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: `LAB4-SD-${counter}-${unique}`,
      clientSubmissionId: `lab4-sd-${counter}-${unique}`,
      requesterId: ids.requester,
      ownerId,
      categoryId: ids.category,
      relatedSystemId: ids.system,
      summary: `Staff dashboard ${counter}`,
      description: "Lab 4 staff dashboard test ticket.",
      requestedPriority: itPriority,
      itPriority,
      currentStatus,
      createdAt: new Date(updatedAt.getTime() - 20 * DAY),
      updatedAt,
    },
  });

  ticketIds.push(ticket.id);
  return ticket.id;
}

async function createAction(ticketId: number, performedById: number, daysAgo: number) {
  await prisma.actionTaken.create({
    data: {
      ticketId,
      performedById,
      actionAt: new Date(Date.now() - daysAgo * DAY),
      description: "Dashboard test action",
      result: "Done",
    },
  });
}

function getDashboard(cookie: string) {
  return request(app).get("/api/dashboard/staff").set("Cookie", cookie);
}

function metric(body: { metrics: Metric[] }, key: string): number {
  return body.metrics.find((item) => item.key === key)!.count;
}

describe("Lab 4 staff dashboard API", () => {
  beforeAll(async () => {
    assertTestDatabase();

    const make = async (
      label: string,
      role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR"
    ) =>
      (
        await prisma.user.create({
          data: {
            name: `Lab4 SDash ${label}`,
            email: `lab4-sdash-${label}-${unique}@example.test`,
            role,
            isActive: true,
            mustChangePassword: false,
          },
        })
      ).id;

    ids.staffA = await make("staff-a", "IT_STAFF");
    ids.staffB = await make("staff-b", "IT_STAFF");
    ids.admin = await make("admin", "ADMINISTRATOR");
    ids.requester = await make("requester", "REQUESTER");

    ids.category = (
      await prisma.category.create({ data: { name: `Lab4 SDash ${unique}` } })
    ).id;
    ids.system = (
      await prisma.relatedSystem.create({ data: { name: `Lab4 SDash ${unique}` } })
    ).id;

    // Staff A owns two active Tickets and one closed Ticket.
    const owned = await createTicket("IN_PROGRESS", ids.staffA, "HIGH", 40);
    await createTicket("WAITING_FOR_REQUESTER", ids.staffA, "LOW");
    await createTicket("CLOSED", ids.staffA, "HIGH");
    await createTicket("NEW", null, "HIGH", 50);

    // Staff A: two actions in the last 7 days, one older.
    await createAction(owned, ids.staffA, 1);
    await createAction(owned, ids.staffA, 6);
    await createAction(owned, ids.staffA, 8);

    cookies.staffA = await sessionCookie(ids.staffA);
    cookies.staffB = await sessionCookie(ids.staffB);
    cookies.admin = await sessionCookie(ids.admin);
    cookies.requester = await sessionCookie(ids.requester);
  });

  afterAll(async () => {
    assertTestDatabase();

    await prisma.actionTaken.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });

    const userIds = [ids.staffA, ids.staffB, ids.admin, ids.requester].filter(Boolean);
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });

    if (ids.category) await prisma.category.delete({ where: { id: ids.category } });
    if (ids.system) await prisma.relatedSystem.delete({ where: { id: ids.system } });
  });

  it("UNIT-07: 'last 7 days' starts exactly 7 x 24 hours before now", () => {
    const now = new Date("2026-10-08T05:00:00.000Z");

    expect(recentSince(now).toISOString()).toBe("2026-10-01T05:00:00.000Z");
  });

  it("DASH-06: every count equals the documented database query", async () => {
    const response = await getDashboard(cookies.staffA);
    const active = { currentStatus: { in: [...ACTIVE_STATUSES] } };

    expect(response.status).toBe(200);
    expect(metric(response.body, "unassigned")).toBe(
      await prisma.ticket.count({ where: { ...active, ownerId: null } })
    );
    expect(metric(response.body, "myAssigned")).toBe(
      await prisma.ticket.count({ where: { ...active, ownerId: ids.staffA } })
    );
    expect(metric(response.body, "myActionsLast7Days")).toBe(
      await prisma.actionTaken.count({
        where: {
          performedById: ids.staffA,
          actionAt: { gte: recentSince(new Date()), lte: new Date() },
        },
      })
    );

    for (const entry of response.body.byStatus as { status: TicketStatus; count: number }[]) {
      expect(entry.count, entry.status).toBe(
        await prisma.ticket.count({ where: { currentStatus: entry.status } })
      );
    }

    for (const entry of response.body.byItPriority as {
      itPriority: "LOW" | "MEDIUM" | "HIGH";
      count: number;
    }[]) {
      expect(entry.count, entry.itPriority).toBe(
        await prisma.ticket.count({ where: { ...active, itPriority: entry.itPriority } })
      );
    }
  });

  it("DASH-07: 'My' metrics use the signed-in staff member", async () => {
    const a = await getDashboard(cookies.staffA);
    const b = await getDashboard(cookies.staffB);

    expect(metric(a.body, "myAssigned")).toBe(2);
    expect(metric(a.body, "myActionsLast7Days")).toBe(2);
    expect(metric(b.body, "myAssigned")).toBe(0);
    expect(metric(b.body, "myActionsLast7Days")).toBe(0);
  });

  it("DASH-08: Urgent lists active HIGH Tickets, oldest first, at most five", async () => {
    const response = await getDashboard(cookies.staffA);
    const urgent = response.body.urgent as DashboardTicket[];

    expect(urgent.length).toBeGreaterThan(0);
    expect(urgent.length).toBeLessThanOrEqual(5);

    for (const ticket of urgent) {
      expect(ticket.itPriority).toBe("HIGH");
      expect(ACTIVE_STATUSES).toContain(ticket.currentStatus);
    }

    const times = urgent.map((ticket) => new Date(ticket.updatedAt).getTime());
    expect([...times].sort((x, y) => x - y)).toEqual(times);
  });

  it("DASH-09: Administrators get active user counts; IT Staff do not", async () => {
    const admin = await getDashboard(cookies.admin);
    const staff = await getDashboard(cookies.staffA);

    expect(admin.status).toBe(200);
    expect(admin.body.usersByRole).toEqual({
      REQUESTER: await prisma.user.count({ where: { role: "REQUESTER", isActive: true } }),
      IT_STAFF: await prisma.user.count({ where: { role: "IT_STAFF", isActive: true } }),
      ADMINISTRATOR: await prisma.user.count({
        where: { role: "ADMINISTRATOR", isActive: true },
      }),
    });
    expect(staff.body.usersByRole).toBeNull();
  });

  it("DASH-10: the Ticket Queue accepts a comma-separated status filter", async () => {
    const response = await request(app)
      .get("/api/staff/tickets?status=RESOLVED,CLOSED&pageSize=50")
      .set("Cookie", cookies.staffA);

    expect(response.status).toBe(200);

    const statuses = new Set(
      (response.body.items ?? response.body.tickets).map(
        (ticket: { currentStatus: string }) => ticket.currentStatus
      )
    );
    for (const status of statuses) {
      expect(["RESOLVED", "CLOSED"]).toContain(status);
    }

    const total = response.body.pagination.totalItems;
    expect(total).toBe(
      await prisma.ticket.count({ where: { currentStatus: { in: ["RESOLVED", "CLOSED"] } } })
    );

    const invalid = await request(app)
      .get("/api/staff/tickets?status=RESOLVED,DONE")
      .set("Cookie", cookies.staffA);

    expect(invalid.status).toBe(400);
  });

  it("DASH-11: returns short lists and fixed-size breakdowns with drill-downs", async () => {
    const response = await getDashboard(cookies.staffA);

    expect(response.body.recentlyUpdated.length).toBeLessThanOrEqual(5);
    expect(response.body.urgent.length).toBeLessThanOrEqual(5);
    expect(response.body.byStatus).toHaveLength(8);
    expect(response.body.byItPriority).toHaveLength(3);

    const unassigned = response.body.metrics.find(
      (item: Metric) => item.key === "unassigned"
    );
    expect(unassigned.drillDown).toEqual({
      screen: "staff-queue",
      query: { assignment: "unassigned", status: ACTIVE_STATUSES.join(",") },
    });
    expect(
      response.body.metrics.find((item: Metric) => item.key === "myActionsLast7Days").drillDown
    ).toBeNull();
    expect(JSON.stringify(response.body)).not.toContain("@example");
  });

  it("SEC-06: Requesters cannot read the staff dashboard", async () => {
    const response = await getDashboard(cookies.requester);

    expect(response.status).toBe(403);
  });

  it("SEC-05: unauthenticated requests return 401", async () => {
    const response = await request(app).get("/api/dashboard/staff");

    expect(response.status).toBe(401);
  });

  it("PERF-01: responds within 500 ms with 500 extra Tickets", async () => {
    const batch = `${unique}-perf`;

    await prisma.ticket.createMany({
      data: Array.from({ length: 500 }, (_, index) => ({
        ticketNumber: `LAB4-PERF-${index}-${batch}`,
        clientSubmissionId: `lab4-perf-${index}-${batch}`,
        requesterId: ids.requester,
        ownerId: index % 3 === 0 ? null : ids.staffB,
        categoryId: ids.category,
        relatedSystemId: ids.system,
        summary: `Performance ${index}`,
        description: "Performance smoke test ticket.",
        requestedPriority: "MEDIUM" as const,
        itPriority: (["LOW", "MEDIUM", "HIGH"] as const)[index % 3],
        currentStatus: Object.values(TicketStatus)[index % 8],
      })),
    });

    const created = await prisma.ticket.findMany({
      where: { ticketNumber: { endsWith: batch } },
      select: { id: true },
    });
    ticketIds.push(...created.map((ticket) => ticket.id));

    // Warm up once, then measure.
    await getDashboard(cookies.staffB);

    const started = performance.now();
    const response = await getDashboard(cookies.staffB);
    const elapsed = performance.now() - started;

    expect(response.status).toBe(200);
    expect(elapsed).toBeLessThan(500);
  });
});

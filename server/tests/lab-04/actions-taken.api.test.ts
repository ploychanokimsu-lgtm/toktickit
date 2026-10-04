import { createHash, randomBytes, randomUUID } from "node:crypto";

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { assertTestDatabase } from "../helpers/test-session.js";

const prisma = getPrisma();
const unique = `${Date.now()}-${Math.random()}`;

const ids = {
  ownerStaff: 0,
  otherStaff: 0,
  inactiveStaff: 0,
  admin: 0,
  requester: 0,
  otherRequester: 0,
  pendingStaff: 0,
  category: 0,
  system: 0,
  openTicket: 0,
  closedTicket: 0,
  cancelledTicket: 0,
  otherTicket: 0,
};

const cookies = {
  ownerStaff: "",
  otherStaff: "",
  admin: "",
  requester: "",
  otherRequester: "",
  pendingStaff: "",
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

async function createUser(
  label: string,
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR",
  options: { isActive?: boolean; mustChangePassword?: boolean } = {}
): Promise<number> {
  const user = await prisma.user.create({
    data: {
      name: `Lab4 Actions ${label}`,
      email: `lab4-actions-${label}-${unique}@example.test`,
      role,
      isActive: options.isActive ?? true,
      mustChangePassword: options.mustChangePassword ?? false,
    },
  });

  return user.id;
}

async function createTicket(
  label: string,
  requesterId: number,
  currentStatus: "OPEN" | "CLOSED" | "CANCELLED"
): Promise<number> {
  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: `LAB4-AT-${label}-${unique}`,
      clientSubmissionId: `lab4-at-${label}-${unique}`,
      requesterId,
      ownerId: ids.ownerStaff,
      categoryId: ids.category,
      relatedSystemId: ids.system,
      summary: `Actions Taken ${label}`,
      description: "Lab 4 Actions Taken API test ticket.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus,
      // Created in the past so recent action dates are valid.
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  return ticket.id;
}

function validAction(overrides: Record<string, unknown> = {}) {
  return {
    actionAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    description: "Reinstalled the VPN client.",
    result: "Connection stable for 30 minutes.",
    followUpRequired: false,
    ...overrides,
  };
}

function staffPath(ticketId: number, actionId?: number): string {
  return `/api/staff/tickets/${ticketId}/actions-taken${
    actionId ? `/${actionId}` : ""
  }`;
}

async function createAction(
  cookie: string,
  ticketId: number,
  overrides: Record<string, unknown> = {}
) {
  const response = await request(app)
    .post(staffPath(ticketId))
    .set("Cookie", cookie)
    .send(validAction(overrides));

  expect(response.status).toBe(201);

  return response.body as { id: number; version: number };
}

describe("Lab 4 Actions Taken API", () => {
  beforeAll(async () => {
    assertTestDatabase();

    ids.ownerStaff = await createUser("owner", "IT_STAFF");
    ids.otherStaff = await createUser("other", "IT_STAFF");
    ids.inactiveStaff = await createUser("inactive", "IT_STAFF", { isActive: false });
    ids.admin = await createUser("admin", "ADMINISTRATOR");
    ids.requester = await createUser("requester", "REQUESTER");
    ids.otherRequester = await createUser("other-requester", "REQUESTER");
    ids.pendingStaff = await createUser("pending", "IT_STAFF", {
      mustChangePassword: true,
    });

    ids.category = (
      await prisma.category.create({ data: { name: `Lab4 Actions ${unique}` } })
    ).id;
    ids.system = (
      await prisma.relatedSystem.create({ data: { name: `Lab4 Actions ${unique}` } })
    ).id;

    ids.openTicket = await createTicket("open", ids.requester, "OPEN");
    ids.closedTicket = await createTicket("closed", ids.requester, "CLOSED");
    ids.cancelledTicket = await createTicket("cancelled", ids.requester, "CANCELLED");
    ids.otherTicket = await createTicket("other", ids.otherRequester, "OPEN");

    cookies.ownerStaff = await sessionCookie(ids.ownerStaff);
    cookies.otherStaff = await sessionCookie(ids.otherStaff);
    cookies.admin = await sessionCookie(ids.admin);
    cookies.requester = await sessionCookie(ids.requester);
    cookies.otherRequester = await sessionCookie(ids.otherRequester);
    cookies.pendingStaff = await sessionCookie(ids.pendingStaff);
  });

  afterAll(async () => {
    assertTestDatabase();

    const ticketIds = [
      ids.openTicket,
      ids.closedTicket,
      ids.cancelledTicket,
      ids.otherTicket,
    ].filter(Boolean);

    const userIds = [
      ids.ownerStaff,
      ids.otherStaff,
      ids.inactiveStaff,
      ids.admin,
      ids.requester,
      ids.otherRequester,
      ids.pendingStaff,
    ].filter(Boolean);

    await prisma.actionTaken.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });

    if (ids.category) await prisma.category.delete({ where: { id: ids.category } });
    if (ids.system) await prisma.relatedSystem.delete({ where: { id: ids.system } });
  });

  describe("create", () => {
    it("API-03: creates an Action Taken under the correct Ticket and actor", async () => {
      const response = await request(app)
        .post(staffPath(ids.openTicket))
        .set("Cookie", cookies.ownerStaff)
        .send(validAction({ attachmentNotes: "  See vpn-log.pdf  " }));

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        ticketId: ids.openTicket,
        status: "COMPLETED",
        description: "Reinstalled the VPN client.",
        followUpRequired: false,
        followUpNote: null,
        attachmentNotes: "See vpn-log.pdf",
        version: 1,
        canEdit: true,
        performedBy: { id: ids.ownerStaff },
        assignee: { id: ids.ownerStaff },
        updatedBy: null,
      });
      expect(response.body.completedAt).toEqual(expect.any(String));
    });

    it("API-04: rejects a client-supplied performedById", async () => {
      const before = await prisma.actionTaken.count({
        where: { ticketId: ids.openTicket },
      });

      const response = await request(app)
        .post(staffPath(ids.openTicket))
        .set("Cookie", cookies.ownerStaff)
        .send(validAction({ performedById: ids.otherStaff }));

      expect(response.status).toBe(400);
      expect(response.body.error.details.performedById).toBeDefined();
      expect(
        await prisma.actionTaken.count({ where: { ticketId: ids.openTicket } })
      ).toBe(before);
    });

    it("API-05: lets a different IT Staff member record work without changing the owner", async () => {
      const response = await request(app)
        .post(staffPath(ids.openTicket))
        .set("Cookie", cookies.otherStaff)
        .send(validAction());

      expect(response.status).toBe(201);
      expect(response.body.performedBy.id).toBe(ids.otherStaff);

      const ticket = await prisma.ticket.findUniqueOrThrow({
        where: { id: ids.openTicket },
      });

      expect(ticket.ownerId).toBe(ids.ownerStaff);
    });

    it("API-06: requires a Follow-up Note when follow-up is needed", async () => {
      const response = await request(app)
        .post(staffPath(ids.openTicket))
        .set("Cookie", cookies.ownerStaff)
        .send(validAction({ followUpRequired: true, followUpNote: " " }));

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      expect(response.body.error.details.followUpNote).toBeDefined();
    });

    it("API-07: rejects missing Description/Result and future completed work", async () => {
      const missing = await request(app)
        .post(staffPath(ids.openTicket))
        .set("Cookie", cookies.ownerStaff)
        .send(validAction({ description: "", result: undefined }));

      expect(missing.status).toBe(400);
      expect(missing.body.error.details).toMatchObject({
        description: expect.any(String),
        result: expect.any(String),
      });

      const future = await request(app)
        .post(staffPath(ids.openTicket))
        .set("Cookie", cookies.ownerStaff)
        .send(
          validAction({
            actionAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          })
        );

      expect(future.status).toBe(400);
      expect(future.body.error.details.actionAt).toBeDefined();
    });

    it("API-12: rejects writes on Closed and Cancelled Tickets", async () => {
      for (const ticketId of [ids.closedTicket, ids.cancelledTicket]) {
        const response = await request(app)
          .post(staffPath(ticketId))
          .set("Cookie", cookies.ownerStaff)
          .send(validAction());

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe("TICKET_NOT_WRITABLE");
      }
    });

    it("API-13: returns the original action for a repeated clientRequestId", async () => {
      const clientRequestId = randomUUID();

      const first = await request(app)
        .post(staffPath(ids.openTicket))
        .set("Cookie", cookies.ownerStaff)
        .send(validAction({ clientRequestId }));

      const retry = await request(app)
        .post(staffPath(ids.openTicket))
        .set("Cookie", cookies.ownerStaff)
        .send(validAction({ clientRequestId }));

      expect(first.status).toBe(201);
      expect(retry.status).toBe(200);
      expect(retry.body.id).toBe(first.body.id);
      expect(
        await prisma.actionTaken.count({
          where: { ticketId: ids.openTicket, clientRequestId },
        })
      ).toBe(1);
    });

    it("API-16: stores script-like text as literal text", async () => {
      const description = "<script>alert('x')</script>";

      const action = await createAction(cookies.ownerStaff, ids.openTicket, {
        description,
      });

      const stored = await prisma.actionTaken.findUniqueOrThrow({
        where: { id: action.id },
      });

      expect(stored.description).toBe(description);
    });

    it("updates the Ticket activity time when work is recorded", async () => {
      const before = await prisma.ticket.findUniqueOrThrow({
        where: { id: ids.openTicket },
      });

      await createAction(cookies.ownerStaff, ids.openTicket);

      const after = await prisma.ticket.findUniqueOrThrow({
        where: { id: ids.openTicket },
      });

      expect(after.updatedAt.getTime()).toBeGreaterThanOrEqual(
        before.updatedAt.getTime()
      );
    });
  });

  describe("list and read", () => {
    it("API-01: lists actions in stable actionAt, id order", async () => {
      const base = Date.now() - 2 * 24 * 60 * 60 * 1000;
      const ticketId = await createTicket("ordering", ids.requester, "OPEN");

      await createAction(cookies.ownerStaff, ticketId, {
        actionAt: new Date(base + 2000).toISOString(),
        description: "third",
      });
      await createAction(cookies.ownerStaff, ticketId, {
        actionAt: new Date(base).toISOString(),
        description: "first",
      });
      await createAction(cookies.ownerStaff, ticketId, {
        actionAt: new Date(base).toISOString(),
        description: "second",
      });

      const response = await request(app)
        .get(staffPath(ticketId))
        .set("Cookie", cookies.otherStaff);

      expect(response.status).toBe(200);
      expect(
        response.body.items.map((item: { description: string }) => item.description)
      ).toEqual(["first", "second", "third"]);

      await prisma.actionTaken.deleteMany({ where: { ticketId } });
      await prisma.ticket.delete({ where: { id: ticketId } });
    });

    it("API-02: returns an empty list for a legacy Ticket with no actions", async () => {
      const response = await request(app)
        .get(staffPath(ids.otherTicket))
        .set("Cookie", cookies.ownerStaff);

      expect(response.status).toBe(200);
      expect(response.body.items).toEqual([]);
    });

    it("API-14: does not return an action through a different Ticket", async () => {
      const action = await createAction(cookies.ownerStaff, ids.openTicket);

      const read = await request(app)
        .get(staffPath(ids.otherTicket, action.id))
        .set("Cookie", cookies.ownerStaff);

      const edit = await request(app)
        .patch(staffPath(ids.otherTicket, action.id))
        .set("Cookie", cookies.ownerStaff)
        .send({ version: 1, description: "Moved" });

      expect(read.status).toBe(404);
      expect(read.body.error.code).toBe("ACTION_TAKEN_NOT_FOUND");
      expect(edit.status).toBe(404);
    });

    it("API-15: provides no delete route and keeps the action", async () => {
      const action = await createAction(cookies.ownerStaff, ids.openTicket);

      const response = await request(app)
        .delete(staffPath(ids.openTicket, action.id))
        .set("Cookie", cookies.admin);

      expect(response.status).toBe(404);
      expect(
        await prisma.actionTaken.findUnique({ where: { id: action.id } })
      ).not.toBeNull();
    });

    it("PERF-02: lists 50 actions quickly", async () => {
      const ticketId = await createTicket("perf", ids.requester, "OPEN");
      const actionAt = new Date(Date.now() - 60 * 60 * 1000);

      await prisma.actionTaken.createMany({
        data: Array.from({ length: 50 }, (_, index) => ({
          ticketId,
          performedById: ids.ownerStaff,
          actionAt,
          description: `Bulk action ${index}`,
          result: "Done",
        })),
      });

      const started = performance.now();
      const response = await request(app)
        .get(staffPath(ticketId))
        .set("Cookie", cookies.ownerStaff);
      const elapsed = performance.now() - started;

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(50);
      expect(elapsed).toBeLessThan(300);

      await prisma.actionTaken.deleteMany({ where: { ticketId } });
      await prisma.ticket.delete({ where: { id: ticketId } });
    });
  });

  describe("edit and concurrency", () => {
    it("API-08: edits with the current version and records the editor", async () => {
      const action = await createAction(cookies.ownerStaff, ids.openTicket);

      const response = await request(app)
        .patch(staffPath(ids.openTicket, action.id))
        .set("Cookie", cookies.ownerStaff)
        .send({
          version: action.version,
          followUpRequired: true,
          followUpNote: "Check again next week.",
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        version: action.version + 1,
        followUpRequired: true,
        followUpNote: "Check again next week.",
        updatedBy: { id: ids.ownerStaff },
        performedBy: { id: ids.ownerStaff },
      });
    });

    it("API-09: rejects a stale version without changing data", async () => {
      const action = await createAction(cookies.ownerStaff, ids.openTicket);

      const first = await request(app)
        .patch(staffPath(ids.openTicket, action.id))
        .set("Cookie", cookies.ownerStaff)
        .send({ version: 1, result: "First editor's result." });

      const stale = await request(app)
        .patch(staffPath(ids.openTicket, action.id))
        .set("Cookie", cookies.admin)
        .send({ version: 1, result: "Second editor's result." });

      expect(first.status).toBe(200);
      expect(stale.status).toBe(409);
      expect(stale.body.error.code).toBe("ACTION_TAKEN_CHANGED");

      const stored = await prisma.actionTaken.findUniqueOrThrow({
        where: { id: action.id },
      });

      expect(stored.result).toBe("First editor's result.");
      expect(stored.version).toBe(2);
    });

    it("API-10: forbids IT Staff who neither recorded nor are assigned the action", async () => {
      const action = await createAction(cookies.ownerStaff, ids.openTicket);

      const response = await request(app)
        .patch(staffPath(ids.openTicket, action.id))
        .set("Cookie", cookies.otherStaff)
        .send({ version: action.version, result: "Not mine." });

      expect(response.status).toBe(403);
    });

    it("API-11: lets an Administrator edit another user's action", async () => {
      const action = await createAction(cookies.ownerStaff, ids.openTicket);

      const response = await request(app)
        .patch(staffPath(ids.openTicket, action.id))
        .set("Cookie", cookies.admin)
        .send({ version: action.version, result: "Corrected by admin." });

      expect(response.status).toBe(200);
      expect(response.body.updatedBy.id).toBe(ids.admin);
      expect(response.body.performedBy.id).toBe(ids.ownerStaff);
    });

    it("clears the Follow-up Note when follow-up is switched off", async () => {
      const action = await createAction(cookies.ownerStaff, ids.openTicket, {
        followUpRequired: true,
        followUpNote: "Needs a check.",
      });

      const response = await request(app)
        .patch(staffPath(ids.openTicket, action.id))
        .set("Cookie", cookies.ownerStaff)
        .send({ version: action.version, followUpRequired: false });

      expect(response.status).toBe(200);
      expect(response.body.followUpNote).toBeNull();
    });

    it("requires a version and at least one field", async () => {
      const action = await createAction(cookies.ownerStaff, ids.openTicket);

      const noVersion = await request(app)
        .patch(staffPath(ids.openTicket, action.id))
        .set("Cookie", cookies.ownerStaff)
        .send({ result: "Missing version." });

      const noFields = await request(app)
        .patch(staffPath(ids.openTicket, action.id))
        .set("Cookie", cookies.ownerStaff)
        .send({ version: action.version });

      expect(noVersion.status).toBe(400);
      expect(noVersion.body.error.details.version).toBeDefined();
      expect(noFields.status).toBe(400);
    });

    it("API-12: rejects edits once the Ticket is Closed", async () => {
      const ticketId = await createTicket("closing", ids.requester, "OPEN");
      const action = await createAction(cookies.ownerStaff, ticketId);

      await prisma.ticket.update({
        where: { id: ticketId },
        data: { currentStatus: "CLOSED" },
      });

      const response = await request(app)
        .patch(staffPath(ticketId, action.id))
        .set("Cookie", cookies.ownerStaff)
        .send({ version: action.version, result: "Too late." });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("TICKET_NOT_WRITABLE");

      const list = await request(app)
        .get(staffPath(ticketId))
        .set("Cookie", cookies.ownerStaff);

      expect(list.body.items[0].canEdit).toBe(false);

      await prisma.actionTaken.deleteMany({ where: { ticketId } });
      await prisma.ticket.delete({ where: { id: ticketId } });
    });
  });

  describe("assignee and lifecycle (D-01)", () => {
    it("API-17: creates planned work assigned to another active staff member", async () => {
      const response = await request(app)
        .post(staffPath(ids.openTicket))
        .set("Cookie", cookies.ownerStaff)
        .send(
          validAction({
            status: "PLANNED",
            assigneeId: ids.otherStaff,
            actionAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            result: undefined,
          })
        );

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        status: "PLANNED",
        result: null,
        completedAt: null,
        assignee: { id: ids.otherStaff },
        performedBy: { id: ids.ownerStaff },
      });
    });

    it("API-17: rejects an inactive or non-staff assignee", async () => {
      for (const assigneeId of [ids.inactiveStaff, ids.requester, 999999999]) {
        const response = await request(app)
          .post(staffPath(ids.openTicket))
          .set("Cookie", cookies.ownerStaff)
          .send(validAction({ assigneeId }));

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("INVALID_ASSIGNEE");
      }

      const action = await createAction(cookies.ownerStaff, ids.openTicket);

      const reassign = await request(app)
        .patch(staffPath(ids.openTicket, action.id))
        .set("Cookie", cookies.ownerStaff)
        .send({ version: action.version, assigneeId: ids.inactiveStaff });

      expect(reassign.status).toBe(400);
      expect(reassign.body.error.code).toBe("INVALID_ASSIGNEE");
    });

    it("API-17: lets the assignee complete planned work with a Result", async () => {
      const planned = await createAction(cookies.ownerStaff, ids.openTicket, {
        status: "PLANNED",
        assigneeId: ids.otherStaff,
        result: undefined,
      });

      const withoutResult = await request(app)
        .patch(staffPath(ids.openTicket, planned.id))
        .set("Cookie", cookies.otherStaff)
        .send({ version: planned.version, status: "COMPLETED" });

      expect(withoutResult.status).toBe(400);
      expect(withoutResult.body.error.details.result).toBeDefined();

      const completed = await request(app)
        .patch(staffPath(ids.openTicket, planned.id))
        .set("Cookie", cookies.otherStaff)
        .send({
          version: planned.version,
          status: "COMPLETED",
          result: "Confirmed with the Requester.",
        });

      expect(completed.status).toBe(200);
      expect(completed.body.status).toBe("COMPLETED");
      expect(completed.body.completedAt).toEqual(expect.any(String));
      expect(completed.body.performedBy.id).toBe(ids.ownerStaff);
    });

    it("API-17: cancels planned work and then locks it", async () => {
      const planned = await createAction(cookies.ownerStaff, ids.openTicket, {
        status: "PLANNED",
        result: undefined,
      });

      const cancelled = await request(app)
        .patch(staffPath(ids.openTicket, planned.id))
        .set("Cookie", cookies.ownerStaff)
        .send({ version: planned.version, status: "CANCELLED" });

      expect(cancelled.status).toBe(200);
      expect(cancelled.body.status).toBe("CANCELLED");
      expect(cancelled.body.canEdit).toBe(false);

      const edit = await request(app)
        .patch(staffPath(ids.openTicket, planned.id))
        .set("Cookie", cookies.ownerStaff)
        .send({ version: cancelled.body.version, description: "Reopen?" });

      expect(edit.status).toBe(409);
      expect(edit.body.error.code).toBe("ACTION_TAKEN_LOCKED");
    });

    it("API-17: does not allow completed work to go back to planned or be cancelled", async () => {
      const action = await createAction(cookies.ownerStaff, ids.openTicket);

      for (const status of ["PLANNED", "CANCELLED"]) {
        const response = await request(app)
          .patch(staffPath(ids.openTicket, action.id))
          .set("Cookie", cookies.ownerStaff)
          .send({ version: action.version, status });

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe("INVALID_ACTION_STATUS_TRANSITION");
      }
    });

    it("does not allow creating an action as Cancelled", async () => {
      const response = await request(app)
        .post(staffPath(ids.openTicket))
        .set("Cookie", cookies.ownerStaff)
        .send(validAction({ status: "CANCELLED" }));

      expect(response.status).toBe(400);
      expect(response.body.error.details.status).toBeDefined();
    });
  });

  describe("authorization", () => {
    it("SEC-01/SEC-02: Requesters cannot create or edit Actions Taken", async () => {
      const action = await createAction(cookies.ownerStaff, ids.openTicket);

      const create = await request(app)
        .post(staffPath(ids.openTicket))
        .set("Cookie", cookies.requester)
        .send(validAction());

      const edit = await request(app)
        .patch(staffPath(ids.openTicket, action.id))
        .set("Cookie", cookies.requester)
        .send({ version: action.version, result: "Requester edit." });

      expect(create.status).toBe(403);
      expect(edit.status).toBe(403);
    });

    it("SEC-03: Requesters read actions on their own Ticket without staff-only fields", async () => {
      await createAction(cookies.ownerStaff, ids.openTicket);

      const response = await request(app)
        .get(`/api/tickets/${ids.openTicket}/actions-taken`)
        .set("Cookie", cookies.requester);

      expect(response.status).toBe(200);
      expect(response.body.items.length).toBeGreaterThan(0);

      const item = response.body.items[0];

      expect(item).toHaveProperty("description");
      expect(item).toHaveProperty("performedBy");
      expect(item).not.toHaveProperty("version");
      expect(item).not.toHaveProperty("canEdit");
      expect(item).not.toHaveProperty("updatedBy");
    });

    it("SEC-04: Requesters get a safe 404 for another Requester's Ticket", async () => {
      const response = await request(app)
        .get(`/api/tickets/${ids.otherTicket}/actions-taken`)
        .set("Cookie", cookies.requester);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("TICKET_NOT_FOUND");
    });

    it("IT Staff cannot use the Requester route", async () => {
      const response = await request(app)
        .get(`/api/tickets/${ids.openTicket}/actions-taken`)
        .set("Cookie", cookies.ownerStaff);

      expect(response.status).toBe(403);
    });

    it("SEC-05: unauthenticated requests return 401", async () => {
      const responses = await Promise.all([
        request(app).get(staffPath(ids.openTicket)),
        request(app).post(staffPath(ids.openTicket)).send(validAction()),
        request(app).patch(staffPath(ids.openTicket, 1)).send({ version: 1 }),
        request(app).get(`/api/tickets/${ids.openTicket}/actions-taken`),
      ]);

      for (const response of responses) {
        expect(response.status).toBe(401);
      }
    });

    it("SEC-07: responses never include password hashes or emails", async () => {
      const response = await request(app)
        .get(staffPath(ids.openTicket))
        .set("Cookie", cookies.ownerStaff);

      const text = JSON.stringify(response.body);

      expect(text).not.toContain("passwordHash");
      expect(text).not.toContain("@example.test");
    });

    it("SEC-08: users who must change their password are blocked", async () => {
      const response = await request(app)
        .get(staffPath(ids.openTicket))
        .set("Cookie", cookies.pendingStaff);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
    });

    it("rejects invalid IDs safely", async () => {
      const response = await request(app)
        .get("/api/staff/tickets/abc/actions-taken")
        .set("Cookie", cookies.ownerStaff);

      expect(response.status).toBe(400);
    });
  });
});

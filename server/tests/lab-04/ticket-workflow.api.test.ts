import { createHash, randomBytes } from "node:crypto";

import {
  ActionTakenStatus,
  TicketStatus,
} from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import {
  STATUS_TRANSITIONS,
  resolutionGateUnmet,
} from "../../src/ticket-workflow.js";
import { assertTestDatabase } from "../helpers/test-session.js";

const prisma = getPrisma();
const unique = `${Date.now()}-${Math.random()}`;
const ALL_STATUSES = Object.values(TicketStatus);

let staffId = 0;
let adminId = 0;
let requesterId = 0;
let categoryId = 0;
let systemId = 0;
let staffCookie = "";
let adminCookie = "";
let requesterCookie = "";
let ticketCounter = 0;
const ticketIds: number[] = [];

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

type SeedAction = {
  status?: ActionTakenStatus;
  followUpRequired?: boolean;
  hoursAgo?: number;
};

async function createTicket(
  currentStatus: TicketStatus,
  options: { owned?: boolean; actions?: SeedAction[] } = {}
): Promise<number> {
  ticketCounter += 1;

  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: `LAB4-WF-${ticketCounter}-${unique}`,
      clientSubmissionId: `lab4-wf-${ticketCounter}-${unique}`,
      requesterId,
      ownerId: options.owned === false ? null : staffId,
      categoryId,
      relatedSystemId: systemId,
      summary: `Workflow ${currentStatus}`,
      description: "Lab 4 workflow API test ticket.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus,
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    },
  });

  ticketIds.push(ticket.id);

  for (const [index, action] of (options.actions ?? []).entries()) {
    const status = action.status ?? ActionTakenStatus.COMPLETED;

    await prisma.actionTaken.create({
      data: {
        ticketId: ticket.id,
        performedById: staffId,
        assigneeId: staffId,
        status,
        actionAt: new Date(
          Date.now() - (action.hoursAgo ?? 10 - index) * 60 * 60 * 1000
        ),
        description: `Action ${index}`,
        result: status === ActionTakenStatus.COMPLETED ? "Done" : null,
        followUpRequired: action.followUpRequired ?? false,
        followUpNote: action.followUpRequired ? "Check again." : null,
      },
    });
  }

  return ticket.id;
}

function patchStatus(
  ticketId: number,
  status: string,
  expectedStatus: string,
  cookie = staffCookie
) {
  return request(app)
    .patch(`/api/staff/tickets/${ticketId}/status`)
    .set("Cookie", cookie)
    .send({ status, expectedStatus });
}

async function storedStatus(ticketId: number) {
  return (
    await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })
  ).currentStatus;
}

describe("Lab 4 Ticket workflow", () => {
  beforeAll(async () => {
    assertTestDatabase();

    const make = (label: string, role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR") =>
      prisma.user.create({
        data: {
          name: `Lab4 Workflow ${label}`,
          email: `lab4-workflow-${label}-${unique}@example.test`,
          role,
          isActive: true,
          mustChangePassword: false,
        },
      });

    staffId = (await make("staff", "IT_STAFF")).id;
    adminId = (await make("admin", "ADMINISTRATOR")).id;
    requesterId = (await make("requester", "REQUESTER")).id;

    categoryId = (
      await prisma.category.create({ data: { name: `Lab4 Workflow ${unique}` } })
    ).id;
    systemId = (
      await prisma.relatedSystem.create({ data: { name: `Lab4 Workflow ${unique}` } })
    ).id;

    staffCookie = await sessionCookie(staffId);
    adminCookie = await sessionCookie(adminId);
    requesterCookie = await sessionCookie(requesterId);
  });

  afterAll(async () => {
    assertTestDatabase();

    await prisma.actionTaken.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });

    const userIds = [staffId, adminId, requesterId].filter(Boolean);
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });

    if (categoryId) await prisma.category.delete({ where: { id: categoryId } });
    if (systemId) await prisma.relatedSystem.delete({ where: { id: systemId } });
  });

  describe("resolution gate rules", () => {
    const completed = { status: ActionTakenStatus.COMPLETED, followUpRequired: false };

    it("UNIT-06: reports each unmet condition", () => {
      expect(resolutionGateUnmet({ ownerId: null, actions: [completed] })).toEqual([
        "NO_OWNER",
      ]);
      expect(resolutionGateUnmet({ ownerId: 1, actions: [] })).toEqual([
        "NO_ACTIONS_TAKEN",
      ]);
      expect(
        resolutionGateUnmet({
          ownerId: 1,
          actions: [completed, { ...completed, followUpRequired: true }],
        })
      ).toEqual(["LATEST_ACTION_NEEDS_FOLLOW_UP"]);
      expect(
        resolutionGateUnmet({
          ownerId: 1,
          actions: [completed, { status: ActionTakenStatus.PLANNED, followUpRequired: false }],
        })
      ).toEqual(["PLANNED_ACTIONS_REMAIN"]);
      expect(resolutionGateUnmet({ ownerId: 1, actions: [completed] })).toEqual([]);
    });

    it("UNIT-06: a later completed action clears an earlier follow-up", () => {
      expect(
        resolutionGateUnmet({
          ownerId: 1,
          actions: [{ ...completed, followUpRequired: true }, completed],
        })
      ).toEqual([]);
    });

    it("UNIT-06: cancelled actions are ignored", () => {
      expect(
        resolutionGateUnmet({
          ownerId: 1,
          actions: [{ status: ActionTakenStatus.CANCELLED, followUpRequired: false }],
        })
      ).toEqual(["NO_ACTIONS_TAKEN"]);
    });
  });

  describe("transition matrix", () => {
    it("WF-01: allows every permitted transition", async () => {
      for (const from of ALL_STATUSES) {
        for (const to of STATUS_TRANSITIONS[from]) {
          const ticketId = await createTicket(from, {
            actions: to === "RESOLVED" ? [{}] : [],
          });

          const response = await patchStatus(ticketId, to, from);

          expect(response.status, `${from} -> ${to}`).toBe(200);
          expect(response.body.ticket.currentStatus).toBe(to);
          expect(await storedStatus(ticketId)).toBe(to);
        }
      }
    });

    it("WF-02: rejects every transition outside the matrix", async () => {
      for (const from of ALL_STATUSES) {
        const ticketId = await createTicket(from, { actions: [{}] });

        for (const to of ALL_STATUSES) {
          if (STATUS_TRANSITIONS[from].includes(to)) continue;

          const response = await patchStatus(ticketId, to, from);

          expect(response.status, `${from} -> ${to}`).toBe(409);
          expect(response.body.error.code).toBe("INVALID_STATUS_TRANSITION");
        }

        expect(await storedStatus(ticketId)).toBe(from);
      }
    });

    it("lets an Administrator change status", async () => {
      const ticketId = await createTicket("NEW");

      const response = await patchStatus(ticketId, "OPEN", "NEW", adminCookie);

      expect(response.status).toBe(200);
    });
  });

  describe("resolution gate", () => {
    it("WF-03: blocks resolving a Ticket with no owner", async () => {
      const ticketId = await createTicket("IN_PROGRESS", { owned: false, actions: [{}] });

      const response = await patchStatus(ticketId, "RESOLVED", "IN_PROGRESS");

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("RESOLUTION_GATE_NOT_MET");
      expect(response.body.error.details.unmet).toBe("NO_OWNER");
      expect(await storedStatus(ticketId)).toBe("IN_PROGRESS");
    });

    it("WF-04: blocks resolving a Ticket with no completed actions", async () => {
      const ticketId = await createTicket("OPEN");

      const response = await patchStatus(ticketId, "RESOLVED", "OPEN");

      expect(response.status).toBe(409);
      expect(response.body.error.details.unmet).toBe("NO_ACTIONS_TAKEN");
    });

    it("WF-05: blocks resolving when the latest completed action needs follow-up", async () => {
      const ticketId = await createTicket("WAITING_FOR_REQUESTER", {
        actions: [{ hoursAgo: 5 }, { followUpRequired: true, hoursAgo: 1 }],
      });

      const response = await patchStatus(ticketId, "RESOLVED", "WAITING_FOR_REQUESTER");

      expect(response.status).toBe(409);
      expect(response.body.error.details.unmet).toBe("LATEST_ACTION_NEEDS_FOLLOW_UP");
    });

    it("blocks resolving while a planned action remains", async () => {
      const ticketId = await createTicket("REOPENED", {
        actions: [{}, { status: ActionTakenStatus.PLANNED, hoursAgo: 1 }],
      });

      const response = await patchStatus(ticketId, "RESOLVED", "REOPENED");

      expect(response.status).toBe(409);
      expect(response.body.error.details.unmet).toBe("PLANNED_ACTIONS_REMAIN");
    });

    it("WF-06: resolves a Ticket that meets the gate", async () => {
      const ticketId = await createTicket("IN_PROGRESS", {
        actions: [{ followUpRequired: true, hoursAgo: 5 }, { hoursAgo: 1 }],
      });

      const response = await patchStatus(ticketId, "RESOLVED", "IN_PROGRESS");

      expect(response.status).toBe(200);
      expect(response.body.ticket.currentStatus).toBe("RESOLVED");
    });
  });

  describe("stale updates and validation", () => {
    it("WF-07: rejects a stale expectedStatus without changing the Ticket", async () => {
      const ticketId = await createTicket("IN_PROGRESS");

      const response = await patchStatus(ticketId, "WAITING_FOR_REQUESTER", "OPEN");

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("TICKET_CHANGED");
      expect(await storedStatus(ticketId)).toBe("IN_PROGRESS");
    });

    it("WF-08: requires expectedStatus", async () => {
      const ticketId = await createTicket("NEW");

      const response = await request(app)
        .patch(`/api/staff/tickets/${ticketId}/status`)
        .set("Cookie", staffCookie)
        .send({ status: "OPEN" });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      expect(await storedStatus(ticketId)).toBe("NEW");
    });

    it("rejects unknown status values and extra fields", async () => {
      const ticketId = await createTicket("NEW");

      const unknown = await patchStatus(ticketId, "DONE", "NEW");
      const extra = await request(app)
        .patch(`/api/staff/tickets/${ticketId}/status`)
        .set("Cookie", staffCookie)
        .send({ status: "OPEN", expectedStatus: "NEW", ownerId: 1 });

      expect(unknown.status).toBe(400);
      expect(extra.status).toBe(400);
    });

    it("returns 404 for a missing Ticket", async () => {
      const response = await patchStatus(999999999, "OPEN", "NEW");

      expect(response.status).toBe(404);
    });
  });

  describe("workflow state", () => {
    it("WF-10: lists the matrix transitions and the gate state", async () => {
      const ticketId = await createTicket("IN_PROGRESS", {
        actions: [{ followUpRequired: true }],
      });

      const response = await request(app)
        .get(`/api/staff/tickets/${ticketId}/workflow`)
        .set("Cookie", staffCookie);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        currentStatus: "IN_PROGRESS",
        allowedNextStatuses: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
        resolutionGate: {
          satisfied: false,
          unmet: ["LATEST_ACTION_NEEDS_FOLLOW_UP"],
        },
        requesterResolutionIndicatedAt: null,
      });
    });

    it("WF-09: the Requester indication is advisory and visible to staff", async () => {
      const ticketId = await createTicket("WAITING_FOR_REQUESTER");

      const indicated = await request(app)
        .post(`/api/tickets/${ticketId}/problem-appears-resolved`)
        .set("Cookie", requesterCookie);

      expect(indicated.status).toBe(200);
      expect(await storedStatus(ticketId)).toBe("WAITING_FOR_REQUESTER");

      const workflow = await request(app)
        .get(`/api/staff/tickets/${ticketId}/workflow`)
        .set("Cookie", staffCookie);

      expect(workflow.body.requesterResolutionIndicatedAt).toEqual(expect.any(String));
      // The indication does not satisfy the gate.
      expect(workflow.body.resolutionGate.unmet).toContain("NO_ACTIONS_TAKEN");
    });

    it("WF-12: reopening keeps existing Actions Taken", async () => {
      const ticketId = await createTicket("RESOLVED", { actions: [{}, {}] });

      const response = await patchStatus(ticketId, "REOPENED", "RESOLVED");

      expect(response.status).toBe(200);
      expect(await prisma.actionTaken.count({ where: { ticketId } })).toBe(2);
    });
  });

  describe("authorization", () => {
    it("WF-11: Requesters cannot change status or read the workflow", async () => {
      const ticketId = await createTicket("NEW");

      const change = await patchStatus(ticketId, "OPEN", "NEW", requesterCookie);
      const workflow = await request(app)
        .get(`/api/staff/tickets/${ticketId}/workflow`)
        .set("Cookie", requesterCookie);

      expect(change.status).toBe(403);
      expect(workflow.status).toBe(403);
      expect(await storedStatus(ticketId)).toBe("NEW");
    });

    it("SEC-05: unauthenticated workflow requests return 401", async () => {
      const ticketId = await createTicket("NEW");

      const [change, workflow] = await Promise.all([
        request(app)
          .patch(`/api/staff/tickets/${ticketId}/status`)
          .send({ status: "OPEN", expectedStatus: "NEW" }),
        request(app).get(`/api/staff/tickets/${ticketId}/workflow`),
      ]);

      expect(change.status).toBe(401);
      expect(workflow.status).toBe(401);
    });
  });
});

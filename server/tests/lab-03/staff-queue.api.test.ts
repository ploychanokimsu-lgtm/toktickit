import { createHash, randomBytes } from "node:crypto";
import request from "supertest";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { assertTestDatabase } from "../helpers/test-session.js";

const prisma = getPrisma();

const unique = `${Date.now()}-${Math.random()
  .toString(16)
  .slice(2)}`;

const ticketPrefix = `Q39-${unique}`;

let requesterId: number;
let staffId: number;
let otherStaffId: number;
let categoryOneId: number;
let categoryTwoId: number;
let relatedSystemId: number;

let firstTicketId: number;
let secondTicketId: number;
let thirdTicketId: number;

let staffCookie: string;

async function createSessionCookie(
  userId: number
): Promise<string> {
  const token = randomBytes(32).toString("hex");

  await prisma.session.create({
    data: {
      userId,
      tokenHash: createHash("sha256")
        .update(token)
        .digest("hex"),
      expiresAt: new Date(
        Date.now() + 60 * 60 * 1000
      ),
    },
  });

  return `toktickit_session=${token}`;
}

function queueRequest(
  query: Record<string, string | number> = {}
) {
  return request(app)
    .get("/api/staff/tickets")
    .set("Cookie", staffCookie)
    .query(query);
}

describe("Lab 3 IT Staff Ticket Queue API", () => {
  beforeAll(async () => {
    assertTestDatabase();

    const requester = await prisma.user.create({
      data: {
        name: "Queue Test Requester",
        email: `queue-api-requester-${unique}@example.test`,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
    });

    const staff = await prisma.user.create({
      data: {
        name: "Queue Test Staff",
        email: `queue-api-staff-${unique}@example.test`,
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: false,
      },
    });

    const otherStaff = await prisma.user.create({
      data: {
        name: "Other Queue Staff",
        email: `other-queue-staff-${unique}@example.test`,
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: false,
      },
    });

    const categoryOne =
      await prisma.category.create({
        data: {
          name: `Queue Hardware ${unique}`,
          isActive: true,
        },
      });

    const categoryTwo =
      await prisma.category.create({
        data: {
          name: `Queue Access ${unique}`,
          isActive: true,
        },
      });

    const relatedSystem =
      await prisma.relatedSystem.create({
        data: {
          name: `Queue System ${unique}`,
          isActive: true,
        },
      });

    requesterId = requester.id;
    staffId = staff.id;
    otherStaffId = otherStaff.id;
    categoryOneId = categoryOne.id;
    categoryTwoId = categoryTwo.id;
    relatedSystemId = relatedSystem.id;

    const firstTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `${ticketPrefix}-001`,
        clientSubmissionId:
          `${ticketPrefix}-submission-001`,
        requesterId,
        ownerId: staffId,
        categoryId: categoryOneId,
        relatedSystemId,
        summary: "Wireless outage alpha",
        description:
          "The wireless network is unavailable.",
        requestedPriority: "HIGH",
        itPriority: "MEDIUM",
        currentStatus: "NEW",
        createdAt: new Date(
          "2026-01-01T08:00:00.000Z"
        ),
        updatedAt: new Date(
          "2026-01-01T09:00:00.000Z"
        ),
      },
    });

    const secondTicket =
      await prisma.ticket.create({
        data: {
          ticketNumber: `${ticketPrefix}-002`,
          clientSubmissionId:
            `${ticketPrefix}-submission-002`,
          requesterId,
          ownerId: null,
          categoryId: categoryTwoId,
          relatedSystemId,
          summary: "Printer toner beta",
          description:
            "The office printer requires new toner.",
          requestedPriority: "LOW",
          itPriority: "LOW",
          currentStatus: "OPEN",
          createdAt: new Date(
            "2026-01-02T08:00:00.000Z"
          ),
          updatedAt: new Date(
            "2026-01-02T09:00:00.000Z"
          ),
        },
      });

    const thirdTicket =
      await prisma.ticket.create({
        data: {
          ticketNumber: `${ticketPrefix}-003`,
          clientSubmissionId:
            `${ticketPrefix}-submission-003`,
          requesterId,
          ownerId: otherStaffId,
          categoryId: categoryOneId,
          relatedSystemId,
          summary: "VPN access gamma",
          description:
            "The requester requires VPN access.",
          requestedPriority: "MEDIUM",
          itPriority: "HIGH",
          currentStatus: "IN_PROGRESS",
          createdAt: new Date(
            "2026-01-03T08:00:00.000Z"
          ),
          updatedAt: new Date(
            "2026-01-03T09:00:00.000Z"
          ),
        },
      });

    firstTicketId = firstTicket.id;
    secondTicketId = secondTicket.id;
    thirdTicketId = thirdTicket.id;

    staffCookie =
      await createSessionCookie(staffId);
  });

  afterAll(async () => {
    await prisma.ticket.deleteMany({
      where: {
        id: {
          in: [
            firstTicketId,
            secondTicketId,
            thirdTicketId,
          ],
        },
      },
    });

    await prisma.session.deleteMany({
      where: {
        userId: {
          in: [
            requesterId,
            staffId,
            otherStaffId,
          ],
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            requesterId,
            staffId,
            otherStaffId,
          ],
        },
      },
    });

    await prisma.category.deleteMany({
      where: {
        id: {
          in: [
            categoryOneId,
            categoryTwoId,
          ],
        },
      },
    });

    await prisma.relatedSystem.delete({
      where: {
        id: relatedSystemId,
      },
    });
  });

  it("returns safe queue fields in the documented default order", async () => {
    const response = await queueRequest({
      search: ticketPrefix,
      pageSize: 100,
    }).expect(200);

    expect(
      response.body.tickets.map(
        (ticket: { id: number }) => ticket.id
      )
    ).toEqual([
      thirdTicketId,
      secondTicketId,
      firstTicketId,
    ]);

    const ticket = response.body.tickets[0];

    expect(Object.keys(ticket).sort()).toEqual([
      "category",
      "createdAt",
      "currentStatus",
      "id",
      "itPriority",
      "owner",
      "ownerId",
      "requestedPriority",
      "summary",
      "ticketNumber",
      "updatedAt",
    ]);

    expect(ticket.passwordHash).toBeUndefined();
    expect(ticket.description).toBeUndefined();
    expect(ticket.clientSubmissionId).toBeUndefined();
    expect(ticket.requesterId).toBeUndefined();
    expect(ticket.internalNotes).toBeUndefined();
    expect(ticket.publicComments).toBeUndefined();
  });

  it("searches by Ticket Number", async () => {
    const response = await queueRequest({
      search: `${ticketPrefix}-002`,
    }).expect(200);

    expect(response.body.tickets).toHaveLength(1);

    expect(
      response.body.tickets[0].id
    ).toBe(secondTicketId);
  });

  it("searches by Summary case-insensitively", async () => {
    const response = await queueRequest({
      search: "WIRELESS OUTAGE",
    }).expect(200);

    expect(
      response.body.tickets.some(
        (ticket: { id: number }) =>
          ticket.id === firstTicketId
      )
    ).toBe(true);
  });

  it("filters by Category", async () => {
    const response = await queueRequest({
      search: ticketPrefix,
      categoryId: categoryOneId,
    }).expect(200);

    expect(
      response.body.tickets.map(
        (ticket: { id: number }) => ticket.id
      )
    ).toEqual([
      thirdTicketId,
      firstTicketId,
    ]);
  });

  it("filters by Requested Priority", async () => {
    const response = await queueRequest({
      search: ticketPrefix,
      requestedPriority: "HIGH",
    }).expect(200);

    expect(
      response.body.tickets.map(
        (ticket: { id: number }) => ticket.id
      )
    ).toEqual([firstTicketId]);
  });

  it("filters by IT Priority", async () => {
    const response = await queueRequest({
      search: ticketPrefix,
      itPriority: "HIGH",
    }).expect(200);

    expect(
      response.body.tickets.map(
        (ticket: { id: number }) => ticket.id
      )
    ).toEqual([thirdTicketId]);
  });

  it("filters by Ticket Status", async () => {
    const response = await queueRequest({
      search: ticketPrefix,
      status: "OPEN",
    }).expect(200);

    expect(
      response.body.tickets.map(
        (ticket: { id: number }) => ticket.id
      )
    ).toEqual([secondTicketId]);
  });

  it("filters assigned and unassigned Tickets", async () => {
    const assigned = await queueRequest({
      search: ticketPrefix,
      assignment: "assigned",
    }).expect(200);

    expect(
      assigned.body.tickets.map(
        (ticket: { id: number }) => ticket.id
      )
    ).toEqual([
      thirdTicketId,
      firstTicketId,
    ]);

    const unassigned = await queueRequest({
      search: ticketPrefix,
      assignment: "unassigned",
    }).expect(200);

    expect(
      unassigned.body.tickets.map(
        (ticket: { id: number }) => ticket.id
      )
    ).toEqual([secondTicketId]);

    expect(
      unassigned.body.tickets[0].owner
    ).toBeNull();
  });

  it("filters Tickets assigned to the current user", async () => {
    const response = await queueRequest({
      search: ticketPrefix,
      assignment: "mine",
    }).expect(200);

    expect(
      response.body.tickets.map(
        (ticket: { id: number }) => ticket.id
      )
    ).toEqual([firstTicketId]);
  });

  it("filters by a specific Ticket Owner", async () => {
    const response = await queueRequest({
      search: ticketPrefix,
      ownerId: otherStaffId,
    }).expect(200);

    expect(
      response.body.tickets.map(
        (ticket: { id: number }) => ticket.id
      )
    ).toEqual([thirdTicketId]);

    expect(response.body.tickets[0].owner).toEqual({
      id: otherStaffId,
      name: "Other Queue Staff",
    });
  });

  it("supports deterministic explicit sorting", async () => {
    const response = await queueRequest({
      search: ticketPrefix,
      sort: "ticketNumber",
      direction: "asc",
    }).expect(200);

    expect(
      response.body.tickets.map(
        (ticket: { id: number }) => ticket.id
      )
    ).toEqual([
      firstTicketId,
      secondTicketId,
      thirdTicketId,
    ]);
  });

  it("returns correct pagination metadata", async () => {
    const response = await queueRequest({
      search: ticketPrefix,
      sort: "ticketNumber",
      direction: "asc",
      page: 2,
      pageSize: 1,
    }).expect(200);

    expect(
      response.body.tickets.map(
        (ticket: { id: number }) => ticket.id
      )
    ).toEqual([secondTicketId]);

    expect(response.body.pagination).toEqual({
      page: 2,
      pageSize: 1,
      totalItems: 3,
      totalPages: 3,
      hasPreviousPage: true,
      hasNextPage: true,
    });
  });

  it("returns an empty result for a valid search with no matches", async () => {
    const response = await queueRequest({
      search:
        `${ticketPrefix}-does-not-exist`,
    }).expect(200);

    expect(response.body.tickets).toEqual([]);

    expect(response.body.pagination).toEqual(
      expect.objectContaining({
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
      })
    );
  });

  it("rejects unsupported query parameters", async () => {
    const response = await queueRequest({
      secret: "value",
    }).expect(400);

    expect(response.body.error.code).toBe(
      "VALIDATION_ERROR"
    );

    expect(response.body.tickets).toBeUndefined();
  });

  it("rejects invalid filters and pagination values", async () => {
    const invalidPriority = await queueRequest({
      requestedPriority: "URGENT",
    }).expect(400);

    expect(invalidPriority.body.error.code).toBe(
      "VALIDATION_ERROR"
    );

    const invalidAssignment = await queueRequest({
      assignment: "someone",
    }).expect(400);

    expect(invalidAssignment.body.error.code).toBe(
      "VALIDATION_ERROR"
    );

    const invalidPageSize = await queueRequest({
      pageSize: 101,
    }).expect(400);

    expect(invalidPageSize.body.error.code).toBe(
      "VALIDATION_ERROR"
    );
  });
});
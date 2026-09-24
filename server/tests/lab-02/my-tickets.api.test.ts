import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import request from "supertest";

import app from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();

const runId = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2, 8)}`;

const uniqueMarker = `MYT-${runId}`;

const numberSeed =
  (Date.now() % 800000) + 100000;

const ticketNumbers = {
  a1: `TKT-2099-${String(numberSeed).padStart(6, "0")}`,
  a2: `TKT-2099-${String(numberSeed + 1).padStart(6, "0")}`,
  a3: `TKT-2099-${String(numberSeed + 2).padStart(6, "0")}`,
  b1: `TKT-2099-${String(numberSeed + 3).padStart(6, "0")}`,
};

describe("Lab 2 My Tickets API", () => {
  let requesterAId: number;
  let requesterBId: number;
  let inactiveRequesterId: number;

  let categoryAId: number;
  let categoryBId: number;

  let relatedSystemAId: number;
  let relatedSystemBId: number;

  beforeAll(async () => {
    const activeRequesters =
      await prisma.requesterUser.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          id: "asc",
        },
        take: 2,
      });

    if (activeRequesters.length < 2) {
      throw new Error(
        "My Tickets tests require at least two active Development Requesters."
      );
    }

    const inactiveRequester =
      await prisma.requesterUser.findFirstOrThrow({
        where: {
          isActive: false,
        },
      });

    const categories =
      await prisma.category.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          id: "asc",
        },
        take: 2,
      });

    if (categories.length < 2) {
      throw new Error(
        "My Tickets tests require at least two active Categories."
      );
    }

    const relatedSystems =
      await prisma.relatedSystem.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          id: "asc",
        },
        take: 2,
      });

    if (relatedSystems.length < 2) {
      throw new Error(
        "My Tickets tests require at least two active Related Systems."
      );
    }

    requesterAId = activeRequesters[0].id;
    requesterBId = activeRequesters[1].id;
    inactiveRequesterId = inactiveRequester.id;

    categoryAId = categories[0].id;
    categoryBId = categories[1].id;

    relatedSystemAId = relatedSystems[0].id;
    relatedSystemBId = relatedSystems[1].id;

    await prisma.ticket.createMany({
      data: [
        {
          ticketNumber: ticketNumbers.a1,
          clientSubmissionId: `my-tickets-${runId}-a1`,
          requesterId: requesterAId,
          categoryId: categoryAId,
          relatedSystemId: relatedSystemAId,
          summary: `${uniqueMarker} VPN connection drops frequently`,
          description:
            "The VPN connection disconnects repeatedly during normal use.",
          requestedPriority: "MEDIUM",
          currentStatus: "NEW",
          createdAt: new Date(
            "2026-08-28T08:00:00.000Z"
          ),
          updatedAt: new Date(
            "2026-08-28T08:00:00.000Z"
          ),
        },
        {
          ticketNumber: ticketNumbers.a2,
          clientSubmissionId: `my-tickets-${runId}-a2`,
          requesterId: requesterAId,
          categoryId: categoryBId,
          relatedSystemId: relatedSystemBId,
          summary: `${uniqueMarker} Laptop battery drains quickly`,
          description:
            "The corporate laptop battery loses charge much faster than expected.",
          requestedPriority: "HIGH",
          currentStatus: "NEW",
          createdAt: new Date(
            "2026-08-29T08:00:00.000Z"
          ),
          updatedAt: new Date(
            "2026-08-29T08:00:00.000Z"
          ),
        },
        {
          ticketNumber: ticketNumbers.a3,
          clientSubmissionId: `my-tickets-${runId}-a3`,
          requesterId: requesterAId,
          categoryId: categoryAId,
          relatedSystemId: relatedSystemBId,
          summary: `${uniqueMarker} Email access blocked`,
          description:
            "The requester cannot access the company email service.",
          requestedPriority: "LOW",
          currentStatus: "NEW",
          createdAt: new Date(
            "2026-08-30T08:00:00.000Z"
          ),
          updatedAt: new Date(
            "2026-08-30T08:00:00.000Z"
          ),
        },
        {
          ticketNumber: ticketNumbers.b1,
          clientSubmissionId: `my-tickets-${runId}-b1`,
          requesterId: requesterBId,
          categoryId: categoryBId,
          relatedSystemId: relatedSystemAId,
          summary: `${uniqueMarker} Private Requester B ticket`,
          description:
            "This ticket must never appear in Requester A results.",
          requestedPriority: "HIGH",
          currentStatus: "NEW",
          createdAt: new Date(
            "2026-08-31T08:00:00.000Z"
          ),
          updatedAt: new Date(
            "2026-08-31T08:00:00.000Z"
          ),
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.ticket.deleteMany({
      where: {
        clientSubmissionId: {
          startsWith: `my-tickets-${runId}`,
        },
      },
    });
  });

  it("requires a Development Requester context", async () => {
    const response = await request(app)
      .get("/api/tickets")
      .expect(400);

    expect(response.body.error.code).toBe(
      "REQUESTER_CONTEXT_REQUIRED"
    );
  });

  it("rejects an inactive Development Requester context", async () => {
    const response = await request(app)
      .get("/api/tickets")
      .set(
        "X-Development-Requester-Id",
        String(inactiveRequesterId)
      )
      .expect(400);

    expect(response.body.error.code).toBe(
      "INVALID_REQUESTER_CONTEXT"
    );
  });

  it("returns only Tickets owned by the selected Requester", async () => {
    const response = await request(app)
      .get(
        `/api/tickets?search=${encodeURIComponent(
          uniqueMarker
        )}&page=1&pageSize=10`
      )
      .set(
        "X-Development-Requester-Id",
        String(requesterAId)
      )
      .expect(200);

    const returnedNumbers =
      response.body.tickets.map(
        (ticket: { ticketNumber: string }) =>
          ticket.ticketNumber
      );

    expect(returnedNumbers).toEqual([
      ticketNumbers.a3,
      ticketNumbers.a2,
      ticketNumbers.a1,
    ]);

    expect(returnedNumbers).not.toContain(
      ticketNumbers.b1
    );

    for (const ticket of response.body.tickets) {
      expect(ticket.requesterId).toBe(
        requesterAId
      );
    }
  });

  it("uses updatedAt descending as the default sort", async () => {
    const response = await request(app)
      .get(
        `/api/tickets?search=${encodeURIComponent(
          uniqueMarker
        )}&page=1&pageSize=10`
      )
      .set(
        "X-Development-Requester-Id",
        String(requesterAId)
      )
      .expect(200);

    const numbers =
      response.body.tickets.map(
        (ticket: { ticketNumber: string }) =>
          ticket.ticketNumber
      );

    expect(numbers).toEqual([
      ticketNumbers.a3,
      ticketNumbers.a2,
      ticketNumbers.a1,
    ]);
  });

  it("searches by Summary", async () => {
    const response = await request(app)
      .get(
        `/api/tickets?search=${encodeURIComponent(
          `${uniqueMarker} Laptop`
        )}&page=1&pageSize=10`
      )
      .set(
        "X-Development-Requester-Id",
        String(requesterAId)
      )
      .expect(200);

    expect(response.body.tickets).toHaveLength(1);

    expect(
      response.body.tickets[0].ticketNumber
    ).toBe(ticketNumbers.a2);
  });

  it("searches by Ticket Number", async () => {
    const response = await request(app)
      .get(
        `/api/tickets?search=${encodeURIComponent(
          ticketNumbers.a1
        )}&page=1&pageSize=10`
      )
      .set(
        "X-Development-Requester-Id",
        String(requesterAId)
      )
      .expect(200);

    expect(response.body.tickets).toHaveLength(1);

    expect(
      response.body.tickets[0].ticketNumber
    ).toBe(ticketNumbers.a1);
  });

  it("filters by Category and Requested Priority", async () => {
    const response = await request(app)
      .get(
        `/api/tickets?search=${encodeURIComponent(
          uniqueMarker
        )}&categoryId=${categoryBId}&requestedPriority=HIGH&page=1&pageSize=10`
      )
      .set(
        "X-Development-Requester-Id",
        String(requesterAId)
      )
      .expect(200);

    expect(response.body.tickets).toHaveLength(1);

    expect(
      response.body.tickets[0].ticketNumber
    ).toBe(ticketNumbers.a2);
  });

  it("filters by Related System", async () => {
    const response = await request(app)
      .get(
        `/api/tickets?search=${encodeURIComponent(
          uniqueMarker
        )}&relatedSystemId=${relatedSystemAId}&page=1&pageSize=10`
      )
      .set(
        "X-Development-Requester-Id",
        String(requesterAId)
      )
      .expect(200);

    expect(response.body.tickets).toHaveLength(1);

    expect(
      response.body.tickets[0].ticketNumber
    ).toBe(ticketNumbers.a1);
  });

  it("supports explicit ascending sorting", async () => {
    const response = await request(app)
      .get(
        `/api/tickets?search=${encodeURIComponent(
          uniqueMarker
        )}&sortBy=updatedAt&sortOrder=asc&page=1&pageSize=10`
      )
      .set(
        "X-Development-Requester-Id",
        String(requesterAId)
      )
      .expect(200);

    const numbers =
      response.body.tickets.map(
        (ticket: { ticketNumber: string }) =>
          ticket.ticketNumber
      );

    expect(numbers).toEqual([
      ticketNumbers.a1,
      ticketNumbers.a2,
      ticketNumbers.a3,
    ]);
  });

  it("returns pagination metadata", async () => {
    const response = await request(app)
      .get(
        `/api/tickets?search=${encodeURIComponent(
          uniqueMarker
        )}&page=1&pageSize=10`
      )
      .set(
        "X-Development-Requester-Id",
        String(requesterAId)
      )
      .expect(200);

    expect(response.body.tickets).toHaveLength(3);

    expect(response.body.pagination).toEqual({
      page: 1,
      pageSize: 10,
      totalItems: 3,
      totalPages: 1,
    });
  });

  it("returns an empty result for a valid search with no matches", async () => {
    const response = await request(app)
      .get(
        `/api/tickets?search=${encodeURIComponent(
          `${uniqueMarker}-NO-MATCH`
        )}&page=1&pageSize=10`
      )
      .set(
        "X-Development-Requester-Id",
        String(requesterAId)
      )
      .expect(200);

    expect(response.body.tickets).toEqual([]);

    expect(response.body.pagination).toEqual({
      page: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
    });
  });

  it("rejects an unsupported page size", async () => {
    const response = await request(app)
      .get("/api/tickets?page=1&pageSize=15")
      .set(
        "X-Development-Requester-Id",
        String(requesterAId)
      )
      .expect(400);

    expect(response.body.error.code).toBe(
      "VALIDATION_ERROR"
    );
  });
});
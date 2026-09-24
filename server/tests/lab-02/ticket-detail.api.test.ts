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

describe("Lab 2 Requester Ticket Detail API", () => {
  let requesterAId: number;
  let requesterBId: number;
  let inactiveRequesterId: number;

  let ownedTicketId: number;
  let otherRequesterTicketId: number;

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
        "Ticket Detail tests require at least two active Requesters."
      );
    }

    const inactiveRequester =
      await prisma.requesterUser.findFirstOrThrow({
        where: {
          isActive: false,
        },
      });

    const category =
      await prisma.category.findFirstOrThrow({
        where: {
          isActive: true,
        },
        orderBy: {
          id: "asc",
        },
      });

    const relatedSystem =
      await prisma.relatedSystem.findFirstOrThrow({
        where: {
          isActive: true,
        },
        orderBy: {
          id: "asc",
        },
      });

    requesterAId = activeRequesters[0].id;
    requesterBId = activeRequesters[1].id;
    inactiveRequesterId = inactiveRequester.id;

    const ownedTicket =
      await prisma.ticket.create({
        data: {
          ticketNumber: `TD-A-${runId}`,
          clientSubmissionId: `ticket-detail-${runId}-a`,
          requesterId: requesterAId,
          categoryId: category.id,
          relatedSystemId: relatedSystem.id,
          summary: "Owned Ticket Detail test",
          description:
            "This ticket belongs to Requester A and must be visible to Requester A.",
          requestedPriority: "MEDIUM",
          currentStatus: "NEW",
        },
      });

    const otherTicket =
      await prisma.ticket.create({
        data: {
          ticketNumber: `TD-B-${runId}`,
          clientSubmissionId: `ticket-detail-${runId}-b`,
          requesterId: requesterBId,
          categoryId: category.id,
          relatedSystemId: relatedSystem.id,
          summary: "Requester B private Ticket",
          description:
            "This ticket belongs to Requester B and must not be visible to Requester A.",
          requestedPriority: "HIGH",
          currentStatus: "NEW",
        },
      });

    ownedTicketId = ownedTicket.id;
    otherRequesterTicketId =
      otherTicket.id;
  });

  afterAll(async () => {
    await prisma.ticket.deleteMany({
      where: {
        clientSubmissionId: {
          startsWith: `ticket-detail-${runId}`,
        },
      },
    });
  });

  it("returns one owned Ticket with read-only detail data", async () => {
    const response = await request(app)
      .get(`/api/tickets/${ownedTicketId}`)
      .set(
        "X-Development-Requester-Id",
        String(requesterAId)
      )
      .expect(200);

    expect(response.body.ticket).toEqual(
      expect.objectContaining({
        id: ownedTicketId,
        requesterId: requesterAId,
        summary: "Owned Ticket Detail test",
        requestedPriority: "MEDIUM",
        currentStatus: "NEW",
      })
    );

    expect(
      response.body.ticket.requester
    ).toEqual(
      expect.objectContaining({
        id: requesterAId,
        name: expect.any(String),
        email: expect.any(String),
      })
    );

    expect(
      response.body.ticket.category
    ).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: expect.any(String),
      })
    );

    expect(
      response.body.ticket.relatedSystem
    ).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: expect.any(String),
      })
    );
  });

  it("requires a Development Requester context", async () => {
    const response = await request(app)
      .get(`/api/tickets/${ownedTicketId}`)
      .expect(400);

    expect(response.body.error.code).toBe(
      "REQUESTER_CONTEXT_REQUIRED"
    );
  });

  it("rejects an inactive Requester context", async () => {
    const response = await request(app)
      .get(`/api/tickets/${ownedTicketId}`)
      .set(
        "X-Development-Requester-Id",
        String(inactiveRequesterId)
      )
      .expect(400);

    expect(response.body.error.code).toBe(
      "INVALID_REQUESTER_CONTEXT"
    );
  });

  it("does not return another Requester's Ticket", async () => {
    const response = await request(app)
      .get(
        `/api/tickets/${otherRequesterTicketId}`
      )
      .set(
        "X-Development-Requester-Id",
        String(requesterAId)
      )
      .expect(404);

    expect(response.body.error.code).toBe(
      "TICKET_NOT_FOUND"
    );
  });

  it("returns the same safe 404 for a missing Ticket", async () => {
    const response = await request(app)
      .get("/api/tickets/999999999")
      .set(
        "X-Development-Requester-Id",
        String(requesterAId)
      )
      .expect(404);

    expect(response.body.error.code).toBe(
      "TICKET_NOT_FOUND"
    );
  });

  it("rejects an invalid Ticket ID", async () => {
    const response = await request(app)
      .get("/api/tickets/not-a-number")
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
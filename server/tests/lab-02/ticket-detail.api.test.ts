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
import { cookieFor } from "../helpers/test-session.js";


const prisma = getPrisma();

const runId = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2, 8)}`;

describe("Lab 2 Requester Ticket Detail API", () => {
  let requesterAId: number;
  let requesterBId: number;
  let inactiveRequesterId: number;
  let requesterCookie: string;
  let inactiveCookie: string;

  let ownedTicketId: number;
  let otherRequesterTicketId: number;

  beforeAll(async () => {
    const activeRequesters =
      await prisma.user.findMany({
        where: { isActive: true, role: "REQUESTER" },
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
      await prisma.user.findFirstOrThrow({
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
    requesterCookie = await cookieFor(requesterAId);
    inactiveCookie = await cookieFor(inactiveRequesterId);

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
          itPriority: "MEDIUM",
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
          itPriority: "HIGH",
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
      .set("Cookie", requesterCookie)
      .expect(200);

    expect(response.body.ticket).toEqual(
      expect.objectContaining({
        id: ownedTicketId,
        requesterId: requesterAId,
        summary: "Owned Ticket Detail test",
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
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

  it("requires a signed-in session", async () => {
    const response = await request(app)
      .get(`/api/tickets/${ownedTicketId}`)
      .expect(401);

    expect(response.body.error.code).toBe(
      "UNAUTHENTICATED"
    );
  });

  it("rejects an inactive requester session", async () => {
    const response = await request(app)
      .get(`/api/tickets/${ownedTicketId}`)
      .set("Cookie", inactiveCookie)
      .expect(401);

    expect(response.body.error.code).toBe(
      "UNAUTHENTICATED"
    );
  });

  it("does not return another Requester's Ticket", async () => {
    const response = await request(app)
      .get(
        `/api/tickets/${otherRequesterTicketId}`
      )
      .set("Cookie", requesterCookie)
      .expect(404);

    expect(response.body.error.code).toBe(
      "TICKET_NOT_FOUND"
    );
  });

  it("returns the same safe 404 for a missing Ticket", async () => {
    const response = await request(app)
      .get("/api/tickets/999999999")
      .set("Cookie", requesterCookie)
      .expect(404);

    expect(response.body.error.code).toBe(
      "TICKET_NOT_FOUND"
    );
  });

  it("rejects an invalid Ticket ID", async () => {
    const response = await request(app)
      .get("/api/tickets/not-a-number")
      .set("Cookie", requesterCookie)
      .expect(400);

    expect(response.body.error.code).toBe(
      "VALIDATION_ERROR"
    );
  });
});

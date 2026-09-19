import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { cookieFor } from "../helpers/test-session.js";


const prisma = getPrisma();

describe("Lab 2 Create Ticket API", () => {
  let requesterId: number;
  let requesterCookie: string;
  let categoryId: number;
  let relatedSystemId: number;

  beforeEach(async () => {
    const requester = await prisma.user.findFirstOrThrow({
      where: { isActive: true, role: "REQUESTER" },
      orderBy: { id: "asc" },
    });

    const category = await prisma.category.findFirstOrThrow({
      where: { isActive: true },
      orderBy: { id: "asc" },
    });

    const relatedSystem = await prisma.relatedSystem.findFirstOrThrow({
      where: { isActive: true },
      orderBy: { id: "asc" },
    });

    requesterId = requester.id;
    requesterCookie = await cookieFor(requesterId);
    categoryId = category.id;
    relatedSystemId = relatedSystem.id;
  });

  it("returns active Related Systems", async () => {
    const response = await request(app)
      .get("/api/related-systems")
      .set("Cookie", requesterCookie)
      .expect(200);

    expect(response.body.relatedSystems).toBeInstanceOf(Array);
    expect(response.body.relatedSystems.length).toBeGreaterThan(0);

    for (const system of response.body.relatedSystems) {
      expect(system).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
        })
      );
    }
  });

  it("creates a valid Ticket and returns its official Ticket Number", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("Cookie", requesterCookie)
      .send({
        clientSubmissionId: crypto.randomUUID(),
        categoryId,
        relatedSystemId,
        summary: "Laptop battery drains very quickly",
        requestedPriority: "MEDIUM",
        description:
          "The laptop battery drops from full charge to twenty percent within one hour.",
      })
      .expect(201);

    expect(response.body.ticket).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        ticketNumber: expect.stringMatching(/^TKT-\d{4}-\d{6}$/),
        requesterId,
        categoryId,
        relatedSystemId,
        summary: "Laptop battery drains very quickly",
        requestedPriority: "MEDIUM",
        currentStatus: "NEW",
      })
    );

    const savedTicket = await prisma.ticket.findUnique({
      where: {
        id: response.body.ticket.id,
      },
    });

    expect(savedTicket).not.toBeNull();
    expect(savedTicket?.requesterId).toBe(requesterId);
    expect(savedTicket?.ticketNumber).toBe(
      response.body.ticket.ticketNumber
    );
  });

  it("rejects a Ticket with a missing Summary", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("Cookie", requesterCookie)
      .send({
        clientSubmissionId: crypto.randomUUID(),
        categoryId,
        relatedSystemId,
        summary: "",
        requestedPriority: "MEDIUM",
        description:
          "The laptop battery drops from full charge to twenty percent within one hour.",
      })
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a Summary shorter than 5 characters after trimming", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("Cookie", requesterCookie)
      .send({
        clientSubmissionId: crypto.randomUUID(),
        categoryId,
        relatedSystemId,
        summary: " abc ",
        requestedPriority: "MEDIUM",
        description:
          "The laptop battery drops from full charge to twenty percent within one hour.",
      })
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a Description shorter than 10 characters after trimming", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("Cookie", requesterCookie)
      .send({
        clientSubmissionId: crypto.randomUUID(),
        categoryId,
        relatedSystemId,
        summary: "Laptop battery problem",
        requestedPriority: "MEDIUM",
        description: " short ",
      })
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an invalid Requested Priority", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("Cookie", requesterCookie)
      .send({
        clientSubmissionId: crypto.randomUUID(),
        categoryId,
        relatedSystemId,
        summary: "Laptop battery problem",
        requestedPriority: "URGENT",
        description:
          "The laptop battery is draining much faster than expected.",
      })
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("ignores a forged inactive requester ID and uses the session owner", async () => {
    const inactiveRequester =
      await prisma.user.findFirstOrThrow({
        where: {
          isActive: false,
        },
      });

    const response = await request(app)
      .post("/api/tickets")
      .set("Cookie", requesterCookie)
      .send({
        clientSubmissionId: crypto.randomUUID(),
        requesterId: inactiveRequester.id,
        categoryId,
        relatedSystemId,
        summary: "Laptop battery problem",
        requestedPriority: "LOW",
        description:
          "The laptop battery is draining much faster than expected.",
      })
      .expect(201);

    expect(response.body.ticket.requesterId).toBe(requesterId);
    expect(response.body.ticket.requesterId).not.toBe(inactiveRequester.id);
  });

  it("trims Summary and Description before saving", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("Cookie", requesterCookie)
      .send({
        clientSubmissionId: crypto.randomUUID(),
        categoryId,
        relatedSystemId,
        summary: "   Laptop battery problem   ",
        requestedPriority: "HIGH",
        description:
          "   The laptop battery is draining much faster than expected.   ",
      })
      .expect(201);

    expect(response.body.ticket.summary).toBe(
      "Laptop battery problem"
    );

    expect(response.body.ticket.description).toBe(
      "The laptop battery is draining much faster than expected."
    );
  });
});
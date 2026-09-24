import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

import app from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("GET /api/requesters", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns only active Development Requesters", async () => {
    const response = await request(app).get("/api/requesters");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.requesters)).toBe(true);

    const names = response.body.requesters.map(
      (requester: { name: string }) => requester.name
    );

    expect(names).toContain("Jennifer Anderson");
    expect(names).toContain("Michael Brown");
    expect(names).toContain("Narin Chaiyasit");
    expect(names).toContain("Ploy Srisuk");
  });

  it("does not return the inactive Development Requester", async () => {
    const response = await request(app).get("/api/requesters");

    expect(response.status).toBe(200);

    const names = response.body.requesters.map(
      (requester: { name: string }) => requester.name
    );

    expect(names).not.toContain("Alex Turner");
  });

  it("returns requester id, name, and email only", async () => {
    const response = await request(app).get("/api/requesters");

    expect(response.status).toBe(200);

    for (const requester of response.body.requesters) {
      expect(requester).toEqual({
        id: expect.any(Number),
        name: expect.any(String),
        email: expect.any(String),
      });

      expect(requester).not.toHaveProperty("isActive");
      expect(requester).not.toHaveProperty("createdAt");
      expect(requester).not.toHaveProperty("updatedAt");
    }
  });

  it("returns a safe error if requester retrieval fails", async () => {
    const prisma = getPrisma();

    vi.spyOn(prisma.requesterUser, "findMany").mockRejectedValueOnce(
      new Error("Simulated database failure")
    );

    const response = await request(app).get("/api/requesters");

    expect(response.status).toBe(500);

    expect(response.body).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch Development Requesters.",
      },
    });

    expect(JSON.stringify(response.body)).not.toContain(
      "Simulated database failure"
    );
  });
});
import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { cookieFor } from "../helpers/test-session.js";

describe("Lab 3 removal of Development Requester directory", () => {
  it("does not expose /api/requesters without authentication", async () => {
    const response = await request(app).get("/api/requesters");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("does not expose the removed requester directory to signed-in users", async () => {
    const user = await getPrisma().user.findFirstOrThrow({
      where: { isActive: true, role: "REQUESTER" },
    });
    const response = await request(app).get("/api/requesters")
      .set("Cookie", await cookieFor(user.id));
    expect(response.status).toBe(404);
  });

  it("returns only safe fields for the authenticated user", async () => {
    const user = await getPrisma().user.findFirstOrThrow({
      where: { isActive: true, role: "REQUESTER" },
    });
    const response = await request(app).get("/api/auth/me")
      .set("Cookie", await cookieFor(user.id));
    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({
      id: user.id,
      name: user.name,
      email: user.email,
      role: "REQUESTER",
      mustChangePassword: false,
    });
    expect(response.body.user).not.toHaveProperty("passwordHash");
    expect(response.body.user).not.toHaveProperty("isActive");
  });
});


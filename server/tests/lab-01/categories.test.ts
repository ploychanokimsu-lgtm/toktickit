import { describe, it, expect } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { cookieFor } from "../helpers/test-session.js";

import request from "supertest";
import { app } from "../../src/app.js";

describe("GET /api/categories", () => {
  it("returns the four seeded categories in id order", async () => {
    const requester = await getPrisma().user.findFirstOrThrow({
      where: { role: "REQUESTER", isActive: true },
    });
    const response = await request(app).get("/api/categories")
      .set("Cookie", await cookieFor(requester.id));

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(4);

    expect(response.body.map((category: { name: string }) => category.name))
      .toEqual([
        "Account and Access",
        "Hardware",
        "Software",
        "Network",
      ]);

    const ids = response.body.map(
      (category: { id: number }) => category.id
    );

    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });
});
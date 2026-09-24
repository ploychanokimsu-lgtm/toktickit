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

let requesterId: number;
let staffId: number;
let pendingStaffId: number;
let administratorId: number;

let requesterCookie: string;
let staffCookie: string;
let pendingStaffCookie: string;
let administratorCookie: string;

async function createSessionCookie(
  userId: number
): Promise<string> {
  const token = randomBytes(32).toString("hex");

  const tokenHash = createHash("sha256")
    .update(token)
    .digest("hex");

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(
        Date.now() + 60 * 60 * 1000
      ),
    },
  });

  return `toktickit_session=${token}`;
}

describe("Lab 3 authorization matrix", () => {
  beforeAll(async () => {
    assertTestDatabase();

    const requester = await prisma.user.create({
      data: {
        name: "Queue Requester",
        email: `queue-requester-${unique}@example.test`,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
    });

    const staff = await prisma.user.create({
      data: {
        name: "Queue Staff",
        email: `queue-staff-${unique}@example.test`,
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: false,
      },
    });

    const pendingStaff = await prisma.user.create({
      data: {
        name: "Pending Queue Staff",
        email: `pending-queue-staff-${unique}@example.test`,
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: true,
      },
    });

    const administrator =
      await prisma.user.create({
        data: {
          name: "Queue Administrator",
          email: `queue-administrator-${unique}@example.test`,
          role: "ADMINISTRATOR",
          isActive: true,
          mustChangePassword: false,
        },
      });

    requesterId = requester.id;
    staffId = staff.id;
    pendingStaffId = pendingStaff.id;
    administratorId = administrator.id;

    requesterCookie =
      await createSessionCookie(requesterId);

    staffCookie =
      await createSessionCookie(staffId);

    pendingStaffCookie =
      await createSessionCookie(pendingStaffId);

    administratorCookie =
      await createSessionCookie(administratorId);
  });

  afterAll(async () => {
    await prisma.session.deleteMany({
      where: {
        userId: {
          in: [
            requesterId,
            staffId,
            pendingStaffId,
            administratorId,
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
            pendingStaffId,
            administratorId,
          ],
        },
      },
    });
  });

  it("rejects unauthenticated Ticket Queue access", async () => {
    const response = await request(app)
      .get("/api/staff/tickets")
      .expect(401);

    expect(response.body.error.code).toBe(
      "UNAUTHENTICATED"
    );

    expect(response.body.tickets).toBeUndefined();
  });

  it("forbids an authenticated Requester", async () => {
    const response = await request(app)
      .get("/api/staff/tickets")
      .set("Cookie", requesterCookie)
      .expect(403);

    expect(response.body.error.code).toBe(
      "FORBIDDEN"
    );

    expect(response.body.tickets).toBeUndefined();
  });

  it("requires IT Staff to change their initial password first", async () => {
    const response = await request(app)
      .get("/api/staff/tickets")
      .set("Cookie", pendingStaffCookie)
      .expect(403);

    expect(response.body.error.code).toBe(
      "PASSWORD_CHANGE_REQUIRED"
    );

    expect(response.body.tickets).toBeUndefined();
  });

  it("allows authenticated IT Staff", async () => {
    const response = await request(app)
      .get("/api/staff/tickets")
      .set("Cookie", staffCookie)
      .expect(200);

    expect(Array.isArray(response.body.tickets)).toBe(
      true
    );

    expect(response.body.pagination).toEqual(
      expect.objectContaining({
        page: 1,
        pageSize: 25,
      })
    );
  });

  it("allows authenticated Administrators", async () => {
    const response = await request(app)
      .get("/api/staff/tickets")
      .set("Cookie", administratorCookie)
      .expect(200);

    expect(Array.isArray(response.body.tickets)).toBe(
      true
    );
  });
});
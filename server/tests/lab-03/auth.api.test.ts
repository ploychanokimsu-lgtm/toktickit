import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import app from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { assertTestDatabase } from "../helpers/test-session.js";

const prisma = getPrisma();

const initialPassword = "OnlyForIsolatedTests#438";
const updatedPassword = "NewIsolatedPassword#439";
const runId = randomUUID();

let email: string;
let inactiveEmail: string;
let userId: number;
let inactiveUserId: number;
let oldCookie: string;
let newCookie: string;

function cookie(response: {
  headers: Record<string, string | string[] | undefined>;
}): string {
  const raw = response.headers["set-cookie"];
  const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const item = items.find((value) =>
    value.startsWith("toktickit_session=")
  );

  if (!item) {
    throw new Error("Session cookie missing");
  }

  return item.split(";")[0];
}

describe.sequential("Lab 3 authentication integration", () => {
  beforeAll(async () => {
    assertTestDatabase();

    email = `auth-${runId}@example.test`;
    inactiveEmail = `auth-inactive-${runId}@example.test`;

    const passwordHash = await bcrypt.hash(initialPassword, 12);

    const user = await prisma.user.create({
      data: {
        name: "Lab 3 Auth Test",
        email,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: true,
        passwordHash,
      },
    });

    const inactive = await prisma.user.create({
      data: {
        name: "Lab 3 Inactive Test",
        email: inactiveEmail,
        role: "REQUESTER",
        isActive: false,
        mustChangePassword: true,
        passwordHash,
      },
    });

    userId = user.id;
    inactiveUserId = inactive.id;
  });

  afterAll(async () => {
    assertTestDatabase();

    if (userId) {
      await prisma.user.delete({
        where: { id: userId },
      });
    }

    if (inactiveUserId) {
      await prisma.user.delete({
        where: { id: inactiveUserId },
      });
    }
  });

  it("rejects missing login credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("uses the same safe error for unknown email and incorrect password", async () => {
    const unknownEmailResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: `unknown-${runId}@example.test`,
        password: initialPassword,
      });

    const incorrectPasswordResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email,
        password: "WrongPassword#123",
      });

    expect(unknownEmailResponse.status).toBe(401);
    expect(incorrectPasswordResponse.status).toBe(401);

    expect(unknownEmailResponse.body.error.code).toBe(
      "INVALID_CREDENTIALS"
    );
    expect(incorrectPasswordResponse.body.error.code).toBe(
      "INVALID_CREDENTIALS"
    );

    expect(unknownEmailResponse.body.error.message).toBe(
      incorrectPasswordResponse.body.error.message
    );
  });

  it("rejects inactive users without exposing account state", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: inactiveEmail,
        password: initialPassword,
      });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe(
      "INVALID_CREDENTIALS"
    );
  });

  it("rejects current-user requests without authentication", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("logs in and exposes only safe current-user information", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email,
        password: initialPassword,
      });

    expect(response.status).toBe(200);
    expect(response.body.user.mustChangePassword).toBe(true);
    expect(response.body.user).not.toHaveProperty("passwordHash");

    oldCookie = cookie(response);

    const me = await request(app)
      .get("/api/auth/me")
      .set("Cookie", oldCookie);

    expect(me.status).toBe(200);
    expect(me.body.user.id).toBe(userId);
    expect(me.body.user.email).toBe(email);
    expect(me.body.user.role).toBe("REQUESTER");
    expect(me.body.user).not.toHaveProperty("passwordHash");
  });

  it("blocks normal application routes pending initial password change", async () => {
    const response = await request(app)
      .get("/api/categories")
      .set("Cookie", oldCookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe(
      "PASSWORD_CHANGE_REQUIRED"
    );
  });

  it("rejects a weak new password", async () => {
    const response = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", oldCookie)
      .send({
        currentPassword: initialPassword,
        newPassword: "weak",
        confirmPassword: "weak",
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a mismatched password confirmation", async () => {
    const response = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", oldCookie)
      .send({
        currentPassword: initialPassword,
        newPassword: updatedPassword,
        confirmPassword: "DifferentPassword#440",
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an incorrect current password", async () => {
    const response = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", oldCookie)
      .send({
        currentPassword: "WrongPassword#123",
        newPassword: updatedPassword,
        confirmPassword: updatedPassword,
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_PASSWORD");
  });

  it("changes the password and revokes the previous session", async () => {
    const response = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", oldCookie)
      .send({
        currentPassword: initialPassword,
        newPassword: updatedPassword,
        confirmPassword: updatedPassword,
      });

    expect(response.status).toBe(200);
    expect(response.body.mustChangePassword).toBe(false);

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        mustChangePassword: true,
        passwordHash: true,
      },
    });

    expect(updatedUser?.mustChangePassword).toBe(false);
    expect(updatedUser?.passwordHash).toBeTruthy();
    expect(
      await bcrypt.compare(
        updatedPassword,
        updatedUser!.passwordHash!
      )
    ).toBe(true);

    const oldSession = await request(app)
      .get("/api/auth/me")
      .set("Cookie", oldCookie);

    expect(oldSession.status).toBe(401);
  });

  it("rejects the old password after password change", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email,
        password: initialPassword,
      });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe(
      "INVALID_CREDENTIALS"
    );
  });

  it("logs in with the changed password", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email,
        password: updatedPassword,
      });

    expect(response.status).toBe(200);
    expect(response.body.user.mustChangePassword).toBe(false);

    newCookie = cookie(response);
  });

  it("logs out and invalidates the authenticated session", async () => {
    const logout = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", newCookie);

    expect(logout.status).toBe(200);
    expect(logout.body.message).toBe(
      "Logged out successfully."
    );

    const me = await request(app)
      .get("/api/auth/me")
      .set("Cookie", newCookie);

    expect(me.status).toBe(401);
  });

  it("allows idempotent logout without an active session", async () => {
    const response = await request(app)
      .post("/api/auth/logout");

    expect(response.status).toBe(200);
    expect(response.body.message).toBe(
      "Logged out successfully."
    );
  });
});
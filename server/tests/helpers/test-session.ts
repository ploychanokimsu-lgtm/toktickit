import { afterAll } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();
const createdSessionIds: string[] = [];

export function assertTestDatabase(): void {
  const actual = process.env.DATABASE_URL;
  const expected = process.env.TEST_DATABASE_URL;
  if (!actual || !expected || actual !== expected) {
    throw new Error("STOP: Set DATABASE_URL and TEST_DATABASE_URL to the SAME dedicated test database before running tests.");
  }
  let databaseName: string;
  try {
    databaseName = decodeURIComponent(new URL(actual).pathname.split("/").pop() ?? "");
  } catch {
    throw new Error("STOP: Invalid test database URL.");
  }
  if (!/test/i.test(databaseName) || process.env.NODE_ENV === "production") {
    throw new Error("STOP: Database name must contain 'test' and NODE_ENV must not be production.");
  }
}

export async function cookieFor(userId: number): Promise<string> {
  assertTestDatabase();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Test account not found.");
  // Only the isolated TEST database may have its seeded first-login flag changed.
  if (user.isActive && user.mustChangePassword) {
    await prisma.user.update({ where: { id: userId }, data: { mustChangePassword: false } });
  }
  const token = randomBytes(32).toString("hex");
  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  createdSessionIds.push(session.id);
  return "toktickit_session=" + token;
}

afterAll(async () => {
  if (createdSessionIds.length) {
    assertTestDatabase();
    await prisma.session.deleteMany({ where: { id: { in: createdSessionIds } } });
  }
});

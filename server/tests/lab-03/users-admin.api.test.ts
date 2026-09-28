import bcrypt from "bcrypt";
import {
  createHash,
  randomBytes,
} from "node:crypto";
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
import {
  assertTestDatabase,
} from "../helpers/test-session.js";

const prisma = getPrisma();

const unique =
  `${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;

const createdUserIds: number[] = [];

let administratorId: number;
let secondAdministratorId: number;
let requesterId: number;
let staffId: number;
let pendingAdministratorId: number;
let managedUserId: number;

let administratorCookie: string;
let requesterCookie: string;
let staffCookie: string;
let pendingAdministratorCookie: string;

async function createSessionCookie(
  userId: number
) {
  const token =
    randomBytes(32).toString("hex");

  await prisma.session.create({
    data: {
      userId,
      tokenHash: createHash("sha256")
        .update(token)
        .digest("hex"),
      expiresAt: new Date(
        Date.now() + 60 * 60 * 1000
      ),
    },
  });

  return `toktickit_session=${token}`;
}

describe(
  "Lab 3 Administrator User Management API",
  () => {
    beforeAll(async () => {
      assertTestDatabase();

      const users =
        await Promise.all([
          prisma.user.create({
            data: {
              name:
                "User Management Administrator",
              email:
                `admin-${unique}@example.test`,
              role: "ADMINISTRATOR",
              isActive: true,
              mustChangePassword: false,
            },
          }),
          prisma.user.create({
            data: {
              name:
                "Second Management Administrator",
              email:
                `second-admin-${unique}@example.test`,
              role: "ADMINISTRATOR",
              isActive: true,
              mustChangePassword: false,
            },
          }),
          prisma.user.create({
            data: {
              name:
                "User Management Requester",
              email:
                `requester-${unique}@example.test`,
              role: "REQUESTER",
              isActive: true,
              mustChangePassword: false,
            },
          }),
          prisma.user.create({
            data: {
              name:
                "User Management Staff",
              email:
                `staff-${unique}@example.test`,
              role: "IT_STAFF",
              isActive: true,
              mustChangePassword: false,
            },
          }),
          prisma.user.create({
            data: {
              name:
                "Pending Management Administrator",
              email:
                `pending-admin-${unique}@example.test`,
              role: "ADMINISTRATOR",
              isActive: true,
              mustChangePassword: true,
            },
          }),
        ]);

      administratorId = users[0].id;
      secondAdministratorId =
        users[1].id;
      requesterId = users[2].id;
      staffId = users[3].id;
      pendingAdministratorId =
        users[4].id;

      createdUserIds.push(
        ...users.map((user) => user.id)
      );

      administratorCookie =
        await createSessionCookie(
          administratorId
        );

      requesterCookie =
        await createSessionCookie(
          requesterId
        );

      staffCookie =
        await createSessionCookie(
          staffId
        );

      pendingAdministratorCookie =
        await createSessionCookie(
          pendingAdministratorId
        );
    });

    afterAll(async () => {
      assertTestDatabase();

      await prisma.session.deleteMany({
        where: {
          userId: {
            in: createdUserIds,
          },
        },
      });

      await prisma.user.deleteMany({
        where: {
          id: {
            in: createdUserIds,
          },
        },
      });
    });

    it(
      "rejects unauthenticated access",
      async () => {
        const response =
          await request(app)
            .get("/api/admin/users")
            .expect(401);

        expect(
          response.body.error.code
        ).toBe("UNAUTHENTICATED");

        expect(
          response.body.items
        ).toBeUndefined();
      }
    );

    it(
      "forbids Requester access",
      async () => {
        const response =
          await request(app)
            .get("/api/admin/users")
            .set(
              "Cookie",
              requesterCookie
            )
            .expect(403);

        expect(
          response.body.error
        ).toBe("FORBIDDEN");

        expect(
          response.body.items
        ).toBeUndefined();
      }
    );

    it(
      "forbids IT Staff access",
      async () => {
        const response =
          await request(app)
            .get("/api/admin/users")
            .set(
              "Cookie",
              staffCookie
            )
            .expect(403);

        expect(
          response.body.error
        ).toBe("FORBIDDEN");
      }
    );

    it(
      "requires completion of the initial password change",
      async () => {
        const response =
          await request(app)
            .get("/api/admin/users")
            .set(
              "Cookie",
              pendingAdministratorCookie
            )
            .expect(403);

        expect(
          response.body.error.code
        ).toBe(
          "PASSWORD_CHANGE_REQUIRED"
        );
      }
    );

    it(
      "lists safe user fields",
      async () => {
        const response =
          await request(app)
            .get("/api/admin/users")
            .set(
              "Cookie",
              administratorCookie
            )
            .expect(200);

        const administrator =
          response.body.items.find(
            (item: {
              id: number;
            }) =>
              item.id ===
              administratorId
          );

        expect(administrator).toEqual(
          expect.objectContaining({
            id: administratorId,
            name:
              "User Management Administrator",
            role: "ADMINISTRATOR",
            isActive: true,
            mustChangePassword: false,
          })
        );

        expect(administrator).not
          .toHaveProperty(
            "passwordHash"
          );
      }
    );

    it(
      "searches users and filters by role",
      async () => {
        const searchResponse =
          await request(app)
            .get("/api/admin/users")
            .query({
              search:
                `staff-${unique}`,
            })
            .set(
              "Cookie",
              administratorCookie
            )
            .expect(200);

        expect(
          searchResponse.body.items
            .map(
              (item: {
                id: number;
              }) => item.id
            )
        ).toContain(staffId);

        const roleResponse =
          await request(app)
            .get("/api/admin/users")
            .query({
              role: "REQUESTER",
            })
            .set(
              "Cookie",
              administratorCookie
            )
            .expect(200);

        expect(
          roleResponse.body.items
            .every(
              (item: {
                role: string;
              }) =>
                item.role ===
                "REQUESTER"
            )
        ).toBe(true);
      }
    );

    it(
      "creates a user with an initial password",
      async () => {
        const response =
          await request(app)
            .post("/api/admin/users")
            .set(
              "Cookie",
              administratorCookie
            )
            .send({
              name: "Managed User",
              email:
                `managed-${unique}@example.test`,
              role: "REQUESTER",
              isActive: true,
              initialPassword:
                "InitialUser1!",
            })
            .expect(201);

        managedUserId =
          response.body.user.id;

        createdUserIds.push(
          managedUserId
        );

        expect(
          response.body.user
        ).toEqual(
          expect.objectContaining({
            name: "Managed User",
            email:
              `managed-${unique}@example.test`,
            role: "REQUESTER",
            isActive: true,
            mustChangePassword: true,
          })
        );

        expect(
          response.body.user
        ).not.toHaveProperty(
          "passwordHash"
        );

        const stored =
          await prisma.user.findUnique({
            where: {
              id: managedUserId,
            },
            select: {
              passwordHash: true,
            },
          });

        expect(
          await bcrypt.compare(
            "InitialUser1!",
            stored!.passwordHash!
          )
        ).toBe(true);
      }
    );

    it(
      "rejects a duplicate email case-insensitively",
      async () => {
        const response =
          await request(app)
            .post("/api/admin/users")
            .set(
              "Cookie",
              administratorCookie
            )
            .send({
              name:
                "Duplicate Managed User",
              email:
                `MANAGED-${unique}@EXAMPLE.TEST`,
              role: "IT_STAFF",
              isActive: true,
              initialPassword:
                "InitialUser1!",
            })
            .expect(409);

        expect(
          response.body.error
        ).toBe(
          "DUPLICATE_EMAIL"
        );
      }
    );

    it(
      "rejects invalid role and password values",
      async () => {
        const invalidRole =
          await request(app)
            .post("/api/admin/users")
            .set(
              "Cookie",
              administratorCookie
            )
            .send({
              name: "Invalid Role",
              email:
                `invalid-role-${unique}@example.test`,
              role: "SUPER_ADMIN",
              isActive: true,
              initialPassword:
                "InitialUser1!",
            })
            .expect(400);

        expect(
          invalidRole.body.error
        ).toBe("INVALID_ROLE");

        const invalidPassword =
          await request(app)
            .post("/api/admin/users")
            .set(
              "Cookie",
              administratorCookie
            )
            .send({
              name:
                "Invalid Password",
              email:
                `invalid-password-${unique}@example.test`,
              role: "REQUESTER",
              isActive: true,
              initialPassword:
                "password",
            })
            .expect(400);

        expect(
          invalidPassword.body.error
        ).toBe(
          "VALIDATION_ERROR"
        );
      }
    );

    it(
      "updates basic account information",
      async () => {
        const updatedEmail =
          `updated-${unique}@example.test`;

        const response =
          await request(app)
            .patch(
              `/api/admin/users/${managedUserId}`
            )
            .set(
              "Cookie",
              administratorCookie
            )
            .send({
              name:
                "Updated Managed User",
              email: updatedEmail,
              role: "IT_STAFF",
              isActive: true,
            })
            .expect(200);

        expect(
          response.body.user
        ).toEqual(
          expect.objectContaining({
            id: managedUserId,
            name:
              "Updated Managed User",
            email: updatedEmail,
            role: "IT_STAFF",
            isActive: true,
          })
        );
      }
    );

    it(
      "prevents Administrator self-deactivation",
      async () => {
        const response =
          await request(app)
            .patch(
              `/api/admin/users/${administratorId}`
            )
            .set(
              "Cookie",
              administratorCookie
            )
            .send({
              isActive: false,
            })
            .expect(409);

        expect(
          response.body.error
        ).toBe(
          "SELF_DEACTIVATION_NOT_ALLOWED"
        );
      }
    );

    it(
      "prevents removal of the final active Administrator",
      async () => {
        const otherActiveAdministrators =
          await prisma.user.findMany({
            where: {
              role: "ADMINISTRATOR",
              isActive: true,
              id: {
                not: administratorId,
              },
            },
            select: {
              id: true,
            },
          });

        try {
          await prisma.user.updateMany({
            where: {
              id: {
                in:
                  otherActiveAdministrators
                    .map(
                      (user) => user.id
                    ),
              },
            },
            data: {
              isActive: false,
            },
          });

          const response =
            await request(app)
              .patch(
                `/api/admin/users/${administratorId}`
              )
              .set(
                "Cookie",
                administratorCookie
              )
              .send({
                role: "IT_STAFF",
              })
              .expect(409);

          expect(
            response.body.error
          ).toBe(
            "LAST_ADMIN_REQUIRED"
          );
        } finally {
          await prisma.user.updateMany({
            where: {
              id: {
                in:
                  otherActiveAdministrators
                    .map(
                      (user) => user.id
                    ),
              },
            },
            data: {
              isActive: true,
            },
          });
        }
      }
    );

    it(
      "sets a new initial password and revokes sessions",
      async () => {
        await createSessionCookie(
          managedUserId
        );

        const response =
          await request(app)
            .post(
              `/api/admin/users/${managedUserId}/initial-password`
            )
            .set(
              "Cookie",
              administratorCookie
            )
            .send({
              initialPassword:
                "Replacement1!",
            })
            .expect(200);

        expect(response.body).toEqual({
          message:
            "New initial password set successfully.",
          mustChangePassword: true,
        });

        const stored =
          await prisma.user.findUnique({
            where: {
              id: managedUserId,
            },
            select: {
              passwordHash: true,
              mustChangePassword: true,
              sessions: {
                select: {
                  id: true,
                },
              },
            },
          });

        expect(
          stored?.mustChangePassword
        ).toBe(true);

        expect(
          stored?.sessions
        ).toHaveLength(0);

        expect(
          await bcrypt.compare(
            "Replacement1!",
            stored!.passwordHash!
          )
        ).toBe(true);
      }
    );

    it(
      "returns safe responses for invalid or missing users",
      async () => {
        const invalid =
          await request(app)
            .patch(
              "/api/admin/users/not-a-number"
            )
            .set(
              "Cookie",
              administratorCookie
            )
            .send({
              name: "Invalid",
            })
            .expect(400);

        expect(
          invalid.body.error
        ).toBe(
          "VALIDATION_ERROR"
        );

        const missing =
          await request(app)
            .patch(
              "/api/admin/users/2147483647"
            )
            .set(
              "Cookie",
              administratorCookie
            )
            .send({
              name: "Missing",
            })
            .expect(404);

        expect(
          missing.body.error
        ).toBe("NOT_FOUND");
      }
    );
  }
);

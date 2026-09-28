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

const unique = `${Date.now()}-${Math.random()
  .toString(16)
  .slice(2)}`;

let requesterId: number;
let staffId: number;
let otherStaffId: number;
let administratorId: number;
let inactiveStaffId: number;
let categoryId: number;
let relatedSystemId: number;

let claimTicketId: number;
let forgedClaimTicketId: number;
let assignedTicketId: number;
let priorityTicketId: number;
let statusTicketId: number;

let staffCookie: string;
let requesterCookie: string;

async function createSessionCookie(
  userId: number
): Promise<string> {
  const token = randomBytes(32).toString("hex");

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
  "Lab 3 IT Staff Ticket Operations API",
  () => {
    beforeAll(async () => {
      assertTestDatabase();

      const requester =
        await prisma.user.create({
          data: {
            name: "Operations Requester",
            email:
              `operations-requester-${unique}@example.test`,
            role: "REQUESTER",
            isActive: true,
            mustChangePassword: false,
          },
        });

      const staff = await prisma.user.create({
        data: {
          name: "Operations Staff",
          email:
            `operations-staff-${unique}@example.test`,
          role: "IT_STAFF",
          isActive: true,
          mustChangePassword: false,
        },
      });

      const otherStaff =
        await prisma.user.create({
          data: {
            name: "Other Operations Staff",
            email:
              `operations-other-${unique}@example.test`,
            role: "IT_STAFF",
            isActive: true,
            mustChangePassword: false,
          },
        });

      const administrator =
        await prisma.user.create({
          data: {
            name: "Operations Administrator",
            email:
              `operations-admin-${unique}@example.test`,
            role: "ADMINISTRATOR",
            isActive: true,
            mustChangePassword: false,
          },
        });

      const inactiveStaff =
        await prisma.user.create({
          data: {
            name: "Inactive Operations Staff",
            email:
              `operations-inactive-${unique}@example.test`,
            role: "IT_STAFF",
            isActive: false,
            mustChangePassword: false,
          },
        });

      requesterId = requester.id;
      staffId = staff.id;
      otherStaffId = otherStaff.id;
      administratorId = administrator.id;
      inactiveStaffId = inactiveStaff.id;

      const category =
        await prisma.category.create({
          data: {
            name:
              `Operations Category ${unique}`,
            isActive: true,
          },
        });

      const relatedSystem =
        await prisma.relatedSystem.create({
          data: {
            name:
              `Operations System ${unique}`,
            isActive: true,
          },
        });

      categoryId = category.id;
      relatedSystemId = relatedSystem.id;

      async function createTicket(
        suffix: string,
        ownerId: number | null,
        currentStatus:
          | "NEW"
          | "OPEN"
          | "IN_PROGRESS" = "NEW"
      ) {
        return prisma.ticket.create({
          data: {
            ticketNumber:
              `OPS-${suffix}-${unique}`,
            clientSubmissionId:
              `ops-${suffix}-${unique}`,
            requesterId,
            ownerId,
            categoryId,
            relatedSystemId,
            summary:
              `Operations test ${suffix}`,
            description:
              "Ticket used by the Lab 3 operations API tests.",
            requestedPriority: "MEDIUM",
            itPriority: "MEDIUM",
            currentStatus,
          },
        });
      }

      const [
        claimTicket,
        forgedClaimTicket,
        assignedTicket,
        priorityTicket,
        statusTicket,
      ] = await Promise.all([
        createTicket("CLAIM", null),
        createTicket("FORGED", null),
        createTicket(
          "ASSIGNED",
          otherStaffId,
          "IN_PROGRESS"
        ),
        createTicket(
          "PRIORITY",
          staffId,
          "OPEN"
        ),
        createTicket(
          "STATUS",
          staffId,
          "NEW"
        ),
      ]);

      claimTicketId = claimTicket.id;
      forgedClaimTicketId =
        forgedClaimTicket.id;
      assignedTicketId = assignedTicket.id;
      priorityTicketId = priorityTicket.id;
      statusTicketId = statusTicket.id;

      staffCookie =
        await createSessionCookie(staffId);

      requesterCookie =
        await createSessionCookie(requesterId);
    });

    afterAll(async () => {
      const ticketIds = [
        claimTicketId,
        forgedClaimTicketId,
        assignedTicketId,
        priorityTicketId,
        statusTicketId,
      ].filter(
        (id): id is number =>
          typeof id === "number"
      );

      if (ticketIds.length > 0) {
        await prisma.ticket.deleteMany({
          where: {
            id: {
              in: ticketIds,
            },
          },
        });
      }

      const userIds = [
        requesterId,
        staffId,
        otherStaffId,
        administratorId,
        inactiveStaffId,
      ].filter(
        (id): id is number =>
          typeof id === "number"
      );

      if (userIds.length > 0) {
        await prisma.session.deleteMany({
          where: {
            userId: {
              in: userIds,
            },
          },
        });

        await prisma.user.deleteMany({
          where: {
            id: {
              in: userIds,
            },
          },
        });
      }

      if (categoryId) {
        await prisma.category.delete({
          where: {
            id: categoryId,
          },
        });
      }

      if (relatedSystemId) {
        await prisma.relatedSystem.delete({
          where: {
            id: relatedSystemId,
          },
        });
      }
    });

    it(
      "rejects an unauthenticated operation",
      async () => {
        const response = await request(app)
          .post(
            `/api/staff/tickets/${claimTicketId}/claim`
          )
          .send({})
          .expect(401);

        expect(
          response.body.error.code
        ).toBe("UNAUTHENTICATED");
      }
    );

    it(
      "rejects an operation by a Requester",
      async () => {
        const response = await request(app)
          .post(
            `/api/staff/tickets/${claimTicketId}/claim`
          )
          .set("Cookie", requesterCookie)
          .send({})
          .expect(403);

        expect(
          response.body.error.code
        ).toBe("FORBIDDEN");
      }
    );

    it(
      "prevents a caller from forging the claim owner",
      async () => {
        const response = await request(app)
          .post(
            `/api/staff/tickets/${forgedClaimTicketId}/claim`
          )
          .set("Cookie", staffCookie)
          .send({
            ownerId: administratorId,
          })
          .expect(400);

        expect(
          response.body.error.code
        ).toBe("VALIDATION_ERROR");

        const ticket =
          await prisma.ticket.findUniqueOrThrow({
            where: {
              id: forgedClaimTicketId,
            },
          });

        expect(ticket.ownerId).toBeNull();
      }
    );

    it(
      "allows IT Staff to claim an unassigned Ticket",
      async () => {
        const response = await request(app)
          .post(
            `/api/staff/tickets/${claimTicketId}/claim`
          )
          .set("Cookie", staffCookie)
          .send({})
          .expect(200);

        expect(response.body.ticket).toEqual(
          expect.objectContaining({
            id: claimTicketId,
            ownerId: staffId,
          })
        );

        expect(
          response.body.ticket.owner
        ).toEqual(
          expect.objectContaining({
            id: staffId,
            role: "IT_STAFF",
          })
        );

        const ticket =
          await prisma.ticket.findUniqueOrThrow({
            where: {
              id: claimTicketId,
            },
          });

        expect(ticket.ownerId).toBe(staffId);
      }
    );

    it(
      "rejects claiming an already assigned Ticket",
      async () => {
        const response = await request(app)
          .post(
            `/api/staff/tickets/${assignedTicketId}/claim`
          )
          .set("Cookie", staffCookie)
          .send({})
          .expect(409);

        expect(
          response.body.error.code
        ).toBe("TICKET_ALREADY_ASSIGNED");
      }
    );

    it(
      "allows reassignment to active operational staff",
      async () => {
        const response = await request(app)
          .patch(
            `/api/staff/tickets/${assignedTicketId}/assignment`
          )
          .set("Cookie", staffCookie)
          .send({
            ownerId: administratorId,
          })
          .expect(200);

        expect(response.body.ticket).toEqual(
          expect.objectContaining({
            id: assignedTicketId,
            ownerId: administratorId,
          })
        );

        expect(
          response.body.ticket.owner
        ).toEqual(
          expect.objectContaining({
            id: administratorId,
            role: "ADMINISTRATOR",
          })
        );
      }
    );

    it(
      "rejects reassignment to a Requester",
      async () => {
        const response = await request(app)
          .patch(
            `/api/staff/tickets/${assignedTicketId}/assignment`
          )
          .set("Cookie", staffCookie)
          .send({
            ownerId: requesterId,
          })
          .expect(400);

        expect(
          response.body.error.code
        ).toBe("INVALID_TICKET_OWNER");
      }
    );

    it(
      "rejects reassignment to inactive staff",
      async () => {
        const response = await request(app)
          .patch(
            `/api/staff/tickets/${assignedTicketId}/assignment`
          )
          .set("Cookie", staffCookie)
          .send({
            ownerId: inactiveStaffId,
          })
          .expect(400);

        expect(
          response.body.error.code
        ).toBe("INVALID_TICKET_OWNER");
      }
    );

    it(
      "updates IT Priority",
      async () => {
        const response = await request(app)
          .patch(
            `/api/staff/tickets/${priorityTicketId}/priority`
          )
          .set("Cookie", staffCookie)
          .send({
            itPriority: "HIGH",
          })
          .expect(200);

        expect(response.body.ticket).toEqual(
          expect.objectContaining({
            id: priorityTicketId,
            itPriority: "HIGH",
          })
        );

        const ticket =
          await prisma.ticket.findUniqueOrThrow({
            where: {
              id: priorityTicketId,
            },
          });

        expect(ticket.itPriority).toBe("HIGH");
      }
    );

    it(
      "rejects an invalid IT Priority",
      async () => {
        const response = await request(app)
          .patch(
            `/api/staff/tickets/${priorityTicketId}/priority`
          )
          .set("Cookie", staffCookie)
          .send({
            itPriority: "URGENT",
          })
          .expect(400);

        expect(
          response.body.error.code
        ).toBe("VALIDATION_ERROR");
      }
    );

    it(
      "rejects unexpected operation fields",
      async () => {
        const response = await request(app)
          .patch(
            `/api/staff/tickets/${priorityTicketId}/priority`
          )
          .set("Cookie", staffCookie)
          .send({
            itPriority: "LOW",
            requesterId,
          })
          .expect(400);

        expect(
          response.body.error.code
        ).toBe("VALIDATION_ERROR");
      }
    );

    it(
      "changes Ticket Status using an allowed transition",
      async () => {
        const response = await request(app)
          .patch(
            `/api/staff/tickets/${statusTicketId}/status`
          )
          .set("Cookie", staffCookie)
          .send({
            status: "OPEN",
          })
          .expect(200);

        expect(response.body.ticket).toEqual(
          expect.objectContaining({
            id: statusTicketId,
            currentStatus: "OPEN",
          })
        );

        const ticket =
          await prisma.ticket.findUniqueOrThrow({
            where: {
              id: statusTicketId,
            },
          });

        expect(ticket.currentStatus).toBe(
          "OPEN"
        );
      }
    );

    it(
      "rejects an invalid Ticket Status transition",
      async () => {
        const response = await request(app)
          .patch(
            `/api/staff/tickets/${assignedTicketId}/status`
          )
          .set("Cookie", staffCookie)
          .send({
            status: "CLOSED",
          })
          .expect(409);

        expect(
          response.body.error.code
        ).toBe(
          "INVALID_STATUS_TRANSITION"
        );

        const ticket =
          await prisma.ticket.findUniqueOrThrow({
            where: {
              id: assignedTicketId,
            },
          });

        expect(ticket.currentStatus).toBe(
          "IN_PROGRESS"
        );
      }
    );

    it(
      "rejects an invalid Ticket ID",
      async () => {
        const response = await request(app)
          .patch(
            "/api/staff/tickets/not-a-number/priority"
          )
          .set("Cookie", staffCookie)
          .send({
            itPriority: "HIGH",
          })
          .expect(400);

        expect(
          response.body.error.code
        ).toBe("VALIDATION_ERROR");
      }
    );

    it(
      "returns a safe error for a missing Ticket",
      async () => {
        const response = await request(app)
          .post(
            "/api/staff/tickets/999999999/claim"
          )
          .set("Cookie", staffCookie)
          .send({})
          .expect(404);

        expect(
          response.body.error.code
        ).toBe("TICKET_NOT_FOUND");

        expect(
          response.body.ticket
        ).toBeUndefined();
      }
    );
  }
);

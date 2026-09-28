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
  `${Date.now()}-${Math.random()}`;

let requesterId: number;
let otherRequesterId: number;
let staffId: number;
let pendingRequesterId: number;
let categoryId: number;
let relatedSystemId: number;
let ticketId: number;

let requesterCookie: string;
let otherRequesterCookie: string;
let staffCookie: string;
let pendingRequesterCookie: string;

async function createSessionCookie(
  userId: number
): Promise<string> {
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
  "Lab 3 Requester Comments and Resolution",
  () => {
    beforeAll(async () => {
      assertTestDatabase();

      const requester =
        await prisma.user.create({
          data: {
            name:
              "Requester Completion Test",
            email:
              `requester-completion-${unique}@example.test`,
            role: "REQUESTER",
            isActive: true,
            mustChangePassword: false,
          },
        });

      const otherRequester =
        await prisma.user.create({
          data: {
            name:
              "Other Requester Test",
            email:
              `other-requester-${unique}@example.test`,
            role: "REQUESTER",
            isActive: true,
            mustChangePassword: false,
          },
        });

      const staff =
        await prisma.user.create({
          data: {
            name:
              "Requester Completion Staff",
            email:
              `completion-staff-${unique}@example.test`,
            role: "IT_STAFF",
            isActive: true,
            mustChangePassword: false,
          },
        });

      const pendingRequester =
        await prisma.user.create({
          data: {
            name:
              "Pending Password Requester",
            email:
              `pending-requester-${unique}@example.test`,
            role: "REQUESTER",
            isActive: true,
            mustChangePassword: true,
          },
        });

      requesterId = requester.id;
      otherRequesterId =
        otherRequester.id;
      staffId = staff.id;
      pendingRequesterId =
        pendingRequester.id;

      const category =
        await prisma.category.create({
          data: {
            name:
              `Requester Completion Category ${unique}`,
          },
        });

      const system =
        await prisma.relatedSystem.create({
          data: {
            name:
              `Requester Completion System ${unique}`,
          },
        });

      categoryId = category.id;
      relatedSystemId = system.id;

      const ticket =
        await prisma.ticket.create({
          data: {
            ticketNumber:
              `REQ-COMPLETE-${unique}`,
            clientSubmissionId:
              `req-complete-${unique}`,
            requesterId,
            ownerId: staffId,
            categoryId,
            relatedSystemId,
            summary:
              "Requester completion test",
            description:
              "Ticket for requester comments and resolution testing.",
            requestedPriority:
              "MEDIUM",
            itPriority: "MEDIUM",
            currentStatus: "OPEN",
          },
        });

      ticketId = ticket.id;

      await prisma.publicComment.create({
        data: {
          ticketId,
          authorId: staffId,
          content:
            "Public update from IT Staff.",
        },
      });

      await prisma.internalNote.create({
        data: {
          ticketId,
          authorId: staffId,
          content:
            "This note must remain hidden from the Requester.",
        },
      });

      requesterCookie =
        await createSessionCookie(
          requesterId
        );

      otherRequesterCookie =
        await createSessionCookie(
          otherRequesterId
        );

      staffCookie =
        await createSessionCookie(
          staffId
        );

      pendingRequesterCookie =
        await createSessionCookie(
          pendingRequesterId
        );
    });

    afterAll(async () => {
      if (ticketId) {
        await prisma.internalNote.deleteMany({
          where: { ticketId },
        });

        await prisma.publicComment.deleteMany({
          where: { ticketId },
        });

        await prisma.ticket.delete({
          where: { id: ticketId },
        });
      }

      const userIds = [
        requesterId,
        otherRequesterId,
        staffId,
        pendingRequesterId,
      ].filter(
        (id): id is number =>
          typeof id === "number"
      );

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
      "rejects unauthenticated access",
      async () => {
        const response =
          await request(app)
            .get(
              `/api/tickets/${ticketId}/comments`
            )
            .expect(401);

        expect(
          response.body.error
        ).toBeDefined();
      }
    );

    it(
      "rejects authenticated non-Requester roles",
      async () => {
        const response =
          await request(app)
            .get(
              `/api/tickets/${ticketId}/comments`
            )
            .set(
              "Cookie",
              staffCookie
            )
            .expect(403);

        expect(
          response.body.error.code
        ).toBe("FORBIDDEN");
      }
    );

    it(
      "requires initial password change completion",
      async () => {
        await request(app)
          .get(
            `/api/tickets/${ticketId}/comments`
          )
          .set(
            "Cookie",
            pendingRequesterCookie
          )
          .expect(403);
      }
    );

    it(
      "returns Public Comments for the owned Ticket without Internal Notes",
      async () => {
        const response =
          await request(app)
            .get(
              `/api/tickets/${ticketId}/comments`
            )
            .set(
              "Cookie",
              requesterCookie
            )
            .expect(200);

        expect(
          response.body.comments
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              ticketId,
              content:
                "Public update from IT Staff.",
            }),
          ])
        );

        expect(
          response.body.internalNotes
        ).toBeUndefined();

        expect(
          JSON.stringify(response.body)
        ).not.toContain(
          "This note must remain hidden"
        );

        expect(
          response.body.comments[0]
            .author.passwordHash
        ).toBeUndefined();
      }
    );

    it(
      "prevents access to another Requester's Ticket",
      async () => {
        await request(app)
          .get(
            `/api/tickets/${ticketId}/comments`
          )
          .set(
            "Cookie",
            otherRequesterCookie
          )
          .expect(404);
      }
    );

    it(
      "adds a trimmed Public Comment to the owned Ticket",
      async () => {
        const response =
          await request(app)
            .post(
              `/api/tickets/${ticketId}/comments`
            )
            .set(
              "Cookie",
              requesterCookie
            )
            .send({
              content:
                "  Thank you for the update.  ",
            })
            .expect(201);

        expect(
          response.body.comment
        ).toEqual(
          expect.objectContaining({
            ticketId,
            content:
              "Thank you for the update.",
          })
        );

        expect(
          response.body.comment.author.id
        ).toBe(requesterId);

        const stored =
          await prisma.publicComment.findUnique({
            where: {
              id:
                response.body.comment.id,
            },
          });

        expect(stored?.content).toBe(
          "Thank you for the update."
        );
      }
    );

    it(
      "rejects empty and oversized Comment content",
      async () => {
        for (const content of [
          "   ",
          "x".repeat(2001),
        ]) {
          const response =
            await request(app)
              .post(
                `/api/tickets/${ticketId}/comments`
              )
              .set(
                "Cookie",
                requesterCookie
              )
              .send({
                content,
              })
              .expect(400);

          expect(
            response.body.error.code
          ).toBe(
            "VALIDATION_ERROR"
          );
        }
      }
    );

    it(
      "prevents commenting on another Requester's Ticket",
      async () => {
        await request(app)
          .post(
            `/api/tickets/${ticketId}/comments`
          )
          .set(
            "Cookie",
            otherRequesterCookie
          )
          .send({
            content:
              "Unauthorized comment.",
          })
          .expect(404);
      }
    );

    it(
      "records that the problem appears resolved without changing Ticket status",
      async () => {
        const response =
          await request(app)
            .post(
              `/api/tickets/${ticketId}/problem-appears-resolved`
            )
            .set(
              "Cookie",
              requesterCookie
            )
            .expect(200);

        expect(
          response.body.message
        ).toBe(
          "Resolution indication recorded."
        );

        expect(
          response.body
            .requesterResolutionIndicatedAt
        ).toEqual(
          expect.any(String)
        );

        const storedTicket =
          await prisma.ticket.findUnique({
            where: {
              id: ticketId,
            },
            select: {
              currentStatus: true,
              requesterResolutionIndicatedAt:
                true,
            },
          });

        expect(
          storedTicket
            ?.requesterResolutionIndicatedAt
        ).not.toBeNull();

        expect(
          storedTicket?.currentStatus
        ).toBe("OPEN");
      }
    );

    it(
      "prevents another Requester from recording resolution",
      async () => {
        await request(app)
          .post(
            `/api/tickets/${ticketId}/problem-appears-resolved`
          )
          .set(
            "Cookie",
            otherRequesterCookie
          )
          .expect(404);
      }
    );

    it(
      "returns the resolution indication in Requester Ticket Detail",
      async () => {
        const response =
          await request(app)
            .get(
              `/api/tickets/${ticketId}`
            )
            .set(
              "Cookie",
              requesterCookie
            )
            .expect(200);

        expect(
          response.body.ticket
            .requesterResolutionIndicatedAt
        ).toEqual(
          expect.any(String)
        );

        expect(
          response.body.ticket
            .internalNotes
        ).toBeUndefined();
      }
    );
  }
);

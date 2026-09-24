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
const unique = `${Date.now()}-${Math.random()}`;

let requesterId: number;
let staffId: number;
let categoryId: number;
let relatedSystemId: number;
let ticketId: number;
let staffCookie: string;

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
  "Lab 3 Ticket Comments and Notes",
  () => {
    beforeAll(async () => {
      assertTestDatabase();

      const requester =
        await prisma.user.create({
          data: {
            name: "Comment Test Requester",
            email:
              `comment-requester-${unique}@example.test`,
            role: "REQUESTER",
            isActive: true,
            mustChangePassword: false,
          },
        });

      const staff = await prisma.user.create({
        data: {
          name: "Comment Test Staff",
          email:
            `comment-staff-${unique}@example.test`,
          role: "IT_STAFF",
          isActive: true,
          mustChangePassword: false,
        },
      });

      requesterId = requester.id;
      staffId = staff.id;

      const category =
        await prisma.category.create({
          data: {
            name: `Comment Category ${unique}`,
          },
        });

      const system =
        await prisma.relatedSystem.create({
          data: {
            name: `Comment System ${unique}`,
          },
        });

      categoryId = category.id;
      relatedSystemId = system.id;

      const ticket =
        await prisma.ticket.create({
          data: {
            ticketNumber:
              `COMMENT-${unique}`,
            clientSubmissionId:
              `comment-${unique}`,
            requesterId,
            ownerId: staffId,
            categoryId,
            relatedSystemId,
            summary: "Comment operation test",
            description:
              "Ticket for testing comments and notes.",
            requestedPriority: "MEDIUM",
            itPriority: "MEDIUM",
            currentStatus: "OPEN",
          },
        });

      ticketId = ticket.id;
      staffCookie =
        await createSessionCookie(staffId);
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
        staffId,
      ].filter(
        (id): id is number =>
          typeof id === "number"
      );

      await prisma.session.deleteMany({
        where: {
          userId: { in: userIds },
        },
      });

      await prisma.user.deleteMany({
        where: {
          id: { in: userIds },
        },
      });

      if (categoryId) {
        await prisma.category.delete({
          where: { id: categoryId },
        });
      }

      if (relatedSystemId) {
        await prisma.relatedSystem.delete({
          where: { id: relatedSystemId },
        });
      }
    });

    it(
      "adds a Public Comment",
      async () => {
        const response = await request(app)
          .post(
            `/api/staff/tickets/${ticketId}/comments`
          )
          .set("Cookie", staffCookie)
          .send({
            content:
              "Requester-visible update.",
          })
          .expect(201);

        expect(response.body.comment).toEqual(
          expect.objectContaining({
            ticketId,
            content:
              "Requester-visible update.",
          })
        );

        expect(
          response.body.comment.author.id
        ).toBe(staffId);

        expect(
          response.body.comment.author
            .passwordHash
        ).toBeUndefined();
      }
    );

    it(
      "adds an Internal Note",
      async () => {
        const response = await request(app)
          .post(
            `/api/staff/tickets/${ticketId}/internal-notes`
          )
          .set("Cookie", staffCookie)
          .send({
            content:
              "Staff-only investigation note.",
          })
          .expect(201);

        expect(response.body.note).toEqual(
          expect.objectContaining({
            ticketId,
            content:
              "Staff-only investigation note.",
          })
        );

        expect(
          response.body.note.author.id
        ).toBe(staffId);

        expect(
          response.body.note.author
            .passwordHash
        ).toBeUndefined();
      }
    );

    it(
      "rejects empty Comment and Note content",
      async () => {
        for (const endpoint of [
          "comments",
          "internal-notes",
        ]) {
          const response = await request(app)
            .post(
              `/api/staff/tickets/${ticketId}/${endpoint}`
            )
            .set("Cookie", staffCookie)
            .send({
              content: "   ",
            })
            .expect(400);

          expect(
            response.body.error.code
          ).toBe("VALIDATION_ERROR");
        }
      }
    );
  }
);

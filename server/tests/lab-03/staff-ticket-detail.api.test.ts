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
let administratorId: number;
let pendingStaffId: number;
let inactiveStaffId: number;
let categoryId: number;
let relatedSystemId: number;
let ticketId: number;

let staffCookie: string;
let administratorCookie: string;
let requesterCookie: string;
let pendingStaffCookie: string;

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

function detailRequest(
  cookie: string,
  id: number | string = ticketId
) {
  return request(app)
    .get(`/api/staff/tickets/${id}`)
    .set("Cookie", cookie);
}

describe(
  "Lab 3 IT Staff Ticket Detail API",
  () => {
    beforeAll(async () => {
      assertTestDatabase();

      const requester =
        await prisma.user.create({
          data: {
            name: "Detail Test Requester",
            email:
              `detail-requester-${unique}@example.test`,
            role: "REQUESTER",
            isActive: true,
            mustChangePassword: false,
          },
        });

      const staff = await prisma.user.create({
        data: {
          name: "Detail Test Staff",
          email:
            `detail-staff-${unique}@example.test`,
          role: "IT_STAFF",
          isActive: true,
          mustChangePassword: false,
        },
      });

      const administrator =
        await prisma.user.create({
          data: {
            name: "Detail Test Administrator",
            email:
              `detail-admin-${unique}@example.test`,
            role: "ADMINISTRATOR",
            isActive: true,
            mustChangePassword: false,
          },
        });

      const pendingStaff =
        await prisma.user.create({
          data: {
            name: "Pending Detail Staff",
            email:
              `detail-pending-${unique}@example.test`,
            role: "IT_STAFF",
            isActive: true,
            mustChangePassword: true,
          },
        });

      const inactiveStaff =
        await prisma.user.create({
          data: {
            name: "Inactive Detail Staff",
            email:
              `detail-inactive-${unique}@example.test`,
            role: "IT_STAFF",
            isActive: false,
            mustChangePassword: false,
          },
        });

      requesterId = requester.id;
      staffId = staff.id;
      administratorId = administrator.id;
      pendingStaffId = pendingStaff.id;
      inactiveStaffId = inactiveStaff.id;

      const category =
        await prisma.category.create({
          data: {
            name: `Detail Category ${unique}`,
            isActive: true,
          },
        });

      const relatedSystem =
        await prisma.relatedSystem.create({
          data: {
            name:
              `Detail Related System ${unique}`,
            isActive: true,
          },
        });

      categoryId = category.id;
      relatedSystemId = relatedSystem.id;

      const ticket =
        await prisma.ticket.create({
          data: {
            ticketNumber:
              `DETAIL-${unique}`,
            clientSubmissionId:
              `detail-submission-${unique}`,
            requesterId,
            ownerId: staffId,
            categoryId,
            relatedSystemId,
            summary:
              "Staff Ticket Detail test",
            description:
              "Detailed operational information for the IT Staff Ticket workflow.",
            requestedPriority: "HIGH",
            itPriority: "MEDIUM",
            currentStatus: "IN_PROGRESS",
          },
        });

      ticketId = ticket.id;

      await prisma.attachment.create({
        data: {
          ticketId,
          originalFilename:
            "detail-evidence.txt",
          storedFilename:
            `detail-${unique}.txt`,
          mimeType: "text/plain",
          sizeBytes: 128,
          storagePath:
            `tests/${unique}/detail-evidence.txt`,
          isRemoved: false,
        },
      });

      await prisma.publicComment.create({
        data: {
          ticketId,
          authorId: requesterId,
          content:
            "Requester-visible test comment.",
        },
      });

      await prisma.internalNote.create({
        data: {
          ticketId,
          authorId: staffId,
          content:
            "Staff-only test internal note.",
        },
      });

      staffCookie =
        await createSessionCookie(staffId);

      administratorCookie =
        await createSessionCookie(
          administratorId
        );

      requesterCookie =
        await createSessionCookie(requesterId);

      pendingStaffCookie =
        await createSessionCookie(
          pendingStaffId
        );
    });

    afterAll(async () => {
      if (!ticketId) {
        return;
      }
      await prisma.internalNote.deleteMany({
        where: { ticketId },
      });

      await prisma.publicComment.deleteMany({
        where: { ticketId },
      });

      await prisma.attachment.deleteMany({
        where: { ticketId },
      });

      await prisma.ticket.delete({
        where: { id: ticketId },
      });

      const userIds = [
        requesterId,
        staffId,
        administratorId,
        pendingStaffId,
        inactiveStaffId,
      ];

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

      await prisma.category.delete({
        where: { id: categoryId },
      });

      await prisma.relatedSystem.delete({
        where: { id: relatedSystemId },
      });
    });

    it(
      "rejects unauthenticated access",
      async () => {
        const response = await request(app)
          .get(
            `/api/staff/tickets/${ticketId}`
          )
          .expect(401);

        expect(
          response.body.error.code
        ).toBe("UNAUTHENTICATED");
      }
    );

    it(
      "rejects an authenticated Requester",
      async () => {
        const response = await detailRequest(
          requesterCookie
        ).expect(403);

        expect(
          response.body.error.code
        ).toBe("FORBIDDEN");
      }
    );

    it(
      "requires completion of the initial password change",
      async () => {
        const response = await detailRequest(
          pendingStaffCookie
        ).expect(403);

        expect(
          response.body.error
        ).toBeDefined();
      }
    );

    it(
      "allows IT Staff to load Ticket Detail",
      async () => {
        const response = await detailRequest(
          staffCookie
        ).expect(200);

        expect(response.body.ticket).toEqual(
          expect.objectContaining({
            id: ticketId,
            summary:
              "Staff Ticket Detail test",
            description:
              "Detailed operational information for the IT Staff Ticket workflow.",
            requestedPriority: "HIGH",
            itPriority: "MEDIUM",
            currentStatus: "IN_PROGRESS",
          })
        );
      }
    );

    it(
      "allows Administrators to load Ticket Detail",
      async () => {
        const response = await detailRequest(
          administratorCookie
        ).expect(200);

        expect(
          response.body.ticket.id
        ).toBe(ticketId);
      }
    );

    it(
      "returns Requester, Owner and reference information",
      async () => {
        const response = await detailRequest(
          staffCookie
        ).expect(200);

        expect(
          response.body.ticket.requester
        ).toEqual(
          expect.objectContaining({
            id: requesterId,
            name: "Detail Test Requester",
          })
        );

        expect(
          response.body.ticket.owner
        ).toEqual(
          expect.objectContaining({
            id: staffId,
            role: "IT_STAFF",
            isActive: true,
          })
        );

        expect(
          response.body.ticket.category.id
        ).toBe(categoryId);

        expect(
          response.body.ticket.relatedSystem.id
        ).toBe(relatedSystemId);
      }
    );

    it(
      "returns safe Attachment, Public Comment and Internal Note fields",
      async () => {
        const response = await detailRequest(
          staffCookie
        ).expect(200);

        expect(
          response.body.ticket.attachments
        ).toHaveLength(1);

        const attachment =
          response.body.ticket.attachments[0];

        expect(attachment).toEqual(
          expect.objectContaining({
            originalFilename:
              "detail-evidence.txt",
            mimeType: "text/plain",
            sizeBytes: 128,
          })
        );

        expect(
          attachment.storagePath
        ).toBeUndefined();

        expect(
          attachment.storedFilename
        ).toBeUndefined();

        expect(
          response.body.ticket
            .publicComments[0]
        ).toEqual(
          expect.objectContaining({
            content:
              "Requester-visible test comment.",
          })
        );

        expect(
          response.body.ticket
            .internalNotes[0]
        ).toEqual(
          expect.objectContaining({
            content:
              "Staff-only test internal note.",
          })
        );

        expect(
          response.body.ticket
            .clientSubmissionId
        ).toBeUndefined();

        expect(
          response.body.ticket.requester
            .passwordHash
        ).toBeUndefined();
      }
    );

    it(
      "returns active operational staff members using safe fields",
      async () => {
        const response = await request(app)
          .get(
            "/api/staff/tickets/staff-members"
          )
          .set("Cookie", staffCookie)
          .expect(200);

        const ids =
          response.body.staffMembers.map(
            (member: { id: number }) =>
              member.id
          );

        expect(ids).toContain(staffId);
        expect(ids).toContain(
          administratorId
        );
        expect(ids).toContain(
          pendingStaffId
        );

        expect(ids).not.toContain(
          requesterId
        );

        expect(ids).not.toContain(
          inactiveStaffId
        );

        for (
          const member of
          response.body.staffMembers
        ) {
          expect(
            member.passwordHash
          ).toBeUndefined();

          expect(
            member.mustChangePassword
          ).toBeUndefined();
        }
      }
    );

    it(
      "rejects an invalid Ticket ID",
      async () => {
        const response = await detailRequest(
          staffCookie,
          "not-a-number"
        ).expect(400);

        expect(
          response.body.error.code
        ).toBe("VALIDATION_ERROR");
      }
    );

    it(
      "returns a safe response for a missing Ticket",
      async () => {
        const response = await detailRequest(
          staffCookie,
          999999999
        ).expect(404);

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

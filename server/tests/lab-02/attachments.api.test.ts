import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import request from "supertest";

import {
  mkdir,
  unlink,
  writeFile,
} from "node:fs/promises";

import * as path from "node:path";

import app from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();

const runId = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2, 8)}`;

const numberSeed =
  (Date.now() % 700000) +
  200000;

describe(
  "Lab 2 Attachment Lifecycle API",
  () => {
    let requesterAId: number;
    let requesterBId: number;

    let ownedTicketId: number;
    let otherTicketId: number;
    let limitTicketId: number;

    let activeAttachmentId: number;
    let otherAttachmentId: number;

    beforeAll(async () => {
      const requesters =
        await prisma.requesterUser.findMany({
          where: {
            isActive: true,
          },

          orderBy: {
            id: "asc",
          },

          take: 2,
        });

      if (
        requesters.length <
        2
      ) {
        throw new Error(
          "Attachment tests require at least two active Requesters."
        );
      }

      const category =
        await prisma.category.findFirstOrThrow({
          where: {
            isActive: true,
          },
        });

      const relatedSystem =
        await prisma.relatedSystem.findFirstOrThrow({
          where: {
            isActive: true,
          },
        });

      requesterAId =
        requesters[0].id;

      requesterBId =
        requesters[1].id;

      const ownedTicket =
        await prisma.ticket.create({
          data: {
            ticketNumber:
              `TKT-2098-${String(
                numberSeed
              ).padStart(
                6,
                "0"
              )}`,

            clientSubmissionId:
              `attachments-${runId}-owned`,

            requesterId:
              requesterAId,

            categoryId:
              category.id,

            relatedSystemId:
              relatedSystem.id,

            summary:
              "Attachment lifecycle owned ticket",

            description:
              "Ticket used to test the Attachment lifecycle.",

            requestedPriority:
              "MEDIUM",

            currentStatus:
              "NEW",
          },
        });

      const otherTicket =
        await prisma.ticket.create({
          data: {
            ticketNumber:
              `TKT-2098-${String(
                numberSeed + 1
              ).padStart(
                6,
                "0"
              )}`,

            clientSubmissionId:
              `attachments-${runId}-other`,

            requesterId:
              requesterBId,

            categoryId:
              category.id,

            relatedSystemId:
              relatedSystem.id,

            summary:
              "Other Requester attachment ticket",

            description:
              "Ticket belonging to a different Requester.",

            requestedPriority:
              "HIGH",

            currentStatus:
              "NEW",
          },
        });

      const limitTicket =
        await prisma.ticket.create({
          data: {
            ticketNumber:
              `TKT-2098-${String(
                numberSeed + 2
              ).padStart(
                6,
                "0"
              )}`,

            clientSubmissionId:
              `attachments-${runId}-limit`,

            requesterId:
              requesterAId,

            categoryId:
              category.id,

            relatedSystemId:
              relatedSystem.id,

            summary:
              "Attachment limit test ticket",

            description:
              "Ticket used to test the five active Attachment limit.",

            requestedPriority:
              "LOW",

            currentStatus:
              "NEW",
          },
        });

      ownedTicketId =
        ownedTicket.id;

      otherTicketId =
        otherTicket.id;

      limitTicketId =
        limitTicket.id;

      const uploadsDirectory =
        path.resolve(
          process.cwd(),
          "uploads"
        );

      await mkdir(
        uploadsDirectory,
        {
          recursive: true,
        }
      );

      const activeStoredFilename =
        `attachment-${runId}-active.pdf`;

      const otherStoredFilename =
        `attachment-${runId}-other.pdf`;

      const activeBuffer =
        Buffer.from(
          "Active Attachment test"
        );

      const otherBuffer =
        Buffer.from(
          "Other Requester Attachment"
        );

      await writeFile(
        path.join(
          uploadsDirectory,
          activeStoredFilename
        ),
        activeBuffer
      );

      await writeFile(
        path.join(
          uploadsDirectory,
          otherStoredFilename
        ),
        otherBuffer
      );

      const activeAttachment =
        await prisma.attachment.create({
          data: {
            ticketId:
              ownedTicketId,

            originalFilename:
              "evidence.pdf",

            storedFilename:
              activeStoredFilename,

            mimeType:
              "application/pdf",

            sizeBytes:
              activeBuffer.length,

            storagePath:
              `uploads/${activeStoredFilename}`,

            isRemoved:
              false,
          },
        });

      const otherAttachment =
        await prisma.attachment.create({
          data: {
            ticketId:
              otherTicketId,

            originalFilename:
              "private.pdf",

            storedFilename:
              otherStoredFilename,

            mimeType:
              "application/pdf",

            sizeBytes:
              otherBuffer.length,

            storagePath:
              `uploads/${otherStoredFilename}`,

            isRemoved:
              false,
          },
        });

      activeAttachmentId =
        activeAttachment.id;

      otherAttachmentId =
        otherAttachment.id;

      await prisma.attachment.createMany({
        data: Array.from(
          {
            length: 5,
          },

          (_, index) => ({
            ticketId:
              limitTicketId,

            originalFilename:
              `limit-${index + 1}.pdf`,

            storedFilename:
              `limit-${runId}-${index + 1}.pdf`,

            mimeType:
              "application/pdf",

            sizeBytes: 10,

            storagePath:
              `uploads/limit-${runId}-${index + 1}.pdf`,

            isRemoved:
              false,
          })
        ),
      });
    });

    afterAll(async () => {
      const ticketIds = [
        ownedTicketId,
        otherTicketId,
        limitTicketId,
      ].filter(Boolean);

      const attachments =
        await prisma.attachment.findMany({
          where: {
            ticketId: {
              in:
                ticketIds,
            },
          },

          select: {
            storagePath:
              true,
          },
        });

      for (
        const attachment of
        attachments
      ) {
        await unlink(
          path.resolve(
            process.cwd(),
            attachment.storagePath
          )
        ).catch(
          () => undefined
        );
      }

      await prisma.attachment.deleteMany({
        where: {
          ticketId: {
            in:
              ticketIds,
          },
        },
      });

      await prisma.ticket.deleteMany({
        where: {
          id: {
            in:
              ticketIds,
          },
        },
      });
    });

    it(
      "uploads a permitted Attachment",
      async () => {
        const response =
          await request(app)
            .post(
              `/api/tickets/${ownedTicketId}/attachments`
            )
            .set(
              "X-Development-Requester-Id",
              String(
                requesterAId
              )
            )
            .attach(
              "file",

              Buffer.from(
                "fake png data"
              ),

              {
                filename:
                  "screenshot.png",

                contentType:
                  "image/png",
              }
            )
            .expect(201);

        expect(
          response.body
            .attachment
        ).toEqual(
          expect.objectContaining({
            originalFilename:
              "screenshot.png",

            mimeType:
              "image/png",

            isRemoved:
              false,
          })
        );
      }
    );

    it(
      "returns Attachment metadata",
      async () => {
        const response =
          await request(app)
            .get(
              `/api/tickets/${ownedTicketId}/attachments`
            )
            .set(
              "X-Development-Requester-Id",
              String(
                requesterAId
              )
            )
            .expect(200);

        expect(
          response.body
            .attachments.length
        ).toBeGreaterThanOrEqual(
          1
        );
      }
    );

    it(
      "rejects unsupported file types",
      async () => {
        const response =
          await request(app)
            .post(
              `/api/tickets/${ownedTicketId}/attachments`
            )
            .set(
              "X-Development-Requester-Id",
              String(
                requesterAId
              )
            )
            .attach(
              "file",

              Buffer.from(
                "text"
              ),

              {
                filename:
                  "notes.txt",

                contentType:
                  "text/plain",
              }
            )
            .expect(415);

        expect(
          response.body.error
            .code
        ).toBe(
          "UNSUPPORTED_ATTACHMENT_TYPE"
        );
      }
    );

    it(
      "rejects files larger than 5 MB",
      async () => {
        const oversized =
          Buffer.alloc(
            5 *
              1024 *
              1024 +
              1
          );

        const response =
          await request(app)
            .post(
              `/api/tickets/${ownedTicketId}/attachments`
            )
            .set(
              "X-Development-Requester-Id",
              String(
                requesterAId
              )
            )
            .attach(
              "file",

              oversized,

              {
                filename:
                  "large.pdf",

                contentType:
                  "application/pdf",
              }
            )
            .expect(413);

        expect(
          response.body.error
            .code
        ).toBe(
          "ATTACHMENT_TOO_LARGE"
        );
      }
    );

    it(
      "enforces maximum five active Attachments",
      async () => {
        const response =
          await request(app)
            .post(
              `/api/tickets/${limitTicketId}/attachments`
            )
            .set(
              "X-Development-Requester-Id",
              String(
                requesterAId
              )
            )
            .attach(
              "file",

              Buffer.from(
                "sixth"
              ),

              {
                filename:
                  "sixth.pdf",

                contentType:
                  "application/pdf",
              }
            )
            .expect(409);

        expect(
          response.body.error
            .code
        ).toBe(
          "ATTACHMENT_LIMIT_REACHED"
        );
      }
    );

    it(
      "downloads an active owned Attachment",
      async () => {
        const response =
          await request(app)
            .get(
              `/api/attachments/${activeAttachmentId}/download`
            )
            .set(
              "X-Development-Requester-Id",
              String(
                requesterAId
              )
            )
            .expect(200);

        expect(
          response.headers[
            "content-disposition"
          ]
        ).toContain(
          "attachment"
        );
      }
    );

    it(
      "rejects upload to another Requester's Ticket",
      async () => {
        const response =
          await request(app)
            .post(
              `/api/tickets/${otherTicketId}/attachments`
            )
            .set(
              "X-Development-Requester-Id",
              String(
                requesterAId
              )
            )
            .attach(
              "file",

              Buffer.from(
                "private"
              ),

              {
                filename:
                  "private.pdf",

                contentType:
                  "application/pdf",
              }
            )
            .expect(404);

        expect(
          response.body.error
            .code
        ).toBe(
          "TICKET_NOT_FOUND"
        );
      }
    );

    it(
      "blocks another Requester's direct Attachment download",
      async () => {
        const response =
          await request(app)
            .get(
              `/api/attachments/${otherAttachmentId}/download`
            )
            .set(
              "X-Development-Requester-Id",
              String(
                requesterAId
              )
            )
            .expect(404);

        expect(
          response.body.error
            .code
        ).toBe(
          "ATTACHMENT_NOT_FOUND"
        );
      }
    );

    it(
      "requires a removal reason",
      async () => {
        const response =
          await request(app)
            .delete(
              `/api/attachments/${activeAttachmentId}`
            )
            .set(
              "X-Development-Requester-Id",
              String(
                requesterAId
              )
            )
            .send({
              reason: "x",
            })
            .expect(400);

        expect(
          response.body.error
            .code
        ).toBe(
          "VALIDATION_ERROR"
        );
      }
    );

    it(
      "soft-removes the Attachment and stores the reason",
      async () => {
        const response =
          await request(app)
            .delete(
              `/api/attachments/${activeAttachmentId}`
            )
            .set(
              "X-Development-Requester-Id",
              String(
                requesterAId
              )
            )
            .send({
              reason:
                "Uploaded the wrong evidence",
            })
            .expect(200);

        expect(
          response.body
            .attachment
        ).toEqual(
          expect.objectContaining({
            id:
              activeAttachmentId,

            isRemoved:
              true,

            removalReason:
              "Uploaded the wrong evidence",
          })
        );

        expect(
          response.body
            .attachment
            .removedAt
        ).toBeTruthy();
      }
    );

    it(
      "retains removed Attachment metadata",
      async () => {
        const response =
          await request(app)
            .get(
              `/api/tickets/${ownedTicketId}/attachments`
            )
            .set(
              "X-Development-Requester-Id",
              String(
                requesterAId
              )
            )
            .expect(200);

        const removed =
          response.body.attachments.find(
            (
              attachment: {
                id: number;
              }
            ) =>
              attachment.id ===
              activeAttachmentId
          );

        expect(
          removed
        ).toEqual(
          expect.objectContaining({
            isRemoved:
              true,

            removalReason:
              "Uploaded the wrong evidence",
          })
        );
      }
    );

    it(
      "blocks download after removal",
      async () => {
        const response =
          await request(app)
            .get(
              `/api/attachments/${activeAttachmentId}/download`
            )
            .set(
              "X-Development-Requester-Id",
              String(
                requesterAId
              )
            )
            .expect(404);

        expect(
          response.body.error
            .code
        ).toBe(
          "ATTACHMENT_NOT_FOUND"
        );
      }
    );

    it(
      "blocks removal of another Requester's Attachment",
      async () => {
        const response =
          await request(app)
            .delete(
              `/api/attachments/${otherAttachmentId}`
            )
            .set(
              "X-Development-Requester-Id",
              String(
                requesterAId
              )
            )
            .send({
              reason:
                "Should not work",
            })
            .expect(404);

        expect(
          response.body.error
            .code
        ).toBe(
          "ATTACHMENT_NOT_FOUND"
        );
      }
    );
  }
);
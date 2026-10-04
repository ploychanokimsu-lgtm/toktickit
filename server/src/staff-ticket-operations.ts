import {
  Prisma,
  RequestedPriority,
  TicketStatus,
  UserRole,
} from "@prisma/client";

import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";

import {
  requireAuth,
  requireCompletedPasswordChange,
} from "./auth.js";

import { getPrisma } from "./prisma.js";

import {
  STATUS_TRANSITIONS,
  loadResolutionGateInput,
  resolutionGateUnmet,
} from "./ticket-workflow.js";

const prisma = getPrisma();

export const staffTicketOperationsRouter =
  Router();

function errorResponse(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: Record<string, string>
) {
  return res.status(status).json({
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}

function requireStaffRole(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (
    req.authUser?.role !==
      UserRole.IT_STAFF &&
    req.authUser?.role !==
      UserRole.ADMINISTRATOR
  ) {
    return errorResponse(
      res,
      403,
      "FORBIDDEN",
      "You do not have permission to access IT Staff Ticket operations."
    );
  }

  return next();
}

function readTicketId(
  value: string
): number | null {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const ticketId = Number(value);

  return Number.isSafeInteger(ticketId)
    ? ticketId
    : null;
}

const ticketDetailSelect =
  Prisma.validator<Prisma.TicketSelect>()({
    id: true,
    ticketNumber: true,
    summary: true,
    description: true,
    requestedPriority: true,
    itPriority: true,
    currentStatus: true,
    requesterResolutionIndicatedAt: true,
    createdAt: true,
    updatedAt: true,

    requester: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },

    owner: {
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    },

    category: {
      select: {
        id: true,
        name: true,
      },
    },

    relatedSystem: {
      select: {
        id: true,
        name: true,
      },
    },

    attachments: {
      where: {
        isRemoved: false,
      },
      orderBy: [
        {
          uploadedAt: "asc",
        },
        {
          id: "asc",
        },
      ],
      select: {
        id: true,
        originalFilename: true,
        mimeType: true,
        sizeBytes: true,
        uploadedAt: true,
      },
    },

    publicComments: {
      orderBy: [
        {
          createdAt: "asc",
        },
        {
          id: "asc",
        },
      ],
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    },

    internalNotes: {
      orderBy: [
        {
          createdAt: "asc",
        },
        {
          id: "asc",
        },
      ],
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    },
  });

staffTicketOperationsRouter.use(
  requireAuth,
  requireCompletedPasswordChange,
  requireStaffRole
);

/**
 * GET /api/staff/tickets/staff-members
 *
 * Returns active users who may own operational
 * Tickets. Safe fields only.
 */
staffTicketOperationsRouter.get(
  "/staff-members",
  async (_req, res) => {
    try {
      const staffMembers =
        await prisma.user.findMany({
          where: {
            isActive: true,
            role: {
              in: [
                UserRole.IT_STAFF,
                UserRole.ADMINISTRATOR,
              ],
            },
          },
          orderBy: [
            {
              name: "asc",
            },
            {
              id: "asc",
            },
          ],
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        });

      return res.status(200).json({
        staffMembers,
      });
    } catch (error) {
      console.error(
        "Failed to load active IT Staff members:",
        error
      );

      return errorResponse(
        res,
        500,
        "INTERNAL_ERROR",
        "The active IT Staff list could not be loaded."
      );
    }
  }
);

/**
 * GET /api/staff/tickets/:ticketId
 *
 * Returns the complete safe Staff Ticket Detail,
 * including public comments and staff-only
 * internal notes.
 */
staffTicketOperationsRouter.get(
  "/:ticketId",
  async (req, res) => {
    const ticketId = readTicketId(
      req.params.ticketId
    );

    if (ticketId === null) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Ticket ID must be a positive integer.",
        {
          ticketId:
            "Ticket ID must be a positive integer.",
        }
      );
    }

    try {
      const ticket =
        await prisma.ticket.findUnique({
          where: {
            id: ticketId,
          },
          select: ticketDetailSelect,
        });

      if (!ticket) {
        return errorResponse(
          res,
          404,
          "TICKET_NOT_FOUND",
          "The requested Ticket was not found."
        );
      }

      return res.status(200).json({
        ticket,
      });
    } catch (error) {
      console.error(
        "Failed to load IT Staff Ticket Detail:",
        error
      );

      return errorResponse(
        res,
        500,
        "INTERNAL_ERROR",
        "The Ticket Detail could not be loaded."
      );
    }
  }
);




function readSingleFieldBody(
  value: unknown,
  field: string
): Record<string, unknown> | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const body =
    value as Record<string, unknown>;

  const keys = Object.keys(body);

  if (
    keys.length !== 1 ||
    keys[0] !== field
  ) {
    return null;
  }

  return body;
}

async function findOperationTicket(
  ticketId: number
) {
  return prisma.ticket.findUnique({
    where: {
      id: ticketId,
    },
    select: {
      id: true,
      ownerId: true,
      currentStatus: true,
    },
  });
}

/**
 * POST /api/staff/tickets/:ticketId/claim
 */
staffTicketOperationsRouter.post(
  "/:ticketId/claim",
  async (req, res) => {
    const ticketId = readTicketId(
      req.params.ticketId
    );

    if (ticketId === null) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Ticket ID must be a positive integer."
      );
    }

    if (
      req.body &&
      typeof req.body === "object" &&
      !Array.isArray(req.body) &&
      Object.keys(req.body).length > 0
    ) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Claim Ticket does not accept request fields.",
        {
          body:
            "The authenticated user is always used as the Ticket Owner.",
        }
      );
    }

    try {
      const existing =
        await findOperationTicket(ticketId);

      if (!existing) {
        return errorResponse(
          res,
          404,
          "TICKET_NOT_FOUND",
          "The requested Ticket was not found."
        );
      }

      if (existing.ownerId !== null) {
        return errorResponse(
          res,
          409,
          "TICKET_ALREADY_ASSIGNED",
          "The Ticket is already assigned."
        );
      }

      const result =
        await prisma.ticket.updateMany({
          where: {
            id: ticketId,
            ownerId: null,
          },
          data: {
            ownerId: req.authUser!.id,
          },
        });

      if (result.count !== 1) {
        return errorResponse(
          res,
          409,
          "TICKET_ALREADY_ASSIGNED",
          "The Ticket was assigned by another user."
        );
      }

      const ticket =
        await prisma.ticket.findUnique({
          where: {
            id: ticketId,
          },
          select: {
            id: true,
            ownerId: true,
            updatedAt: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        });

      return res.status(200).json({
        ticket,
      });
    } catch (error) {
      console.error(
        "Failed to claim Ticket:",
        error
      );

      return errorResponse(
        res,
        500,
        "INTERNAL_ERROR",
        "The Ticket could not be claimed."
      );
    }
  }
);

/**
 * PATCH /api/staff/tickets/:ticketId/assignment
 */
staffTicketOperationsRouter.patch(
  "/:ticketId/assignment",
  async (req, res) => {
    const ticketId = readTicketId(
      req.params.ticketId
    );

    if (ticketId === null) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Ticket ID must be a positive integer."
      );
    }

    const body = readSingleFieldBody(
      req.body,
      "ownerId"
    );

    if (
      !body ||
      typeof body.ownerId !== "number" ||
      !Number.isSafeInteger(body.ownerId) ||
      body.ownerId <= 0
    ) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Ticket Owner must be a positive integer.",
        {
          ownerId:
            "Provide exactly one valid ownerId field.",
        }
      );
    }

    try {
      const [ticket, owner] =
        await Promise.all([
          findOperationTicket(ticketId),

          prisma.user.findFirst({
            where: {
              id: body.ownerId,
              isActive: true,
              role: {
                in: [
                  UserRole.IT_STAFF,
                  UserRole.ADMINISTRATOR,
                ],
              },
            },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          }),
        ]);

      if (!ticket) {
        return errorResponse(
          res,
          404,
          "TICKET_NOT_FOUND",
          "The requested Ticket was not found."
        );
      }

      if (!owner) {
        return errorResponse(
          res,
          400,
          "INVALID_TICKET_OWNER",
          "The selected Ticket Owner is not an active operational staff member."
        );
      }

      const updated =
        await prisma.ticket.update({
          where: {
            id: ticketId,
          },
          data: {
            ownerId: owner.id,
          },
          select: {
            id: true,
            ownerId: true,
            updatedAt: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        });

      return res.status(200).json({
        ticket: updated,
      });
    } catch (error) {
      console.error(
        "Failed to reassign Ticket:",
        error
      );

      return errorResponse(
        res,
        500,
        "INTERNAL_ERROR",
        "The Ticket could not be reassigned."
      );
    }
  }
);

/**
 * PATCH /api/staff/tickets/:ticketId/priority
 */
staffTicketOperationsRouter.patch(
  "/:ticketId/priority",
  async (req, res) => {
    const ticketId = readTicketId(
      req.params.ticketId
    );

    if (ticketId === null) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Ticket ID must be a positive integer."
      );
    }

    const body = readSingleFieldBody(
      req.body,
      "itPriority"
    );

    if (
      !body ||
      typeof body.itPriority !== "string" ||
      !Object.values(
        RequestedPriority
      ).includes(
        body.itPriority as RequestedPriority
      )
    ) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "IT Priority is invalid.",
        {
          itPriority:
            "IT Priority must be LOW, MEDIUM, or HIGH.",
        }
      );
    }

    try {
      const ticket =
        await findOperationTicket(ticketId);

      if (!ticket) {
        return errorResponse(
          res,
          404,
          "TICKET_NOT_FOUND",
          "The requested Ticket was not found."
        );
      }

      const updated =
        await prisma.ticket.update({
          where: {
            id: ticketId,
          },
          data: {
            itPriority:
              body.itPriority as RequestedPriority,
          },
          select: {
            id: true,
            itPriority: true,
            updatedAt: true,
          },
        });

      return res.status(200).json({
        ticket: updated,
      });
    } catch (error) {
      console.error(
        "Failed to update IT Priority:",
        error
      );

      return errorResponse(
        res,
        500,
        "INTERNAL_ERROR",
        "IT Priority could not be updated."
      );
    }
  }
);

/**
 * GET /api/staff/tickets/:ticketId/workflow
 *
 * Lab 4: permitted next statuses and the resolution gate (FR-12).
 */
staffTicketOperationsRouter.get(
  "/:ticketId/workflow",
  async (req, res) => {
    const ticketId = readTicketId(
      req.params.ticketId
    );

    if (ticketId === null) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Ticket ID must be a positive integer."
      );
    }

    try {
      const ticket =
        await prisma.ticket.findUnique({
          where: { id: ticketId },
          select: {
            ownerId: true,
            currentStatus: true,
            requesterResolutionIndicatedAt: true,
          },
        });

      if (!ticket) {
        return errorResponse(
          res,
          404,
          "TICKET_NOT_FOUND",
          "The requested Ticket was not found."
        );
      }

      const unmet = resolutionGateUnmet(
        await loadResolutionGateInput(
          prisma,
          ticketId,
          ticket.ownerId
        )
      );

      return res.status(200).json({
        currentStatus: ticket.currentStatus,
        allowedNextStatuses:
          STATUS_TRANSITIONS[ticket.currentStatus],
        resolutionGate: {
          satisfied: unmet.length === 0,
          unmet,
        },
        requesterResolutionIndicatedAt:
          ticket.requesterResolutionIndicatedAt,
      });
    } catch (error) {
      console.error(
        "Failed to load Ticket workflow:",
        error
      );

      return errorResponse(
        res,
        500,
        "INTERNAL_ERROR",
        "The Ticket workflow could not be loaded."
      );
    }
  }
);

function readStatusBody(
  value: unknown
): {
  status: TicketStatus;
  expectedStatus: TicketStatus;
} | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const body = value as Record<string, unknown>;
  const keys = Object.keys(body).sort();

  if (
    keys.length !== 2 ||
    keys[0] !== "expectedStatus" ||
    keys[1] !== "status"
  ) {
    return null;
  }

  const statuses = Object.values(
    TicketStatus
  ) as string[];

  if (
    typeof body.status !== "string" ||
    typeof body.expectedStatus !== "string" ||
    !statuses.includes(body.status) ||
    !statuses.includes(body.expectedStatus)
  ) {
    return null;
  }

  return {
    status: body.status as TicketStatus,
    expectedStatus:
      body.expectedStatus as TicketStatus,
  };
}

class StatusChangeError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, string>
  ) {
    super(message);
  }
}

/**
 * PATCH /api/staff/tickets/:ticketId/status
 *
 * Lab 4: requires the status the client last saw (BR-21) and enforces
 * the resolution gate for RESOLVED (BR-20), in one transaction.
 */
staffTicketOperationsRouter.patch(
  "/:ticketId/status",
  async (req, res) => {
    const ticketId = readTicketId(
      req.params.ticketId
    );

    if (ticketId === null) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Ticket ID must be a positive integer."
      );
    }

    const body = readStatusBody(req.body);

    if (!body) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Ticket Status and the expected current status are required.",
        {
          status:
            "Send status and expectedStatus.",
        }
      );
    }

    const nextStatus = body.status;

    try {
      const updated =
        await prisma.$transaction(async (tx) => {
          const ticket =
            await tx.ticket.findUnique({
              where: { id: ticketId },
              select: {
                id: true,
                ownerId: true,
                currentStatus: true,
              },
            });

          if (!ticket) {
            throw new StatusChangeError(
              404,
              "TICKET_NOT_FOUND",
              "The requested Ticket was not found."
            );
          }

          if (
            ticket.currentStatus !==
            body.expectedStatus
          ) {
            throw new StatusChangeError(
              409,
              "TICKET_CHANGED",
              "The Ticket was changed by another user. Reload and try again."
            );
          }

          const allowed =
            STATUS_TRANSITIONS[
              ticket.currentStatus
            ];

          if (!allowed.includes(nextStatus)) {
            throw new StatusChangeError(
              409,
              "INVALID_STATUS_TRANSITION",
              `Ticket Status cannot change from ${ticket.currentStatus} to ${nextStatus}.`,
              {
                status:
                  allowed.length > 0
                    ? `Allowed next statuses: ${allowed.join(", ")}.`
                    : "No further status transitions are allowed.",
              }
            );
          }

          if (nextStatus === TicketStatus.RESOLVED) {
            const unmet = resolutionGateUnmet(
              await loadResolutionGateInput(
                tx,
                ticketId,
                ticket.ownerId
              )
            );

            if (unmet.length > 0) {
              throw new StatusChangeError(
                409,
                "RESOLUTION_GATE_NOT_MET",
                "This Ticket cannot be resolved yet.",
                { unmet: unmet.join(",") }
              );
            }
          }

          const result =
            await tx.ticket.updateMany({
              where: {
                id: ticketId,
                currentStatus:
                  ticket.currentStatus,
              },
              data: {
                currentStatus: nextStatus,
              },
            });

          if (result.count !== 1) {
            throw new StatusChangeError(
              409,
              "TICKET_CHANGED",
              "The Ticket was changed by another user. Reload and try again."
            );
          }

          return tx.ticket.findUnique({
            where: { id: ticketId },
            select: {
              id: true,
              currentStatus: true,
              updatedAt: true,
            },
          });
        });

      return res.status(200).json({
        ticket: updated,
      });
    } catch (error) {
      if (error instanceof StatusChangeError) {
        return errorResponse(
          res,
          error.status,
          error.code,
          error.message,
          error.details
        );
      }

      console.error(
        "Failed to update Ticket Status:",
        error
      );

      return errorResponse(
        res,
        500,
        "INTERNAL_ERROR",
        "Ticket Status could not be updated."
      );
    }
  }
);

const MAX_OPERATION_TEXT_LENGTH = 5000;

function readOperationContent(
  body: unknown
): string | null {
  const parsed = readSingleFieldBody(
    body,
    "content"
  );

  if (
    !parsed ||
    typeof parsed.content !== "string"
  ) {
    return null;
  }

  const content = parsed.content.trim();

  if (
    content.length === 0 ||
    content.length >
      MAX_OPERATION_TEXT_LENGTH
  ) {
    return null;
  }

  return content;
}

/**
 * POST /api/staff/tickets/:ticketId/comments
 */
staffTicketOperationsRouter.post(
  "/:ticketId/comments",
  async (req, res) => {
    const ticketId = readTicketId(
      req.params.ticketId
    );

    if (ticketId === null) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Ticket ID must be a positive integer."
      );
    }

    const content = readOperationContent(
      req.body
    );

    if (content === null) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Public Comment content is invalid.",
        {
          content:
            "Content is required and must not exceed 5000 characters.",
        }
      );
    }

    try {
      const ticket =
        await findOperationTicket(ticketId);

      if (!ticket) {
        return errorResponse(
          res,
          404,
          "TICKET_NOT_FOUND",
          "The requested Ticket was not found."
        );
      }

      const comment =
        await prisma.publicComment.create({
          data: {
            ticketId,
            authorId: req.authUser!.id,
            content,
          },
          select: {
            id: true,
            ticketId: true,
            content: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        });

      return res.status(201).json({
        comment,
      });
    } catch (error) {
      console.error(
        "Failed to add Public Comment:",
        error
      );

      return errorResponse(
        res,
        500,
        "INTERNAL_ERROR",
        "The Public Comment could not be added."
      );
    }
  }
);

/**
 * POST /api/staff/tickets/:ticketId/internal-notes
 */
staffTicketOperationsRouter.post(
  "/:ticketId/internal-notes",
  async (req, res) => {
    const ticketId = readTicketId(
      req.params.ticketId
    );

    if (ticketId === null) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Ticket ID must be a positive integer."
      );
    }

    const content = readOperationContent(
      req.body
    );

    if (content === null) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Internal Note content is invalid.",
        {
          content:
            "Content is required and must not exceed 5000 characters.",
        }
      );
    }

    try {
      const ticket =
        await findOperationTicket(ticketId);

      if (!ticket) {
        return errorResponse(
          res,
          404,
          "TICKET_NOT_FOUND",
          "The requested Ticket was not found."
        );
      }

      const note =
        await prisma.internalNote.create({
          data: {
            ticketId,
            authorId: req.authUser!.id,
            content,
          },
          select: {
            id: true,
            ticketId: true,
            content: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        });

      return res.status(201).json({
        note,
      });
    } catch (error) {
      console.error(
        "Failed to add Internal Note:",
        error
      );

      return errorResponse(
        res,
        500,
        "INTERNAL_ERROR",
        "The Internal Note could not be added."
      );
    }
  }
);

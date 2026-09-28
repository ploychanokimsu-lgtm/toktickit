import {
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

const prisma = getPrisma();

const MAX_COMMENT_LENGTH = 2000;

export const requesterCompletionRouter =
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

function requireRequesterRole(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (
    req.authUser?.role !==
    UserRole.REQUESTER
  ) {
    return errorResponse(
      res,
      403,
      "FORBIDDEN",
      "Requester access is required."
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

function readCommentContent(
  body: unknown
): string | null {
  if (
    typeof body !== "object" ||
    body === null ||
    !("content" in body)
  ) {
    return null;
  }

  const value = (
    body as {
      content?: unknown;
    }
  ).content;

  if (typeof value !== "string") {
    return null;
  }

  const content = value.trim();

  if (
    content.length === 0 ||
    content.length >
      MAX_COMMENT_LENGTH
  ) {
    return null;
  }

  return content;
}

async function findOwnedTicket(
  ticketId: number,
  requesterId: number
) {
  return prisma.ticket.findFirst({
    where: {
      id: ticketId,
      requesterId,
    },
    select: {
      id: true,
    },
  });
}

requesterCompletionRouter.use(
  requireAuth
);

requesterCompletionRouter.use(
  requireCompletedPasswordChange
);

requesterCompletionRouter.use(
  requireRequesterRole
);

/**
 * GET /api/tickets/:ticketId/comments
 */
requesterCompletionRouter.get(
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
        "Ticket ID must be a positive integer.",
        {
          ticketId:
            "Ticket ID must be a positive integer.",
        }
      );
    }

    try {
      const ticket =
        await findOwnedTicket(
          ticketId,
          req.authUser!.id
        );

      if (!ticket) {
        return errorResponse(
          res,
          404,
          "TICKET_NOT_FOUND",
          "Ticket not found."
        );
      }

      const comments =
        await prisma.publicComment.findMany({
          where: {
            ticketId,
          },
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
            ticketId: true,
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
        });

      return res.status(200).json({
        comments,
      });
    } catch (error) {
      console.error(
        "Failed to load Requester Public Comments:",
        error
      );

      return errorResponse(
        res,
        500,
        "INTERNAL_ERROR",
        "Public Comments could not be loaded."
      );
    }
  }
);

/**
 * POST /api/tickets/:ticketId/comments
 */
requesterCompletionRouter.post(
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

    const content =
      readCommentContent(req.body);

    if (content === null) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Public Comment content is invalid.",
        {
          content:
            "Content is required and must not exceed 2000 characters.",
        }
      );
    }

    try {
      const ticket =
        await findOwnedTicket(
          ticketId,
          req.authUser!.id
        );

      if (!ticket) {
        return errorResponse(
          res,
          404,
          "TICKET_NOT_FOUND",
          "Ticket not found."
        );
      }

      const comment =
        await prisma.publicComment.create({
          data: {
            ticketId,
            authorId:
              req.authUser!.id,
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
        "Failed to add Requester Public Comment:",
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
 * POST /api/tickets/:ticketId/problem-appears-resolved
 */
requesterCompletionRouter.post(
  "/:ticketId/problem-appears-resolved",
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
        await findOwnedTicket(
          ticketId,
          req.authUser!.id
        );

      if (!ticket) {
        return errorResponse(
          res,
          404,
          "TICKET_NOT_FOUND",
          "Ticket not found."
        );
      }

      const updated =
        await prisma.ticket.update({
          where: {
            id: ticketId,
          },
          data: {
            requesterResolutionIndicatedAt:
              new Date(),
          },
          select: {
            requesterResolutionIndicatedAt:
              true,
          },
        });

      return res.status(200).json({
        message:
          "Resolution indication recorded.",
        requesterResolutionIndicatedAt:
          updated
            .requesterResolutionIndicatedAt,
      });
    } catch (error) {
      console.error(
        "Failed to record Requester resolution indication:",
        error
      );

      return errorResponse(
        res,
        500,
        "INTERNAL_ERROR",
        "The resolution indication could not be recorded."
      );
    }
  }
);

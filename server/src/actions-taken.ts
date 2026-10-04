import {
  ActionTakenStatus,
  Prisma,
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
  type AuthUser,
} from "./auth.js";

import {
  CREATE_FIELDS,
  EDIT_FIELDS,
  isActionStatusTransitionAllowed,
  readBody,
  readClientRequestId,
  readVersion,
  validateActionTaken,
  type ActionTakenInput,
  type FieldErrors,
} from "./action-taken-rules.js";

import { getPrisma } from "./prisma.js";

const prisma = getPrisma();

// Lab 4 Actions Taken (Issue #56).
// Staff routes are mounted at /api/staff/tickets,
// the read-only Requester route at /api/tickets.
export const staffActionsTakenRouter = Router();
export const requesterActionsTakenRouter = Router();

const LOCKED_TICKET_STATUSES: readonly TicketStatus[] = [
  TicketStatus.CLOSED,
  TicketStatus.CANCELLED,
];

const userSummarySelect = {
  id: true,
  name: true,
  role: true,
} satisfies Prisma.UserSelect;

const actionTakenSelect = {
  id: true,
  ticketId: true,
  status: true,
  actionAt: true,
  completedAt: true,
  description: true,
  result: true,
  followUpRequired: true,
  followUpNote: true,
  attachmentNotes: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  performedById: true,
  assigneeId: true,
  performedBy: { select: userSummarySelect },
  assignee: { select: userSummarySelect },
  updatedBy: { select: userSummarySelect },
} satisfies Prisma.ActionTakenSelect;

type ActionTakenRecord = Prisma.ActionTakenGetPayload<{
  select: typeof actionTakenSelect;
}>;

const actionTakenOrder: Prisma.ActionTakenOrderByWithRelationInput[] = [
  { actionAt: "asc" },
  { id: "asc" },
];

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

function validationError(res: Response, details: FieldErrors) {
  return errorResponse(
    res,
    400,
    "VALIDATION_ERROR",
    "One or more fields are invalid.",
    details
  );
}

function readId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);

  return Number.isSafeInteger(id) ? id : null;
}

function isStaff(user: AuthUser | undefined): boolean {
  return (
    user?.role === UserRole.IT_STAFF ||
    user?.role === UserRole.ADMINISTRATOR
  );
}

function canEditAction(
  user: AuthUser,
  action: { performedById: number; assigneeId: number | null }
): boolean {
  return (
    user.role === UserRole.ADMINISTRATOR ||
    action.performedById === user.id ||
    action.assigneeId === user.id
  );
}

function toStaffResponse(
  action: ActionTakenRecord,
  user: AuthUser,
  ticketStatus: TicketStatus
) {
  const { performedById, assigneeId, ...rest } = action;

  return {
    ...rest,
    canEdit:
      action.status !== ActionTakenStatus.CANCELLED &&
      !LOCKED_TICKET_STATUSES.includes(ticketStatus) &&
      canEditAction(user, { performedById, assigneeId }),
  };
}

function toRequesterResponse(action: ActionTakenRecord) {
  return {
    id: action.id,
    ticketId: action.ticketId,
    status: action.status,
    actionAt: action.actionAt,
    completedAt: action.completedAt,
    description: action.description,
    result: action.result,
    followUpRequired: action.followUpRequired,
    followUpNote: action.followUpNote,
    attachmentNotes: action.attachmentNotes,
    performedBy: action.performedBy,
    assignee: action.assignee,
    createdAt: action.createdAt,
    updatedAt: action.updatedAt,
  };
}

/**
 * An assignee must be an active IT Staff or Administrator user.
 */
async function isEligibleAssignee(
  db: Prisma.TransactionClient,
  userId: number
): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true },
  });

  return Boolean(
    user &&
      user.isActive &&
      (user.role === UserRole.IT_STAFF ||
        user.role === UserRole.ADMINISTRATOR)
  );
}

function requireStaffRole(req: Request, res: Response, next: NextFunction) {
  if (!isStaff(req.authUser)) {
    return errorResponse(
      res,
      403,
      "FORBIDDEN",
      "You do not have permission to manage Actions Taken."
    );
  }

  return next();
}

function requireRequesterRole(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.authUser?.role !== UserRole.REQUESTER) {
    return errorResponse(
      res,
      403,
      "FORBIDDEN",
      "Requester access is required."
    );
  }

  return next();
}

// Thrown inside transactions to return a safe response.
class ActionTakenError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, string>
  ) {
    super(message);
  }
}

function handleError(res: Response, error: unknown, context: string) {
  if (error instanceof ActionTakenError) {
    return errorResponse(
      res,
      error.status,
      error.code,
      error.message,
      error.details
    );
  }

  console.error(`Failed to ${context}:`, error);

  return errorResponse(
    res,
    500,
    "INTERNAL_ERROR",
    "The Actions Taken request could not be completed."
  );
}

const ticketNotFound = () =>
  new ActionTakenError(
    404,
    "TICKET_NOT_FOUND",
    "The requested Ticket was not found."
  );

const actionNotFound = () =>
  new ActionTakenError(
    404,
    "ACTION_TAKEN_NOT_FOUND",
    "The requested Action Taken was not found."
  );

const ticketNotWritable = () =>
  new ActionTakenError(
    409,
    "TICKET_NOT_WRITABLE",
    "Actions Taken cannot be changed on a Closed or Cancelled Ticket."
  );

const invalidAssignee = () =>
  new ActionTakenError(
    400,
    "INVALID_ASSIGNEE",
    "The selected assignee is not an active IT Staff member.",
    { assigneeId: "Choose an active IT Staff member or Administrator." }
  );

// ============================================================
// IT Staff and Administrator routes
// ============================================================

staffActionsTakenRouter.use(
  "/:ticketId/actions-taken",
  requireAuth,
  requireCompletedPasswordChange,
  requireStaffRole
);

/**
 * GET /api/staff/tickets/:ticketId/actions-taken
 */
staffActionsTakenRouter.get("/:ticketId/actions-taken", async (req, res) => {
  const ticketId = readId(req.params.ticketId);

  if (ticketId === null) {
    return validationError(res, { ticketId: "Ticket ID is invalid." });
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        currentStatus: true,
        actionsTaken: {
          orderBy: actionTakenOrder,
          select: actionTakenSelect,
        },
      },
    });

    if (!ticket) {
      throw ticketNotFound();
    }

    return res.status(200).json({
      items: ticket.actionsTaken.map((action) =>
        toStaffResponse(action, req.authUser!, ticket.currentStatus)
      ),
    });
  } catch (error) {
    return handleError(res, error, "list Actions Taken");
  }
});

/**
 * GET /api/staff/tickets/:ticketId/actions-taken/:actionId
 */
staffActionsTakenRouter.get(
  "/:ticketId/actions-taken/:actionId",
  async (req, res) => {
    const ticketId = readId(req.params.ticketId);
    const actionId = readId(req.params.actionId);

    if (ticketId === null || actionId === null) {
      return validationError(res, { id: "Ticket or Action ID is invalid." });
    }

    try {
      const action = await prisma.actionTaken.findFirst({
        where: { id: actionId, ticketId },
        select: {
          ...actionTakenSelect,
          ticket: { select: { currentStatus: true } },
        },
      });

      if (!action) {
        throw actionNotFound();
      }

      const { ticket, ...record } = action;

      return res
        .status(200)
        .json(toStaffResponse(record, req.authUser!, ticket.currentStatus));
    } catch (error) {
      return handleError(res, error, "load Action Taken");
    }
  }
);

/**
 * POST /api/staff/tickets/:ticketId/actions-taken
 *
 * Performed By is always the authenticated user (BR-03).
 */
staffActionsTakenRouter.post("/:ticketId/actions-taken", async (req, res) => {
  const ticketId = readId(req.params.ticketId);

  if (ticketId === null) {
    return validationError(res, { ticketId: "Ticket ID is invalid." });
  }

  const user = req.authUser!;
  const errors: FieldErrors = {};
  const body = readBody(req.body, CREATE_FIELDS, errors);

  if (!body) {
    return validationError(res, errors);
  }

  const clientRequestId = readClientRequestId(body.clientRequestId, errors);

  if (body.status === ActionTakenStatus.CANCELLED) {
    errors.status = "A new Action Taken cannot be created as Cancelled.";
  }

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true, createdAt: true, currentStatus: true },
      });

      if (!ticket) {
        throw ticketNotFound();
      }

      // A retried request returns the action it already created (BR-13).
      if (clientRequestId) {
        const existing = await tx.actionTaken.findUnique({
          where: { ticketId_clientRequestId: { ticketId, clientRequestId } },
          select: actionTakenSelect,
        });

        if (existing) {
          return { created: false, action: existing, ticket };
        }
      }

      const values = validateActionTaken(
        body as ActionTakenInput,
        { ticketCreatedAt: ticket.createdAt, now: new Date() },
        errors
      );

      if (!values) {
        throw new ActionTakenError(
          400,
          "VALIDATION_ERROR",
          "One or more fields are invalid.",
          errors
        );
      }

      if (LOCKED_TICKET_STATUSES.includes(ticket.currentStatus)) {
        throw ticketNotWritable();
      }

      // The assignee defaults to the user recording the action.
      const assigneeId =
        body.assigneeId === undefined ? user.id : values.assigneeId;

      if (assigneeId !== null && !(await isEligibleAssignee(tx, assigneeId))) {
        throw invalidAssignee();
      }

      const action = await tx.actionTaken.create({
        data: {
          ticketId,
          performedById: user.id,
          assigneeId,
          status: values.status,
          actionAt: values.actionAt,
          completedAt:
            values.status === ActionTakenStatus.COMPLETED ? new Date() : null,
          description: values.description,
          result: values.result,
          followUpRequired: values.followUpRequired,
          followUpNote: values.followUpNote,
          attachmentNotes: values.attachmentNotes,
          clientRequestId,
        },
        select: actionTakenSelect,
      });

      // Recorded work counts as Ticket activity.
      await tx.ticket.update({
        where: { id: ticketId },
        data: { updatedAt: new Date() },
      });

      return { created: true, action, ticket };
    });

    return res
      .status(outcome.created ? 201 : 200)
      .json(
        toStaffResponse(outcome.action, user, outcome.ticket.currentStatus)
      );
  } catch (error) {
    // Two identical retries raced; return the one that won.
    if (
      clientRequestId &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.actionTaken.findUnique({
        where: { ticketId_clientRequestId: { ticketId, clientRequestId } },
        select: {
          ...actionTakenSelect,
          ticket: { select: { currentStatus: true } },
        },
      });

      if (existing) {
        const { ticket, ...record } = existing;
        return res
          .status(200)
          .json(toStaffResponse(record, user, ticket.currentStatus));
      }
    }

    return handleError(res, error, "create Action Taken");
  }
});

/**
 * PATCH /api/staff/tickets/:ticketId/actions-taken/:actionId
 *
 * Requires the version the client loaded (BR-12).
 */
staffActionsTakenRouter.patch(
  "/:ticketId/actions-taken/:actionId",
  async (req, res) => {
    const ticketId = readId(req.params.ticketId);
    const actionId = readId(req.params.actionId);

    if (ticketId === null || actionId === null) {
      return validationError(res, { id: "Ticket or Action ID is invalid." });
    }

    const user = req.authUser!;
    const errors: FieldErrors = {};
    const body = readBody(req.body, EDIT_FIELDS, errors);

    if (!body) {
      return validationError(res, errors);
    }

    const version = readVersion(body.version, errors);

    if (Object.keys(body).filter((key) => key !== "version").length === 0) {
      errors.body = "Provide at least one field to update.";
    }

    if (Object.keys(errors).length > 0 || version === null) {
      return validationError(res, errors);
    }

    try {
      const outcome = await prisma.$transaction(async (tx) => {
        const current = await tx.actionTaken.findFirst({
          where: { id: actionId, ticketId },
          select: {
            ...actionTakenSelect,
            ticket: { select: { createdAt: true, currentStatus: true } },
          },
        });

        if (!current) {
          throw actionNotFound();
        }

        if (!canEditAction(user, current)) {
          throw new ActionTakenError(
            403,
            "FORBIDDEN",
            "Only the IT Staff member who recorded or is assigned this action, or an Administrator, can edit it."
          );
        }

        if (current.version !== version) {
          throw new ActionTakenError(
            409,
            "ACTION_TAKEN_CHANGED",
            "This Action Taken was changed by another user. Reload and try again."
          );
        }

        if (LOCKED_TICKET_STATUSES.includes(current.ticket.currentStatus)) {
          throw ticketNotWritable();
        }

        if (current.status === ActionTakenStatus.CANCELLED) {
          throw new ActionTakenError(
            409,
            "ACTION_TAKEN_LOCKED",
            "A Cancelled Action Taken cannot be edited."
          );
        }

        const merged: ActionTakenInput = {
          actionAt: current.actionAt,
          description: current.description,
          result: current.result,
          followUpRequired: current.followUpRequired,
          followUpNote: current.followUpNote,
          attachmentNotes: current.attachmentNotes,
          status: current.status,
          assigneeId: current.assigneeId,
          ...(body as ActionTakenInput),
        };

        const values = validateActionTaken(
          merged,
          { ticketCreatedAt: current.ticket.createdAt, now: new Date() },
          errors
        );

        if (!values) {
          throw new ActionTakenError(
            400,
            "VALIDATION_ERROR",
            "One or more fields are invalid.",
            errors
          );
        }

        if (!isActionStatusTransitionAllowed(current.status, values.status)) {
          throw new ActionTakenError(
            409,
            "INVALID_ACTION_STATUS_TRANSITION",
            "Only a Planned Action Taken can be completed or cancelled."
          );
        }

        if (
          values.assigneeId !== current.assigneeId &&
          values.assigneeId !== null &&
          !(await isEligibleAssignee(tx, values.assigneeId))
        ) {
          throw invalidAssignee();
        }

        const completing =
          current.status !== ActionTakenStatus.COMPLETED &&
          values.status === ActionTakenStatus.COMPLETED;

        // Compare-and-set on version so a concurrent edit is never overwritten.
        const updated = await tx.actionTaken.updateMany({
          where: { id: actionId, ticketId, version },
          data: {
            status: values.status,
            actionAt: values.actionAt,
            description: values.description,
            result: values.result,
            followUpRequired: values.followUpRequired,
            followUpNote: values.followUpNote,
            attachmentNotes: values.attachmentNotes,
            assigneeId: values.assigneeId,
            updatedById: user.id,
            version: { increment: 1 },
            ...(completing ? { completedAt: new Date() } : {}),
          },
        });

        if (updated.count !== 1) {
          throw new ActionTakenError(
            409,
            "ACTION_TAKEN_CHANGED",
            "This Action Taken was changed by another user. Reload and try again."
          );
        }

        await tx.ticket.update({
          where: { id: ticketId },
          data: { updatedAt: new Date() },
        });

        const action = await tx.actionTaken.findUniqueOrThrow({
          where: { id: actionId },
          select: actionTakenSelect,
        });

        return { action, ticketStatus: current.ticket.currentStatus };
      });

      return res
        .status(200)
        .json(toStaffResponse(outcome.action, user, outcome.ticketStatus));
    } catch (error) {
      return handleError(res, error, "update Action Taken");
    }
  }
);

// ============================================================
// Requester read-only route
// ============================================================

requesterActionsTakenRouter.use(
  "/:ticketId/actions-taken",
  requireAuth,
  requireCompletedPasswordChange,
  requireRequesterRole
);

/**
 * GET /api/tickets/:ticketId/actions-taken
 *
 * Only for a Ticket the Requester owns; otherwise the same safe 404.
 */
requesterActionsTakenRouter.get(
  "/:ticketId/actions-taken",
  async (req, res) => {
    const ticketId = readId(req.params.ticketId);

    if (ticketId === null) {
      return validationError(res, { ticketId: "Ticket ID is invalid." });
    }

    try {
      const ticket = await prisma.ticket.findFirst({
        where: { id: ticketId, requesterId: req.authUser!.id },
        select: {
          actionsTaken: {
            orderBy: actionTakenOrder,
            select: actionTakenSelect,
          },
        },
      });

      if (!ticket) {
        throw ticketNotFound();
      }

      return res.status(200).json({
        items: ticket.actionsTaken.map(toRequesterResponse),
      });
    } catch (error) {
      return handleError(res, error, "list Requester Actions Taken");
    }
  }
);

import {
  Prisma,
  RequestedPriority,
  TicketStatus,
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

export const staffQueueRouter = Router();

const ALLOWED_PARAMETERS = new Set([
  "search",
  "categoryId",
  "requestedPriority",
  "itPriority",
  "status",
  "assignment",
  "ownerId",
  "sort",
  "direction",
  "page",
  "pageSize",
]);

const PRIORITIES = Object.values(RequestedPriority);
const STATUSES = Object.values(TicketStatus);

const SORT_FIELDS = [
  "updatedAt",
  "createdAt",
  "ticketNumber",
  "requestedPriority",
  "itPriority",
  "status",
] as const;

type SortField = (typeof SORT_FIELDS)[number];
type SortDirection = "asc" | "desc";
type AssignmentFilter =
  | "all"
  | "assigned"
  | "unassigned"
  | "mine";

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
    req.authUser?.role !== "IT_STAFF" &&
    req.authUser?.role !== "ADMINISTRATOR"
  ) {
    return errorResponse(
      res,
      403,
      "FORBIDDEN",
      "You do not have permission to access the IT Staff Ticket Queue."
    );
  }

  return next();
}

function readSingleQueryValue(
  value: unknown
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return typeof value === "string"
    ? value.trim()
    : undefined;
}

function readPositiveInteger(
  value: string | undefined
): number | null {
  if (
    value === undefined ||
    !/^[1-9]\d*$/.test(value)
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isSafeInteger(number)
    ? number
    : null;
}

staffQueueRouter.get(
  "/",
  requireAuth,
  requireCompletedPasswordChange,
  requireStaffRole,
  async (req, res) => {
    const unsupportedParameters = Object.keys(
      req.query
    ).filter(
      (parameter) =>
        !ALLOWED_PARAMETERS.has(parameter)
    );

    if (unsupportedParameters.length > 0) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "The request contains unsupported query parameters.",
        {
          query:
            `Unsupported parameter(s): ${unsupportedParameters.join(
              ", "
            )}.`,
        }
      );
    }

    const rawValues = Object.entries(req.query);

    const repeatedParameter = rawValues.find(
      ([, value]) => Array.isArray(value)
    );

    if (repeatedParameter) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Each query parameter may only be provided once.",
        {
          [repeatedParameter[0]]:
            "This query parameter may only be provided once.",
        }
      );
    }

    const search =
      readSingleQueryValue(req.query.search) ?? "";

    const categoryIdValue =
      readSingleQueryValue(req.query.categoryId);

    const ownerIdValue =
      readSingleQueryValue(req.query.ownerId);

    const requestedPriorityValue =
      readSingleQueryValue(
        req.query.requestedPriority
      );

    const itPriorityValue =
      readSingleQueryValue(req.query.itPriority);

    const statusValue =
      readSingleQueryValue(req.query.status);

    const assignmentValue =
      readSingleQueryValue(req.query.assignment) ??
      "all";

    const sortValue =
      readSingleQueryValue(req.query.sort) ??
      "updatedAt";

    const directionValue =
      readSingleQueryValue(req.query.direction) ??
      "desc";

    const pageValue =
      readSingleQueryValue(req.query.page) ?? "1";

    const pageSizeValue =
      readSingleQueryValue(req.query.pageSize) ??
      "25";

    if (search.length > 150) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Search must not exceed 150 characters.",
        {
          search:
            "Search must not exceed 150 characters.",
        }
      );
    }

    let categoryId: number | undefined;

    if (categoryIdValue !== undefined) {
      const parsed =
        readPositiveInteger(categoryIdValue);

      if (parsed === null) {
        return errorResponse(
          res,
          400,
          "VALIDATION_ERROR",
          "Category must be a positive integer.",
          {
            categoryId:
              "Category must be a positive integer.",
          }
        );
      }

      categoryId = parsed;
    }

    let ownerId: number | undefined;

    if (ownerIdValue !== undefined) {
      const parsed =
        readPositiveInteger(ownerIdValue);

      if (parsed === null) {
        return errorResponse(
          res,
          400,
          "VALIDATION_ERROR",
          "Ticket Owner must be a positive integer.",
          {
            ownerId:
              "Ticket Owner must be a positive integer.",
          }
        );
      }

      ownerId = parsed;
    }

    let requestedPriority:
      | RequestedPriority
      | undefined;

    if (requestedPriorityValue !== undefined) {
      if (
        !PRIORITIES.includes(
          requestedPriorityValue as RequestedPriority
        )
      ) {
        return errorResponse(
          res,
          400,
          "VALIDATION_ERROR",
          "Requested Priority is invalid.",
          {
            requestedPriority:
              "Requested Priority must be LOW, MEDIUM, or HIGH.",
          }
        );
      }

      requestedPriority =
        requestedPriorityValue as RequestedPriority;
    }

    let itPriority:
      | RequestedPriority
      | undefined;

    if (itPriorityValue !== undefined) {
      if (
        !PRIORITIES.includes(
          itPriorityValue as RequestedPriority
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

      itPriority =
        itPriorityValue as RequestedPriority;
    }

    let status: TicketStatus | undefined;

    if (statusValue !== undefined) {
      if (
        !STATUSES.includes(
          statusValue as TicketStatus
        )
      ) {
        return errorResponse(
          res,
          400,
          "VALIDATION_ERROR",
          "Ticket Status is invalid.",
          {
            status:
              "The supplied Ticket Status is invalid.",
          }
        );
      }

      status = statusValue as TicketStatus;
    }

    const assignmentValues:
      AssignmentFilter[] = [
        "all",
        "assigned",
        "unassigned",
        "mine",
      ];

    if (
      !assignmentValues.includes(
        assignmentValue as AssignmentFilter
      )
    ) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Assignment filter is invalid.",
        {
          assignment:
            "Assignment must be all, assigned, unassigned, or mine.",
        }
      );
    }

    if (
      ownerId !== undefined &&
      assignmentValue === "unassigned"
    ) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Ticket Owner cannot be combined with the unassigned filter.",
        {
          ownerId:
            "Remove Ticket Owner or change the assignment filter.",
        }
      );
    }

    if (
      !SORT_FIELDS.includes(
        sortValue as SortField
      )
    ) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Sort field is invalid.",
        {
          sort:
            `Sort must be one of: ${SORT_FIELDS.join(
              ", "
            )}.`,
        }
      );
    }

    if (
      directionValue !== "asc" &&
      directionValue !== "desc"
    ) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Sort direction is invalid.",
        {
          direction:
            "Direction must be asc or desc.",
        }
      );
    }

    const page = readPositiveInteger(pageValue);
    const pageSize =
      readPositiveInteger(pageSizeValue);

    if (page === null) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Page must be a positive integer.",
        {
          page: "Page must be a positive integer.",
        }
      );
    }

    if (
      pageSize === null ||
      pageSize > 100
    ) {
      return errorResponse(
        res,
        400,
        "VALIDATION_ERROR",
        "Page size must be between 1 and 100.",
        {
          pageSize:
            "Page size must be between 1 and 100.",
        }
      );
    }

    const assignment =
      assignmentValue as AssignmentFilter;

    const where: Prisma.TicketWhereInput = {
      ...(search
        ? {
            OR: [
              {
                ticketNumber: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                summary: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
      ...(categoryId !== undefined
        ? { categoryId }
        : {}),
      ...(requestedPriority !== undefined
        ? { requestedPriority }
        : {}),
      ...(itPriority !== undefined
        ? { itPriority }
        : {}),
      ...(status !== undefined
        ? { currentStatus: status }
        : {}),
      ...(ownerId !== undefined
        ? { ownerId }
        : {}),
      ...(assignment === "assigned"
        ? { ownerId: { not: null } }
        : {}),
      ...(assignment === "unassigned"
        ? { ownerId: null }
        : {}),
      ...(assignment === "mine"
        ? { ownerId: req.authUser!.id }
        : {}),
    };

    const sort = sortValue as SortField;
    const direction =
      directionValue as SortDirection;

    const orderBy:
      Prisma.TicketOrderByWithRelationInput[] = [
        sort === "status"
          ? { currentStatus: direction }
          : { [sort]: direction },
        { id: "desc" },
      ];

    try {
      const [tickets, totalItems] =
        await prisma.$transaction([
          prisma.ticket.findMany({
            where,
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
            select: {
              id: true,
              ticketNumber: true,
              summary: true,
              requestedPriority: true,
              itPriority: true,
              currentStatus: true,
              ownerId: true,
              createdAt: true,
              updatedAt: true,
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
              owner: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          }),
          prisma.ticket.count({ where }),
        ]);

      const totalPages =
        totalItems === 0
          ? 0
          : Math.ceil(totalItems / pageSize);

      return res.status(200).json({
        tickets,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages,
          hasPreviousPage: page > 1,
          hasNextPage: page < totalPages,
        },
        applied: {
          search,
          categoryId: categoryId ?? null,
          requestedPriority:
            requestedPriority ?? null,
          itPriority: itPriority ?? null,
          status: status ?? null,
          assignment,
          ownerId: ownerId ?? null,
          sort,
          direction,
        },
      });
    } catch (error) {
      console.error(
        "Failed to load IT Staff Ticket Queue:",
        error
      );

      return errorResponse(
        res,
        500,
        "INTERNAL_ERROR",
        "The Ticket Queue could not be loaded. Please try again."
      );
    }
  }
);
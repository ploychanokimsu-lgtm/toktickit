import cors from "cors";
import express, {
  type Request,
  type Response,
} from "express";

import {
  Prisma,
  type RequestedPriority,
} from "@prisma/client";

import { getPrisma } from "./prisma.js";

const app = express();

app.use(cors());
app.use(express.json());

const prisma = getPrisma();

// ============================================================
// Constants / Types
// ============================================================

const ALLOWED_PRIORITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
] as const;

const ALLOWED_PAGE_SIZES = [
  10,
  20,
  50,
];

const ALLOWED_SORT_FIELDS = [
  "updatedAt",
  "createdAt",
  "ticketNumber",
  "summary",
  "requestedPriority",
] as const;

type AllowedPriority =
  (typeof ALLOWED_PRIORITIES)[number];

type AllowedSortField =
  (typeof ALLOWED_SORT_FIELDS)[number];

interface CreateTicketBody {
  clientSubmissionId?: unknown;
  requesterId?: unknown;
  categoryId?: unknown;
  relatedSystemId?: unknown;
  summary?: unknown;
  requestedPriority?: unknown;
  description?: unknown;
}

interface RequesterContextUser {
  id: number;
  name: string;
  email: string;
}

type RequesterContextResult =
  | {
      ok: true;
      requester: RequesterContextUser;
    }
  | {
      ok: false;
      error: {
        status: number;
        code:
          | "REQUESTER_CONTEXT_REQUIRED"
          | "INVALID_REQUESTER_CONTEXT";
        message: string;
      };
    };

// ============================================================
// Helpers
// ============================================================

function validationError(
  res: Response,
  message: string,
  fields?: Record<string, string>
) {
  return res.status(400).json({
    error: {
      code: "VALIDATION_ERROR",
      message,
      ...(fields
        ? {
            fields,
          }
        : {}),
    },
  });
}

function queryString(
  value: unknown
): string | undefined {
  return typeof value === "string"
    ? value
    : undefined;
}

function positiveInteger(
  value: string
): number | null {
  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
}

async function getActiveRequesterContext(
  req: Request
): Promise<RequesterContextResult> {
  const rawId = req.header(
    "X-Development-Requester-Id"
  );

  if (!rawId) {
    return {
      ok: false,
      error: {
        status: 400,
        code:
          "REQUESTER_CONTEXT_REQUIRED",
        message:
          "A Development Requester context is required.",
      },
    };
  }

  const requesterId =
    positiveInteger(rawId);

  if (requesterId === null) {
    return {
      ok: false,
      error: {
        status: 400,
        code:
          "INVALID_REQUESTER_CONTEXT",
        message:
          "The Development Requester context is invalid.",
      },
    };
  }

  const requester =
    await prisma.requesterUser.findFirst({
      where: {
        id: requesterId,
        isActive: true,
      },

      select: {
        id: true,
        name: true,
        email: true,
      },
    });

  if (!requester) {
    return {
      ok: false,
      error: {
        status: 400,
        code:
          "INVALID_REQUESTER_CONTEXT",
        message:
          "The Development Requester context is invalid or inactive.",
      },
    };
  }

  return {
    ok: true,
    requester,
  };
}

function buildOrderBy(
  sortBy: AllowedSortField,
  sortOrder: "asc" | "desc"
): Prisma.TicketOrderByWithRelationInput[] {
  let primary: Prisma.TicketOrderByWithRelationInput;

  switch (sortBy) {
    case "createdAt":
      primary = {
        createdAt: sortOrder,
      };
      break;

    case "ticketNumber":
      primary = {
        ticketNumber: sortOrder,
      };
      break;

    case "summary":
      primary = {
        summary: sortOrder,
      };
      break;

    case "requestedPriority":
      primary = {
        requestedPriority:
          sortOrder,
      };
      break;

    case "updatedAt":
    default:
      primary = {
        updatedAt: sortOrder,
      };
      break;
  }

  return [
    primary,
    {
      id: sortOrder,
    },
  ];
}

async function generateTicketNumber(): Promise<string> {
  const year =
    new Date().getFullYear();

  const latestTicket =
    await prisma.ticket.findFirst({
      orderBy: {
        id: "desc",
      },

      select: {
        id: true,
      },
    });

  const nextNumber =
    (latestTicket?.id ?? 0) + 1;

  return `TKT-${year}-${String(
    nextNumber
  ).padStart(6, "0")}`;
}

// ============================================================
// Health
// ============================================================

app.get(
  "/api/health",
  (
    _req: Request,
    res: Response
  ) => {
    res.status(200).json({
      status: "ok",
      service: "TokTickIT API",
    });
  }
);

// ============================================================
// Categories
// ============================================================

app.get(
  "/api/categories",
  async (
    _req: Request,
    res: Response
  ) => {
    try {
      const categories =
        await prisma.category.findMany({
          where: {
            isActive: true,
          },

          select: {
            id: true,
            name: true,
          },

          orderBy: {
            id: "asc",
          },
        });

      res
        .status(200)
        .json(categories);
    } catch (error) {
      console.error(
        "Failed to fetch categories:",
        error
      );

      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message:
            "Failed to fetch Categories.",
        },
      });
    }
  }
);

// ============================================================
// Development Requesters
// ============================================================

app.get(
  "/api/requesters",
  async (
    _req: Request,
    res: Response
  ) => {
    try {
      const requesters =
        await prisma.requesterUser.findMany({
          where: {
            isActive: true,
          },

          select: {
            id: true,
            name: true,
            email: true,
          },

          orderBy: {
            name: "asc",
          },
        });

      res.status(200).json({
        requesters,
      });
    } catch (error) {
      console.error(
        "Failed to fetch Development Requesters:",
        error
      );

      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message:
            "Failed to fetch Development Requesters.",
        },
      });
    }
  }
);

// ============================================================
// Related Systems
// ============================================================

app.get(
  "/api/related-systems",
  async (
    _req: Request,
    res: Response
  ) => {
    try {
      const relatedSystems =
        await prisma.relatedSystem.findMany({
          where: {
            isActive: true,
          },

          select: {
            id: true,
            name: true,
          },

          orderBy: {
            name: "asc",
          },
        });

      res.status(200).json({
        relatedSystems,
      });
    } catch (error) {
      console.error(
        "Failed to fetch Related Systems:",
        error
      );

      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message:
            "Failed to fetch Related Systems.",
        },
      });
    }
  }
);

// ============================================================
// My Tickets
// GET /api/tickets
// ============================================================

app.get(
  "/api/tickets",
  async (
    req: Request,
    res: Response
  ) => {
    try {
      // ------------------------------------------------------
      // Requester context / ownership
      // ------------------------------------------------------

      const requesterResult =
        await getActiveRequesterContext(
          req
        );

      if (!requesterResult.ok) {
        return res
          .status(
            requesterResult.error
              .status
          )
          .json({
            error: {
              code:
                requesterResult.error
                  .code,

              message:
                requesterResult.error
                  .message,
            },
          });
      }

      const requesterId =
        requesterResult.requester.id;

      // ------------------------------------------------------
      // Query parameters
      // ------------------------------------------------------

      const search =
        queryString(
          req.query.search
        )?.trim() ?? "";

      const pageRaw =
        queryString(
          req.query.page
        ) ?? "1";

      const pageSizeRaw =
        queryString(
          req.query.pageSize
        ) ?? "10";

      const categoryIdRaw =
        queryString(
          req.query.categoryId
        );

      const relatedSystemIdRaw =
        queryString(
          req.query.relatedSystemId
        );

      const requestedPriorityRaw =
        queryString(
          req.query
            .requestedPriority
        );

      const sortByRaw =
        queryString(
          req.query.sortBy
        ) ?? "updatedAt";

      const sortOrderRaw =
        queryString(
          req.query.sortOrder
        ) ?? "desc";

      const page =
        Number(pageRaw);

      const pageSize =
        Number(pageSizeRaw);

      // ------------------------------------------------------
      // Pagination validation
      // ------------------------------------------------------

      if (
        !Number.isInteger(page) ||
        page < 1
      ) {
        return validationError(
          res,
          "Page must be a positive integer."
        );
      }

      if (
        !Number.isInteger(
          pageSize
        ) ||
        !ALLOWED_PAGE_SIZES.includes(
          pageSize
        )
      ) {
        return validationError(
          res,
          "Page size must be 10, 20, or 50."
        );
      }

      // ------------------------------------------------------
      // Category filter
      // ------------------------------------------------------

      let categoryId:
        | number
        | undefined;

      if (
        categoryIdRaw !==
        undefined
      ) {
        const parsed =
          positiveInteger(
            categoryIdRaw
          );

        if (parsed === null) {
          return validationError(
            res,
            "Category filter is invalid."
          );
        }

        categoryId = parsed;
      }

      // ------------------------------------------------------
      // Related System filter
      // ------------------------------------------------------

      let relatedSystemId:
        | number
        | undefined;

      if (
        relatedSystemIdRaw !==
        undefined
      ) {
        const parsed =
          positiveInteger(
            relatedSystemIdRaw
          );

        if (parsed === null) {
          return validationError(
            res,
            "Related System filter is invalid."
          );
        }

        relatedSystemId =
          parsed;
      }

      // ------------------------------------------------------
      // Priority filter
      // ------------------------------------------------------

      let requestedPriority:
        | RequestedPriority
        | undefined;

      if (
        requestedPriorityRaw !==
        undefined
      ) {
        if (
          !ALLOWED_PRIORITIES.includes(
            requestedPriorityRaw as AllowedPriority
          )
        ) {
          return validationError(
            res,
            "Requested Priority filter must be LOW, MEDIUM, or HIGH."
          );
        }

        requestedPriority =
          requestedPriorityRaw as RequestedPriority;
      }

      // ------------------------------------------------------
      // Sort validation
      // ------------------------------------------------------

      if (
        !ALLOWED_SORT_FIELDS.includes(
          sortByRaw as AllowedSortField
        )
      ) {
        return validationError(
          res,
          "Sort field is invalid."
        );
      }

      if (
        sortOrderRaw !== "asc" &&
        sortOrderRaw !== "desc"
      ) {
        return validationError(
          res,
          "Sort order must be asc or desc."
        );
      }

      const sortBy =
        sortByRaw as AllowedSortField;

      const sortOrder =
        sortOrderRaw as
          | "asc"
          | "desc";

      // ------------------------------------------------------
      // Ownership-safe WHERE clause
      // ------------------------------------------------------

      const where: Prisma.TicketWhereInput =
        {
          requesterId,

          ...(categoryId !==
          undefined
            ? {
                categoryId,
              }
            : {}),

          ...(relatedSystemId !==
          undefined
            ? {
                relatedSystemId,
              }
            : {}),

          ...(requestedPriority !==
          undefined
            ? {
                requestedPriority,
              }
            : {}),

          ...(search
            ? {
                OR: [
                  {
                    ticketNumber: {
                      contains:
                        search,
                      mode:
                        "insensitive",
                    },
                  },

                  {
                    summary: {
                      contains:
                        search,
                      mode:
                        "insensitive",
                    },
                  },
                ],
              }
            : {}),
        };

      const orderBy =
        buildOrderBy(
          sortBy,
          sortOrder
        );

      // ------------------------------------------------------
      // Query Tickets + count
      // ------------------------------------------------------

      const [
        tickets,
        totalItems,
      ] =
        await prisma.$transaction(
          [
            prisma.ticket.findMany(
              {
                where,

                orderBy,

                skip:
                  (page - 1) *
                  pageSize,

                take: pageSize,

                select: {
                  id: true,

                  ticketNumber:
                    true,

                  requesterId:
                    true,

                  categoryId:
                    true,

                  relatedSystemId:
                    true,

                  summary: true,

                  requestedPriority:
                    true,

                  currentStatus:
                    true,

                  createdAt:
                    true,

                  updatedAt:
                    true,

                  category: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },

                  relatedSystem:
                    {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                },
              }
            ),

            prisma.ticket.count({
              where,
            }),
          ]
        );

      const totalPages =
        totalItems === 0
          ? 0
          : Math.ceil(
              totalItems /
                pageSize
            );

      return res
        .status(200)
        .json({
          tickets,

          pagination: {
            page,
            pageSize,
            totalItems,
            totalPages,
          },
        });
    } catch (error) {
      console.error(
        "Failed to fetch My Tickets:",
        error
      );

      return res
        .status(500)
        .json({
          error: {
            code:
              "INTERNAL_ERROR",

            message:
              "Unable to load Tickets. Please try again.",
          },
        });
    }
  }
);

// ============================================================
// Requester Ticket Detail
// GET /api/tickets/:ticketId
// ============================================================

app.get(
  "/api/tickets/:ticketId",
  async (
    req: Request,
    res: Response
  ) => {
    try {
      // ------------------------------------------------------
      // Requester context
      // ------------------------------------------------------

      const requesterResult =
        await getActiveRequesterContext(
          req
        );

      if (!requesterResult.ok) {
        return res
          .status(
            requesterResult.error
              .status
          )
          .json({
            error: {
              code:
                requesterResult.error
                  .code,

              message:
                requesterResult.error
                  .message,
            },
          });
      }

      // ------------------------------------------------------
      // Ticket ID validation
      // ------------------------------------------------------

      const rawTicketId =
        req.params.ticketId;

      const ticketId =
        positiveInteger(
          rawTicketId
        );

      if (ticketId === null) {
        return validationError(
          res,
          "Ticket ID is invalid."
        );
      }

      // ------------------------------------------------------
      // Ownership-enforced retrieval
      // ------------------------------------------------------

      const ticket =
        await prisma.ticket.findFirst({
          where: {
            id: ticketId,

            requesterId:
              requesterResult
                .requester.id,
          },

          select: {
            id: true,

            ticketNumber:
              true,

            requesterId:
              true,

            categoryId:
              true,

            relatedSystemId:
              true,

            summary: true,

            description: true,

            requestedPriority:
              true,

            currentStatus:
              true,

            itPriority: true,

            createdAt: true,

            updatedAt: true,

            requester: {
              select: {
                id: true,
                name: true,
                email: true,
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
              orderBy: {
                uploadedAt:
                  "asc",
              },

              select: {
                id: true,

                originalFilename:
                  true,

                mimeType:
                  true,

                sizeBytes:
                  true,

                isRemoved:
                  true,

                uploadedAt:
                  true,

                removedAt:
                  true,

                removalReason:
                  true,
              },
            },
          },
        });

      // ------------------------------------------------------
      // Safe ownership failure:
      // missing and non-owned Tickets return identical 404
      // ------------------------------------------------------

      if (!ticket) {
        return res
          .status(404)
          .json({
            error: {
              code:
                "TICKET_NOT_FOUND",

              message:
                "Ticket not found.",
            },
          });
      }

      return res
        .status(200)
        .json({
          ticket,
        });
    } catch (error) {
      console.error(
        "Failed to fetch Ticket Detail:",
        error
      );

      return res
        .status(500)
        .json({
          error: {
            code:
              "INTERNAL_ERROR",

            message:
              "Unable to load Ticket Detail. Please try again.",
          },
        });
    }
  }
);

// ============================================================
// Create Ticket
// POST /api/tickets
// ============================================================

app.post(
  "/api/tickets",
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const body =
        req.body as CreateTicketBody;

      // ------------------------------------------------------
      // Client submission ID
      // ------------------------------------------------------

      if (
        typeof body.clientSubmissionId !==
          "string" ||
        body.clientSubmissionId
          .trim().length === 0
      ) {
        return validationError(
          res,
          "A valid client submission ID is required.",
          {
            clientSubmissionId:
              "Client submission ID is required.",
          }
        );
      }

      const clientSubmissionId =
        body.clientSubmissionId.trim();

      // ------------------------------------------------------
      // Requester
      // ------------------------------------------------------

      if (
        typeof body.requesterId !==
          "number" ||
        !Number.isInteger(
          body.requesterId
        ) ||
        body.requesterId <= 0
      ) {
        return validationError(
          res,
          "A valid Requester is required.",
          {
            requesterId:
              "Requester is required.",
          }
        );
      }

      // ------------------------------------------------------
      // Category
      // ------------------------------------------------------

      if (
        typeof body.categoryId !==
          "number" ||
        !Number.isInteger(
          body.categoryId
        ) ||
        body.categoryId <= 0
      ) {
        return validationError(
          res,
          "A valid Category is required.",
          {
            categoryId:
              "Category is required.",
          }
        );
      }

      // ------------------------------------------------------
      // Related System
      // ------------------------------------------------------

      if (
        typeof body.relatedSystemId !==
          "number" ||
        !Number.isInteger(
          body.relatedSystemId
        ) ||
        body.relatedSystemId <= 0
      ) {
        return validationError(
          res,
          "A valid Related System is required.",
          {
            relatedSystemId:
              "Related System is required.",
          }
        );
      }

      // ------------------------------------------------------
      // Summary
      // ------------------------------------------------------

      if (
        typeof body.summary !==
        "string"
      ) {
        return validationError(
          res,
          "Ticket Summary is required.",
          {
            summary:
              "Ticket Summary is required.",
          }
        );
      }

      const summary =
        body.summary.trim();

      if (
        summary.length < 5
      ) {
        return validationError(
          res,
          "Ticket Summary must contain at least 5 characters.",
          {
            summary:
              "Ticket Summary must contain at least 5 characters.",
          }
        );
      }

      if (
        summary.length > 150
      ) {
        return validationError(
          res,
          "Ticket Summary must not exceed 150 characters.",
          {
            summary:
              "Ticket Summary must not exceed 150 characters.",
          }
        );
      }

      // ------------------------------------------------------
      // Description
      // ------------------------------------------------------

      if (
        typeof body.description !==
          "string"
      ) {
        return validationError(
          res,
          "Description is required.",
          {
            description:
              "Description is required.",
          }
        );
      }

      const description =
        body.description.trim();

      if (
        description.length <
        10
      ) {
        return validationError(
          res,
          "Description must contain at least 10 characters.",
          {
            description:
              "Description must contain at least 10 characters.",
          }
        );
      }

      if (
        description.length >
        5000
      ) {
        return validationError(
          res,
          "Description must not exceed 5000 characters.",
          {
            description:
              "Description must not exceed 5000 characters.",
          }
        );
      }

      // ------------------------------------------------------
      // Requested Priority
      // ------------------------------------------------------

      if (
        typeof body.requestedPriority !==
          "string" ||
        !ALLOWED_PRIORITIES.includes(
          body.requestedPriority as AllowedPriority
        )
      ) {
        return validationError(
          res,
          "Requested Priority must be LOW, MEDIUM, or HIGH.",
          {
            requestedPriority:
              "Requested Priority must be LOW, MEDIUM, or HIGH.",
          }
        );
      }

      const requestedPriority =
        body.requestedPriority as RequestedPriority;

      // ------------------------------------------------------
      // Duplicate submission protection
      // ------------------------------------------------------

      const duplicateTicket =
        await prisma.ticket.findUnique({
          where: {
            clientSubmissionId,
          },

          select: {
            id: true,
            ticketNumber:
              true,
          },
        });

      if (duplicateTicket) {
        return res
          .status(409)
          .json({
            error: {
              code:
                "DUPLICATE_SUBMISSION",

              message:
                "This Ticket submission has already been processed.",
            },
          });
      }

      // ------------------------------------------------------
      // Validate active reference data
      // ------------------------------------------------------

      const [
        requester,
        category,
        relatedSystem,
      ] = await Promise.all([
        prisma.requesterUser.findFirst(
          {
            where: {
              id:
                body.requesterId,

              isActive:
                true,
            },

            select: {
              id: true,
            },
          }
        ),

        prisma.category.findFirst({
          where: {
            id:
              body.categoryId,

            isActive: true,
          },

          select: {
            id: true,
          },
        }),

        prisma.relatedSystem.findFirst(
          {
            where: {
              id:
                body.relatedSystemId,

              isActive:
                true,
            },

            select: {
              id: true,
            },
          }
        ),
      ]);

      if (!requester) {
        return validationError(
          res,
          "The selected Development Requester is unavailable.",
          {
            requesterId:
              "The selected Development Requester is unavailable.",
          }
        );
      }

      if (!category) {
        return validationError(
          res,
          "The selected Category is unavailable.",
          {
            categoryId:
              "The selected Category is unavailable.",
          }
        );
      }

      if (!relatedSystem) {
        return validationError(
          res,
          "The selected Related System is unavailable.",
          {
            relatedSystemId:
              "The selected Related System is unavailable.",
          }
        );
      }

      // ------------------------------------------------------
      // Create Ticket
      // ------------------------------------------------------

      const ticketNumber =
        await generateTicketNumber();

      const ticket =
        await prisma.ticket.create({
          data: {
            ticketNumber,

            clientSubmissionId,

            requesterId:
              body.requesterId,

            categoryId:
              body.categoryId,

            relatedSystemId:
              body.relatedSystemId,

            summary,

            requestedPriority,

            description,

            currentStatus:
              "NEW",
          },

          select: {
            id: true,

            ticketNumber:
              true,

            clientSubmissionId:
              true,

            requesterId:
              true,

            categoryId:
              true,

            relatedSystemId:
              true,

            summary: true,

            requestedPriority:
              true,

            description:
              true,

            currentStatus:
              true,

            createdAt: true,

            updatedAt: true,
          },
        });

      return res
        .status(201)
        .json({
          ticket,
        });
    } catch (error) {
      console.error(
        "Failed to create Ticket:",
        error
      );

      return res
        .status(500)
        .json({
          error: {
            code:
              "INTERNAL_ERROR",

            message:
              "The Ticket could not be created. Please try again.",
          },
        });
    }
  }
);

// ============================================================
// Exports
// ============================================================

export { app };
export default app;
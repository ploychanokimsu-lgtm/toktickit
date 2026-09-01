import cors from "cors";
import express, { type Request, type Response } from "express";
import { getPrisma } from "./prisma.js";

const app = express();

app.use(cors());
app.use(express.json());

const prisma = getPrisma();

const ALLOWED_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

type AllowedPriority = (typeof ALLOWED_PRIORITIES)[number];

interface CreateTicketBody {
  clientSubmissionId?: unknown;
  requesterId?: unknown;
  categoryId?: unknown;
  relatedSystemId?: unknown;
  summary?: unknown;
  requestedPriority?: unknown;
  description?: unknown;
}

function validationError(
  res: Response,
  message: string,
  fields?: Record<string, string>
) {
  return res.status(400).json({
    error: {
      code: "VALIDATION_ERROR",
      message,
      ...(fields ? { fields } : {}),
    },
  });
}

async function generateTicketNumber(): Promise<string> {
  const year = new Date().getFullYear();

  const latestTicket = await prisma.ticket.findFirst({
    orderBy: {
      id: "desc",
    },
    select: {
      id: true,
    },
  });

  const nextNumber = (latestTicket?.id ?? 0) + 1;

  return `TKT-${year}-${String(nextNumber).padStart(6, "0")}`;
}

// ------------------------------------------------------------
// Health
// ------------------------------------------------------------

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "TokTickIT API",
  });
});

// ------------------------------------------------------------
// Categories
// ------------------------------------------------------------

app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
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

    res.status(200).json(categories);
  } catch (error) {
    console.error("Failed to fetch categories:", error);

    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch Categories.",
      },
    });
  }
});

// ------------------------------------------------------------
// Development Requesters
// ------------------------------------------------------------

app.get("/api/requesters", async (_req: Request, res: Response) => {
  try {
    const requesters = await prisma.requesterUser.findMany({
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
    console.error("Failed to fetch Development Requesters:", error);

    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch Development Requesters.",
      },
    });
  }
});

// ------------------------------------------------------------
// Related Systems
// ------------------------------------------------------------

app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const relatedSystems = await prisma.relatedSystem.findMany({
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
    console.error("Failed to fetch Related Systems:", error);

    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch Related Systems.",
      },
    });
  }
});

// ------------------------------------------------------------
// Create Ticket
// ------------------------------------------------------------

app.post("/api/tickets", async (req: Request, res: Response) => {
  try {
    const body = req.body as CreateTicketBody;

    // --------------------------------------------------------
    // Validate clientSubmissionId
    // --------------------------------------------------------

    if (
      typeof body.clientSubmissionId !== "string" ||
      body.clientSubmissionId.trim().length === 0
    ) {
      return validationError(
        res,
        "A valid client submission ID is required.",
        {
          clientSubmissionId: "Client submission ID is required.",
        }
      );
    }

    const clientSubmissionId = body.clientSubmissionId.trim();

    // --------------------------------------------------------
    // Validate IDs
    // --------------------------------------------------------

    if (
      typeof body.requesterId !== "number" ||
      !Number.isInteger(body.requesterId) ||
      body.requesterId <= 0
    ) {
      return validationError(res, "A valid Requester is required.", {
        requesterId: "Requester is required.",
      });
    }

    if (
      typeof body.categoryId !== "number" ||
      !Number.isInteger(body.categoryId) ||
      body.categoryId <= 0
    ) {
      return validationError(res, "A valid Category is required.", {
        categoryId: "Category is required.",
      });
    }

    if (
      typeof body.relatedSystemId !== "number" ||
      !Number.isInteger(body.relatedSystemId) ||
      body.relatedSystemId <= 0
    ) {
      return validationError(
        res,
        "A valid Related System is required.",
        {
          relatedSystemId: "Related System is required.",
        }
      );
    }

    // --------------------------------------------------------
    // Validate Summary
    // --------------------------------------------------------

    if (typeof body.summary !== "string") {
      return validationError(res, "Ticket Summary is required.", {
        summary: "Ticket Summary is required.",
      });
    }

    const summary = body.summary.trim();

    if (summary.length < 5) {
      return validationError(
        res,
        "Ticket Summary must contain at least 5 characters.",
        {
          summary: "Ticket Summary must contain at least 5 characters.",
        }
      );
    }

    if (summary.length > 150) {
      return validationError(
        res,
        "Ticket Summary must not exceed 150 characters.",
        {
          summary: "Ticket Summary must not exceed 150 characters.",
        }
      );
    }

    // --------------------------------------------------------
    // Validate Description
    // --------------------------------------------------------

    if (typeof body.description !== "string") {
      return validationError(res, "Description is required.", {
        description: "Description is required.",
      });
    }

    const description = body.description.trim();

    if (description.length < 10) {
      return validationError(
        res,
        "Description must contain at least 10 characters.",
        {
          description: "Description must contain at least 10 characters.",
        }
      );
    }

    if (description.length > 5000) {
      return validationError(
        res,
        "Description must not exceed 5000 characters.",
        {
          description: "Description must not exceed 5000 characters.",
        }
      );
    }

    // --------------------------------------------------------
    // Validate Requested Priority
    // --------------------------------------------------------

    if (
      typeof body.requestedPriority !== "string" ||
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
      body.requestedPriority as AllowedPriority;

    // --------------------------------------------------------
    // Prevent duplicate submission
    // --------------------------------------------------------

    const duplicateTicket = await prisma.ticket.findUnique({
      where: {
        clientSubmissionId,
      },
      select: {
        id: true,
        ticketNumber: true,
      },
    });

    if (duplicateTicket) {
      return res.status(409).json({
        error: {
          code: "DUPLICATE_SUBMISSION",
          message:
            "This Ticket submission has already been processed.",
        },
      });
    }

    // --------------------------------------------------------
    // Validate Requester and reference data
    // --------------------------------------------------------

    const [requester, category, relatedSystem] = await Promise.all([
      prisma.requesterUser.findFirst({
        where: {
          id: body.requesterId,
          isActive: true,
        },
        select: {
          id: true,
        },
      }),

      prisma.category.findFirst({
        where: {
          id: body.categoryId,
          isActive: true,
        },
        select: {
          id: true,
        },
      }),

      prisma.relatedSystem.findFirst({
        where: {
          id: body.relatedSystemId,
          isActive: true,
        },
        select: {
          id: true,
        },
      }),
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
          categoryId: "The selected Category is unavailable.",
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

    // --------------------------------------------------------
    // Generate official Ticket Number
    // --------------------------------------------------------

    const ticketNumber = await generateTicketNumber();

    // --------------------------------------------------------
    // Create Ticket
    // --------------------------------------------------------

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        clientSubmissionId,
        requesterId: body.requesterId,
        categoryId: body.categoryId,
        relatedSystemId: body.relatedSystemId,
        summary,
        requestedPriority,
        description,
        currentStatus: "NEW",
      },
      select: {
        id: true,
        ticketNumber: true,
        clientSubmissionId: true,
        requesterId: true,
        categoryId: true,
        relatedSystemId: true,
        summary: true,
        requestedPriority: true,
        description: true,
        currentStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(201).json({
      ticket,
    });
  } catch (error) {
    console.error("Failed to create Ticket:", error);

    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message:
          "The Ticket could not be created. Please try again.",
      },
    });
  }
});

export { app };
export default app;
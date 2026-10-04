import {
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
} from "./auth.js";

import { getPrisma } from "./prisma.js";

const prisma = getPrisma();

// Lab 4 dashboards (Issues #59 and #60). Mounted at /api/dashboard.
// Every value is calculated from the database per request (BR-24).
export const dashboardRouter = Router();

export const DASHBOARD_TIME_ZONE = "Asia/Bangkok";
export const RECENT_DAYS = 7;
export const LIST_LIMIT = 5;

// BR-26
export const ACTIVE_STATUSES: readonly TicketStatus[] = [
  TicketStatus.NEW,
  TicketStatus.OPEN,
  TicketStatus.IN_PROGRESS,
  TicketStatus.WAITING_FOR_REQUESTER,
  TicketStatus.REOPENED,
];

export function recentSince(now: Date): Date {
  return new Date(now.getTime() - RECENT_DAYS * 24 * 60 * 60 * 1000);
}

const ticketSummarySelect = {
  id: true,
  ticketNumber: true,
  summary: true,
  currentStatus: true,
  updatedAt: true,
} satisfies Prisma.TicketSelect;

function errorResponse(
  res: Response,
  status: number,
  code: string,
  message: string
) {
  return res.status(status).json({ error: { code, message } });
}

function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser || !roles.includes(req.authUser.role)) {
      return errorResponse(
        res,
        403,
        "FORBIDDEN",
        "You do not have permission to view this dashboard."
      );
    }

    return next();
  };
}

dashboardRouter.use(requireAuth, requireCompletedPasswordChange);

function countFor(
  groups: { currentStatus: TicketStatus; _count: { _all: number } }[],
  statuses: readonly TicketStatus[]
): number {
  return groups
    .filter((group) => statuses.includes(group.currentStatus))
    .reduce((total, group) => total + group._count._all, 0);
}

/**
 * GET /api/dashboard/requester
 *
 * Only the signed-in Requester's Tickets (BR-27, AC-02).
 */
dashboardRouter.get(
  "/requester",
  requireRole(UserRole.REQUESTER),
  async (req, res) => {
    const requesterId = req.authUser!.id;
    const now = new Date();

    try {
      const [groups, recentlyUpdated, recentlyResolved] =
        await prisma.$transaction([
          prisma.ticket.groupBy({
            by: ["currentStatus"],
            where: { requesterId },
            orderBy: { currentStatus: "asc" },
            _count: { _all: true },
          }),
          prisma.ticket.findMany({
            where: { requesterId, updatedAt: { gte: recentSince(now) } },
            orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
            take: LIST_LIMIT,
            select: ticketSummarySelect,
          }),
          prisma.ticket.findMany({
            where: { requesterId, currentStatus: TicketStatus.RESOLVED },
            orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
            take: LIST_LIMIT,
            select: ticketSummarySelect,
          }),
        ]);

      const counts = groups as unknown as {
        currentStatus: TicketStatus;
        _count: { _all: number };
      }[];

      const metric = (
        key: string,
        label: string,
        statuses: readonly TicketStatus[]
      ) => ({
        key,
        label,
        count: countFor(counts, statuses),
        drillDown: {
          screen: "my-tickets",
          query: { status: statuses.join(",") },
        },
      });

      return res.status(200).json({
        generatedAt: now.toISOString(),
        timeZone: DASHBOARD_TIME_ZONE,
        metrics: [
          metric("openTickets", "My Open Tickets", ACTIVE_STATUSES),
          metric("waitingForMe", "Waiting for Me", [
            TicketStatus.WAITING_FOR_REQUESTER,
          ]),
          metric("resolved", "Resolved", [TicketStatus.RESOLVED]),
          metric("closed", "Closed", [TicketStatus.CLOSED]),
        ],
        recentlyUpdated,
        recentlyResolved,
      });
    } catch (error) {
      console.error("Failed to load the Requester dashboard:", error);

      return errorResponse(
        res,
        500,
        "INTERNAL_ERROR",
        "The dashboard could not be loaded."
      );
    }
  }
);

const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
const ALL_STATUSES = Object.values(TicketStatus);
const ACTIVE_FILTER = ACTIVE_STATUSES.join(",");

/**
 * GET /api/dashboard/staff
 *
 * IT Staff and Administrators (BR-28). Administrators also receive
 * active user counts by role (BR-29).
 */
dashboardRouter.get(
  "/staff",
  requireRole(UserRole.IT_STAFF, UserRole.ADMINISTRATOR),
  async (req, res) => {
    const user = req.authUser!;
    const now = new Date();
    const active = { currentStatus: { in: [...ACTIVE_STATUSES] } };

    try {
      const [
        unassigned,
        myAssigned,
        myActionsLast7Days,
        statusGroups,
        priorityGroups,
        urgent,
        recentlyUpdated,
      ] = await prisma.$transaction([
        prisma.ticket.count({ where: { ...active, ownerId: null } }),
        prisma.ticket.count({ where: { ...active, ownerId: user.id } }),
        prisma.actionTaken.count({
          where: { performedById: user.id, actionAt: { gte: recentSince(now), lte: now } },
        }),
        prisma.ticket.groupBy({
          by: ["currentStatus"],
          orderBy: { currentStatus: "asc" },
          _count: { _all: true },
        }),
        prisma.ticket.groupBy({
          by: ["itPriority"],
          where: active,
          orderBy: { itPriority: "asc" },
          _count: { _all: true },
        }),
        prisma.ticket.findMany({
          where: { ...active, itPriority: "HIGH" },
          orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
          take: LIST_LIMIT,
          select: {
            ...ticketSummarySelect,
            itPriority: true,
            owner: { select: { id: true, name: true } },
          },
        }),
        prisma.ticket.findMany({
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: LIST_LIMIT,
          select: {
            ...ticketSummarySelect,
            itPriority: true,
            owner: { select: { id: true, name: true } },
          },
        }),
      ]);

      const statusCounts = statusGroups as unknown as {
        currentStatus: TicketStatus;
        _count: { _all: number };
      }[];
      const priorityCounts = priorityGroups as unknown as {
        itPriority: string;
        _count: { _all: number };
      }[];

      let usersByRole: Record<UserRole, number> | null = null;

      if (user.role === UserRole.ADMINISTRATOR) {
        const roleGroups = await prisma.user.groupBy({
          by: ["role"],
          where: { isActive: true },
          orderBy: { role: "asc" },
          _count: { _all: true },
        });

        usersByRole = { REQUESTER: 0, IT_STAFF: 0, ADMINISTRATOR: 0 };

        for (const group of roleGroups as unknown as {
          role: UserRole;
          _count: { _all: number };
        }[]) {
          usersByRole[group.role] = group._count._all;
        }
      }

      return res.status(200).json({
        generatedAt: now.toISOString(),
        timeZone: DASHBOARD_TIME_ZONE,
        metrics: [
          {
            key: "unassigned",
            label: "Unassigned",
            count: unassigned,
            drillDown: {
              screen: "staff-queue",
              query: { assignment: "unassigned", status: ACTIVE_FILTER },
            },
          },
          {
            key: "myAssigned",
            label: "My Assigned",
            count: myAssigned,
            drillDown: {
              screen: "staff-queue",
              query: { assignment: "mine", status: ACTIVE_FILTER },
            },
          },
          {
            key: "myActionsLast7Days",
            label: "My Actions (7 days)",
            count: myActionsLast7Days,
            drillDown: null,
          },
        ],
        byStatus: ALL_STATUSES.map((status) => ({
          status,
          count:
            statusCounts.find((group) => group.currentStatus === status)?._count._all ?? 0,
          drillDown: { screen: "staff-queue", query: { status } },
        })),
        byItPriority: PRIORITIES.map((itPriority) => ({
          itPriority,
          count:
            priorityCounts.find((group) => group.itPriority === itPriority)?._count._all ?? 0,
          drillDown: {
            screen: "staff-queue",
            query: { itPriority, status: ACTIVE_FILTER },
          },
        })),
        urgent,
        recentlyUpdated,
        usersByRole,
      });
    } catch (error) {
      console.error("Failed to load the staff dashboard:", error);

      return errorResponse(
        res,
        500,
        "INTERNAL_ERROR",
        "The dashboard could not be loaded."
      );
    }
  }
);

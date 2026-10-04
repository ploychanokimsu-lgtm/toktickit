import {
  ActionTakenStatus,
  Prisma,
  TicketStatus,
} from "@prisma/client";

// Lab 4 Ticket workflow rules (Issue #58, specification BR-19 to BR-23).

/**
 * Final transition matrix (BR-19). Matches the transitions implemented
 * in Lab 3, including reopening Closed and Cancelled Tickets (D-04).
 */
export const STATUS_TRANSITIONS: Record<
  TicketStatus,
  readonly TicketStatus[]
> = {
  NEW: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED],
  OPEN: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.WAITING_FOR_REQUESTER,
    TicketStatus.RESOLVED,
    TicketStatus.CANCELLED,
  ],
  IN_PROGRESS: [
    TicketStatus.WAITING_FOR_REQUESTER,
    TicketStatus.RESOLVED,
    TicketStatus.CANCELLED,
  ],
  WAITING_FOR_REQUESTER: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.RESOLVED,
    TicketStatus.CANCELLED,
  ],
  RESOLVED: [TicketStatus.REOPENED, TicketStatus.CLOSED],
  CLOSED: [TicketStatus.REOPENED],
  REOPENED: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.WAITING_FOR_REQUESTER,
    TicketStatus.RESOLVED,
    TicketStatus.CANCELLED,
  ],
  CANCELLED: [TicketStatus.REOPENED],
};

export type ResolutionGateCode =
  | "NO_OWNER"
  | "NO_ACTIONS_TAKEN"
  | "LATEST_ACTION_NEEDS_FOLLOW_UP"
  | "PLANNED_ACTIONS_REMAIN";

export interface ResolutionGateInput {
  ownerId: number | null;
  // Ordered by actionAt, then id (BR-15).
  actions: ReadonlyArray<{
    status: ActionTakenStatus;
    followUpRequired: boolean;
  }>;
}

/**
 * Returns the unmet resolution-gate conditions (BR-20). An empty list
 * means the Ticket may move to RESOLVED.
 */
export function resolutionGateUnmet(
  input: ResolutionGateInput
): ResolutionGateCode[] {
  const unmet: ResolutionGateCode[] = [];

  if (input.ownerId === null) {
    unmet.push("NO_OWNER");
  }

  const completed = input.actions.filter(
    (action) => action.status === ActionTakenStatus.COMPLETED
  );

  if (completed.length === 0) {
    unmet.push("NO_ACTIONS_TAKEN");
  } else if (completed[completed.length - 1].followUpRequired) {
    unmet.push("LATEST_ACTION_NEEDS_FOLLOW_UP");
  }

  if (
    input.actions.some(
      (action) => action.status === ActionTakenStatus.PLANNED
    )
  ) {
    unmet.push("PLANNED_ACTIONS_REMAIN");
  }

  return unmet;
}

/**
 * Loads the data the gate needs. Pass a transaction client so the check
 * and the status update see the same state.
 */
export async function loadResolutionGateInput(
  db: Prisma.TransactionClient,
  ticketId: number,
  ownerId: number | null
): Promise<ResolutionGateInput> {
  const actions = await db.actionTaken.findMany({
    where: { ticketId },
    orderBy: [{ actionAt: "asc" }, { id: "asc" }],
    select: { status: true, followUpRequired: true },
  });

  return { ownerId, actions };
}

import type {
  ActionTakenStatus,
  PrismaClient,
  RequestedPriority,
  TicketStatus,
} from "@prisma/client";

// Lab 4 demonstration data (Issue #56).
//
// Idempotent: Tickets are keyed by clientSubmissionId and Actions Taken by
// (ticketId, clientRequestId). Existing rows are never modified, so running
// the seed again does not create duplicates or overwrite demo changes.
//
// Coverage (specification §8.4):
// - every Ticket status, every IT Priority, assigned and unassigned Tickets
// - Tickets with zero, one and multiple Actions Taken
// - an action performed by a staff member who is not the Ticket Owner
// - a latest action that needs follow-up (resolution gate blocked)
// - planned, completed and cancelled actions
// - a Requester with no Tickets (Ploy Srisuk) for zero dashboard metrics

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

type SeedAction = {
  key: string;
  performedBy: string;
  assignee?: string;
  status: ActionTakenStatus;
  // Hours after the Ticket was created; negative = hours from now (planned).
  atHours: number;
  description: string;
  result?: string;
  followUpNote?: string;
  attachmentNotes?: string;
};

type SeedTicket = {
  key: string;
  number: string;
  requester: string;
  owner?: string;
  category: string;
  relatedSystem: string;
  summary: string;
  description: string;
  priority: RequestedPriority;
  status: TicketStatus;
  createdDaysAgo: number;
  updatedDaysAgo: number;
  requesterIndicatedResolved?: boolean;
  actions: SeedAction[];
};

const tickets: SeedTicket[] = [
  {
    key: "lab4-seed-01",
    number: "TKT-2026-900001",
    requester: "jennifer.anderson@example.com",
    category: "Hardware",
    relatedSystem: "Corporate Laptop",
    summary: "Laptop does not power on",
    description: "My laptop shows no lights when I press the power button.",
    priority: "HIGH",
    status: "NEW",
    createdDaysAgo: 1,
    updatedDaysAgo: 1,
    actions: [],
  },
  {
    key: "lab4-seed-02",
    number: "TKT-2026-900002",
    requester: "jennifer.anderson@example.com",
    owner: "daniel.wilson@example.com",
    category: "Account and Access",
    relatedSystem: "Email",
    summary: "Cannot access shared mailbox",
    description: "The finance shared mailbox disappeared from Outlook.",
    priority: "MEDIUM",
    status: "OPEN",
    createdDaysAgo: 3,
    updatedDaysAgo: 2,
    actions: [],
  },
  {
    key: "lab4-seed-03",
    number: "TKT-2026-900003",
    requester: "michael.brown@example.com",
    owner: "daniel.wilson@example.com",
    category: "Network",
    relatedSystem: "VPN",
    summary: "VPN disconnects every few minutes",
    description: "The VPN drops while working from home, usually after 5 minutes.",
    priority: "HIGH",
    status: "IN_PROGRESS",
    createdDaysAgo: 4,
    updatedDaysAgo: 0,
    actions: [
      {
        key: "seed-a-03-1",
        performedBy: "daniel.wilson@example.com",
        status: "COMPLETED",
        atHours: 3,
        description: "Reinstalled the VPN client and reset the network adapter.",
        result: "Connection stable for 30 minutes during the remote session.",
      },
    ],
  },
  {
    key: "lab4-seed-04",
    number: "TKT-2026-900004",
    requester: "narin.chaiyasit@example.com",
    owner: "sarah.johnson@example.com",
    category: "Software",
    relatedSystem: "Grade Submission App",
    summary: "Grade Submission App crashes on upload",
    description: "The app closes when I upload the final grade spreadsheet.",
    priority: "MEDIUM",
    status: "IN_PROGRESS",
    createdDaysAgo: 6,
    updatedDaysAgo: 0,
    actions: [
      {
        key: "seed-a-04-1",
        performedBy: "sarah.johnson@example.com",
        status: "COMPLETED",
        atHours: 2,
        description: "Reproduced the crash with the Requester's spreadsheet.",
        result: "Crash occurs only for files larger than 10 MB.",
        followUpNote: "Ask the application team about the upload size limit.",
        attachmentNotes: "See crash-log.pdf in Ticket Attachments.",
      },
      {
        key: "seed-a-04-2",
        // Different staff member from the Ticket Owner (BR-02).
        performedBy: "kevin.patel@example.com",
        status: "COMPLETED",
        atHours: 26,
        description: "Raised the upload limit on the application server to 25 MB.",
        result: "Large spreadsheet uploads successfully in the test account.",
      },
      {
        key: "seed-a-04-3",
        performedBy: "sarah.johnson@example.com",
        assignee: "kevin.patel@example.com",
        status: "PLANNED",
        atHours: -48,
        description: "Confirm the upload with the Requester's real account.",
      },
    ],
  },
  {
    key: "lab4-seed-05",
    number: "TKT-2026-900005",
    requester: "jennifer.anderson@example.com",
    owner: "kevin.patel@example.com",
    category: "Hardware",
    relatedSystem: "Printer",
    summary: "Printer prints blank pages",
    description: "The 3rd floor printer feeds paper but nothing is printed.",
    priority: "LOW",
    status: "WAITING_FOR_REQUESTER",
    createdDaysAgo: 5,
    updatedDaysAgo: 1,
    requesterIndicatedResolved: true,
    actions: [
      {
        key: "seed-a-05-1",
        performedBy: "kevin.patel@example.com",
        status: "COMPLETED",
        atHours: 20,
        description: "Replaced the toner cartridge and ran a test page.",
        result: "Test page printed correctly.",
        // Latest action needs follow-up, so resolution is blocked.
        followUpNote: "Confirm with the Requester after a full day of printing.",
      },
    ],
  },
  {
    key: "lab4-seed-06",
    number: "TKT-2026-900006",
    requester: "jennifer.anderson@example.com",
    owner: "daniel.wilson@example.com",
    category: "Software",
    relatedSystem: "LEB2 App",
    summary: "LEB2 app shows wrong timetable",
    description: "My timetable shows last semester's classes.",
    priority: "MEDIUM",
    status: "RESOLVED",
    createdDaysAgo: 8,
    updatedDaysAgo: 2,
    actions: [
      {
        key: "seed-a-06-1",
        performedBy: "daniel.wilson@example.com",
        status: "COMPLETED",
        atHours: 4,
        description: "Cleared the app cache and signed in again.",
        result: "Timetable still outdated.",
      },
      {
        key: "seed-a-06-2",
        performedBy: "daniel.wilson@example.com",
        status: "COMPLETED",
        atHours: 30,
        description: "Re-synchronised the Requester's enrolment from the registry.",
        result: "Current semester timetable is displayed.",
      },
    ],
  },
  {
    key: "lab4-seed-07",
    number: "TKT-2026-900007",
    requester: "michael.brown@example.com",
    owner: "sarah.johnson@example.com",
    category: "Account and Access",
    relatedSystem: "Email",
    summary: "Password reset request",
    description: "I am locked out of my email account.",
    priority: "LOW",
    status: "CLOSED",
    createdDaysAgo: 20,
    updatedDaysAgo: 15,
    actions: [
      {
        key: "seed-a-07-1",
        performedBy: "sarah.johnson@example.com",
        status: "COMPLETED",
        atHours: 1,
        description: "Verified identity and reset the email password.",
        result: "Requester signed in successfully.",
      },
    ],
  },
  {
    key: "lab4-seed-08",
    number: "TKT-2026-900008",
    requester: "michael.brown@example.com",
    owner: "kevin.patel@example.com",
    category: "Network",
    relatedSystem: "Campus Wi-Fi",
    summary: "Campus Wi-Fi drops in Building 4",
    description: "Wi-Fi disconnects in room 4-201 during lectures.",
    priority: "HIGH",
    status: "REOPENED",
    createdDaysAgo: 12,
    updatedDaysAgo: 0,
    actions: [
      {
        key: "seed-a-08-1",
        performedBy: "kevin.patel@example.com",
        status: "COMPLETED",
        atHours: 6,
        description: "Restarted the access point in room 4-201.",
        result: "Signal restored.",
      },
      {
        key: "seed-a-08-2",
        performedBy: "daniel.wilson@example.com",
        status: "COMPLETED",
        atHours: 200,
        description: "Problem returned; checked access point logs.",
        result: "Access point overheating; replacement needed.",
        followUpNote: "Replace the access point when the new unit arrives.",
      },
    ],
  },
  {
    key: "lab4-seed-09",
    number: "TKT-2026-900009",
    requester: "narin.chaiyasit@example.com",
    category: "Software",
    relatedSystem: "Corporate Laptop",
    summary: "Request to install statistics software",
    description: "Please install the statistics package on my laptop.",
    priority: "LOW",
    status: "CANCELLED",
    createdDaysAgo: 10,
    updatedDaysAgo: 9,
    actions: [
      {
        key: "seed-a-09-1",
        performedBy: "sarah.johnson@example.com",
        assignee: "sarah.johnson@example.com",
        status: "CANCELLED",
        atHours: 5,
        description: "Planned remote installation of the statistics package.",
        result: "Requester no longer needs the software.",
      },
    ],
  },
  {
    key: "lab4-seed-10",
    number: "TKT-2026-900010",
    requester: "michael.brown@example.com",
    category: "Account and Access",
    relatedSystem: "Grade Submission App",
    summary: "Need access to Grade Submission App",
    description: "I am a new teaching assistant and need upload access.",
    priority: "MEDIUM",
    status: "NEW",
    createdDaysAgo: 0,
    updatedDaysAgo: 0,
    actions: [],
  },
  {
    key: "lab4-seed-11",
    number: "TKT-2026-900011",
    requester: "narin.chaiyasit@example.com",
    category: "Network",
    relatedSystem: "Campus Wi-Fi",
    summary: "No network in the exam hall",
    description: "Exam hall computers have no network before tomorrow's exam.",
    priority: "HIGH",
    status: "OPEN",
    createdDaysAgo: 2,
    updatedDaysAgo: 2,
    actions: [],
  },
  {
    key: "lab4-seed-12",
    number: "TKT-2026-900012",
    requester: "michael.brown@example.com",
    owner: "kevin.patel@example.com",
    category: "Hardware",
    relatedSystem: "Corporate Laptop",
    summary: "Laptop battery drains quickly",
    description: "The battery lasts less than an hour.",
    priority: "HIGH",
    status: "RESOLVED",
    createdDaysAgo: 7,
    updatedDaysAgo: 1,
    actions: [
      {
        key: "seed-a-12-1",
        performedBy: "kevin.patel@example.com",
        status: "COMPLETED",
        atHours: 24,
        description: "Replaced the laptop battery.",
        result: "Battery holds charge for 6 hours.",
      },
    ],
  },
];

export async function seedLab4(prisma: PrismaClient): Promise<void> {
  const now = Date.now();

  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  const userId = (email: string) => {
    const user = users.find((candidate) => candidate.email === email);
    if (!user) throw new Error(`Lab 4 seed: missing user ${email}.`);
    return user.id;
  };

  const categories = await prisma.category.findMany({ select: { id: true, name: true } });
  const systems = await prisma.relatedSystem.findMany({ select: { id: true, name: true } });
  const referenceId = (rows: { id: number; name: string }[], name: string) => {
    const row = rows.find((candidate) => candidate.name === name);
    if (!row) throw new Error(`Lab 4 seed: missing reference data ${name}.`);
    return row.id;
  };

  let createdTickets = 0;
  let createdActions = 0;

  for (const seed of tickets) {
    const createdAt = new Date(now - seed.createdDaysAgo * DAY - 2 * HOUR);
    const updatedAt = new Date(now - seed.updatedDaysAgo * DAY - HOUR);

    let ticket = await prisma.ticket.findUnique({
      where: { clientSubmissionId: seed.key },
      select: { id: true, createdAt: true },
    });

    if (!ticket) {
      ticket = await prisma.ticket.create({
        data: {
          ticketNumber: seed.number,
          clientSubmissionId: seed.key,
          requesterId: userId(seed.requester),
          ownerId: seed.owner ? userId(seed.owner) : null,
          categoryId: referenceId(categories, seed.category),
          relatedSystemId: referenceId(systems, seed.relatedSystem),
          summary: seed.summary,
          description: seed.description,
          requestedPriority: seed.priority,
          itPriority: seed.priority,
          currentStatus: seed.status,
          requesterResolutionIndicatedAt: seed.requesterIndicatedResolved
            ? updatedAt
            : null,
          createdAt,
          updatedAt,
        },
        select: { id: true, createdAt: true },
      });
      createdTickets += 1;
    }

    for (const action of seed.actions) {
      const exists = await prisma.actionTaken.findUnique({
        where: {
          ticketId_clientRequestId: {
            ticketId: ticket.id,
            clientRequestId: action.key,
          },
        },
        select: { id: true },
      });

      if (exists) continue;

      const actionAt =
        action.atHours >= 0
          ? new Date(ticket.createdAt.getTime() + action.atHours * HOUR)
          : new Date(now - action.atHours * HOUR);

      await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: userId(action.performedBy),
          assigneeId: userId(action.assignee ?? action.performedBy),
          status: action.status,
          actionAt,
          completedAt: action.status === "COMPLETED" ? actionAt : null,
          description: action.description,
          result: action.result ?? null,
          followUpRequired: Boolean(action.followUpNote),
          followUpNote: action.followUpNote ?? null,
          attachmentNotes: action.attachmentNotes ?? null,
          clientRequestId: action.key,
          createdAt: actionAt.getTime() < now ? actionAt : new Date(now),
        },
      });
      createdActions += 1;
    }
  }

  console.log(
    `Lab 4 seed: ${createdTickets} Tickets and ${createdActions} Actions Taken created (existing rows kept).`
  );
}

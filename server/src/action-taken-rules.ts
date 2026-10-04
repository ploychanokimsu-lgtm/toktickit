import { ActionTakenStatus } from "@prisma/client";

// Lab 4 Action Taken validation rules (specification BR-06 to BR-09, D-01).
// Pure functions so they can be unit-tested without a database.

export const DESCRIPTION_MAX = 2000;
export const RESULT_MAX = 2000;
export const FOLLOW_UP_NOTE_MAX = 1000;
export const ATTACHMENT_NOTES_MAX = 500;

// Allowance for client/server clock differences on completed work.
export const CLOCK_SKEW_MS = 5 * 60 * 1000;
// Planned work may be scheduled up to one year ahead.
export const PLANNED_HORIZON_MS = 365 * 24 * 60 * 60 * 1000;

const CLIENT_REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;

export const CREATE_FIELDS = [
  "actionAt",
  "description",
  "result",
  "followUpRequired",
  "followUpNote",
  "attachmentNotes",
  "status",
  "assigneeId",
  "clientRequestId",
] as const;

export const EDIT_FIELDS = [
  "version",
  "actionAt",
  "description",
  "result",
  "followUpRequired",
  "followUpNote",
  "attachmentNotes",
  "status",
  "assigneeId",
] as const;

export type FieldErrors = Record<string, string>;

export interface ActionTakenValues {
  actionAt: Date;
  description: string;
  result: string | null;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  status: ActionTakenStatus;
  assigneeId: number | null;
}

export type ActionTakenInput = {
  [K in keyof ActionTakenValues]?: unknown;
};

/**
 * Returns the body as a plain object when every key is permitted,
 * otherwise records each unknown key as a field error.
 */
export function readBody(
  value: unknown,
  allowed: readonly string[],
  errors: FieldErrors
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.body = "The request body must be a JSON object.";
    return null;
  }

  const body = value as Record<string, unknown>;

  for (const key of Object.keys(body)) {
    if (!allowed.includes(key)) {
      errors[key] = "This field cannot be set.";
    }
  }

  return body;
}

function trimmedText(
  value: unknown,
  field: string,
  label: string,
  max: number,
  required: boolean,
  errors: FieldErrors
): string | null {
  if (value === undefined || value === null) {
    if (required) {
      errors[field] = `${label} is required.`;
    }
    return null;
  }

  if (typeof value !== "string") {
    errors[field] = `${label} must be text.`;
    return null;
  }

  const text = value.trim();

  if (text.length === 0) {
    if (required) {
      errors[field] = `${label} is required.`;
    }
    return null;
  }

  if (text.length > max) {
    errors[field] = `${label} must be ${max} characters or fewer.`;
    return null;
  }

  return text;
}

export function readActionAt(
  value: unknown,
  errors: FieldErrors
): Date | null {
  if (typeof value !== "string" || value.trim() === "") {
    errors.actionAt = "Action Date/Time is required.";
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    errors.actionAt = "Action Date/Time must be a valid date and time.";
    return null;
  }

  return date;
}

export function readAssigneeId(
  value: unknown,
  errors: FieldErrors
): number | null {
  if (value === null) {
    return null;
  }

  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1
  ) {
    errors.assigneeId = "Assignee must be a valid user.";
    return null;
  }

  return value;
}

export function readStatus(
  value: unknown,
  errors: FieldErrors
): ActionTakenStatus | null {
  if (
    typeof value !== "string" ||
    !Object.values(ActionTakenStatus).includes(
      value as ActionTakenStatus
    )
  ) {
    errors.status = "Status must be PLANNED, COMPLETED or CANCELLED.";
    return null;
  }

  return value as ActionTakenStatus;
}

export function readClientRequestId(
  value: unknown,
  errors: FieldErrors
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string" || !CLIENT_REQUEST_ID.test(value)) {
    errors.clientRequestId =
      "Client request ID must be 8-64 letters, numbers, dashes or underscores.";
    return null;
  }

  return value;
}

export function readVersion(
  value: unknown,
  errors: FieldErrors
): number | null {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1
  ) {
    errors.version = "Version is required.";
    return null;
  }

  return value;
}

/**
 * Validates a complete set of Action Taken values. For create, `input` is
 * the request body. For edit, it is the stored values overlaid with the
 * request body, so cross-field rules are checked against the final state.
 */
export function validateActionTaken(
  input: ActionTakenInput,
  context: {
    ticketCreatedAt: Date;
    now: Date;
  },
  errors: FieldErrors
): ActionTakenValues | null {
  const status =
    input.status === undefined
      ? ActionTakenStatus.COMPLETED
      : readStatus(input.status, errors);

  const actionAt =
    input.actionAt instanceof Date
      ? input.actionAt
      : readActionAt(input.actionAt, errors);

  const description = trimmedText(
    input.description,
    "description",
    "Action Description",
    DESCRIPTION_MAX,
    true,
    errors
  );

  // Result is required once work is completed; planned work has no result yet.
  const result = trimmedText(
    input.result,
    "result",
    "Result",
    RESULT_MAX,
    status === ActionTakenStatus.COMPLETED,
    errors
  );

  let followUpRequired = false;

  if (typeof input.followUpRequired === "boolean") {
    followUpRequired = input.followUpRequired;
  } else {
    errors.followUpRequired = "Follow-Up Required must be yes or no.";
  }

  let followUpNote: string | null = null;

  if (followUpRequired) {
    followUpNote = trimmedText(
      input.followUpNote,
      "followUpNote",
      "Follow-up Note",
      FOLLOW_UP_NOTE_MAX,
      true,
      errors
    );
  } else if (
    input.followUpNote !== undefined &&
    input.followUpNote !== null &&
    typeof input.followUpNote !== "string"
  ) {
    errors.followUpNote = "Follow-up Note must be text.";
  }

  const attachmentNotes = trimmedText(
    input.attachmentNotes,
    "attachmentNotes",
    "Attachment Notes",
    ATTACHMENT_NOTES_MAX,
    false,
    errors
  );

  const assigneeId =
    input.assigneeId === undefined
      ? null
      : readAssigneeId(input.assigneeId, errors);

  if (actionAt && !errors.actionAt) {
    const latestAllowed =
      status === ActionTakenStatus.PLANNED
        ? context.now.getTime() + PLANNED_HORIZON_MS
        : context.now.getTime() + CLOCK_SKEW_MS;

    if (actionAt.getTime() < context.ticketCreatedAt.getTime()) {
      errors.actionAt =
        "Action Date/Time cannot be earlier than the Ticket was created.";
    } else if (actionAt.getTime() > latestAllowed) {
      errors.actionAt =
        status === ActionTakenStatus.PLANNED
          ? "Planned Action Date/Time must be within one year."
          : "Action Date/Time cannot be in the future for completed work.";
    }
  }

  if (Object.keys(errors).length > 0 || !status || !actionAt || !description) {
    return null;
  }

  return {
    actionAt,
    description,
    result,
    followUpRequired,
    followUpNote,
    attachmentNotes,
    status,
    assigneeId,
  };
}

const STATUS_TRANSITIONS: Record<
  ActionTakenStatus,
  readonly ActionTakenStatus[]
> = {
  PLANNED: [ActionTakenStatus.COMPLETED, ActionTakenStatus.CANCELLED],
  COMPLETED: [],
  CANCELLED: [],
};

export function isActionStatusTransitionAllowed(
  from: ActionTakenStatus,
  to: ActionTakenStatus
): boolean {
  return from === to || STATUS_TRANSITIONS[from].includes(to);
}

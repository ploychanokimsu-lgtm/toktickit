import { describe, expect, it } from "vitest";

import {
  isActionStatusTransitionAllowed,
  readBody,
  validateActionTaken,
  type ActionTakenInput,
  type FieldErrors,
  CREATE_FIELDS,
} from "../../src/action-taken-rules.js";

const now = new Date("2026-10-05T03:00:00.000Z");
const ticketCreatedAt = new Date("2026-10-01T00:00:00.000Z");

function validInput(overrides: ActionTakenInput = {}): ActionTakenInput {
  return {
    actionAt: "2026-10-05T02:00:00.000Z",
    description: "Replaced the battery.",
    result: "Battery holds charge.",
    followUpRequired: false,
    ...overrides,
  };
}

function validate(input: ActionTakenInput) {
  const errors: FieldErrors = {};
  const values = validateActionTaken(input, { ticketCreatedAt, now }, errors);
  return { values, errors };
}

describe("Lab 4 Action Taken validation rules", () => {
  it("UNIT-01: requires a Follow-up Note when follow-up is required", () => {
    const { values, errors } = validate(
      validInput({ followUpRequired: true, followUpNote: "   " })
    );

    expect(values).toBeNull();
    expect(errors.followUpNote).toMatch(/required/i);
  });

  it("UNIT-02: discards the Follow-up Note when follow-up is not required", () => {
    const { values } = validate(
      validInput({ followUpRequired: false, followUpNote: "Not needed" })
    );

    expect(values?.followUpNote).toBeNull();
  });

  it("UNIT-03: trims Description and Result and enforces 1-2000 characters", () => {
    expect(validate(validInput({ description: "  " })).errors.description).toBeDefined();
    expect(validate(validInput({ result: "" })).errors.result).toBeDefined();
    expect(
      validate(validInput({ description: "x".repeat(2001) })).errors.description
    ).toMatch(/2000/);

    const { values } = validate(
      validInput({ description: `  ${"x".repeat(2000)}  `, result: " Done " })
    );

    expect(values?.description).toHaveLength(2000);
    expect(values?.result).toBe("Done");
  });

  it("UNIT-04: rejects future completed work and dates before the Ticket", () => {
    expect(
      validate(validInput({ actionAt: "2026-10-05T03:10:00.000Z" })).errors.actionAt
    ).toMatch(/future/);
    expect(
      validate(validInput({ actionAt: "2026-09-30T23:59:00.000Z" })).errors.actionAt
    ).toMatch(/earlier/);
    expect(
      validate(validInput({ actionAt: "not a date" })).errors.actionAt
    ).toBeDefined();
    // Same minute as Ticket creation (minute-precision date/time inputs).
    expect(
      validateActionTaken(
        validInput({ actionAt: "2026-10-01T00:00:00.000Z" }),
        { ticketCreatedAt: new Date("2026-10-01T00:00:42.000Z"), now },
        {}
      )
    ).not.toBeNull();
    // Within the 5-minute clock-skew allowance.
    expect(
      validate(validInput({ actionAt: "2026-10-05T03:04:00.000Z" })).values
    ).not.toBeNull();
  });

  it("UNIT-05: Attachment Notes are optional, trimmed and at most 500 characters", () => {
    expect(validate(validInput({ attachmentNotes: "   " })).values?.attachmentNotes).toBeNull();
    expect(
      validate(validInput({ attachmentNotes: "x".repeat(501) })).errors.attachmentNotes
    ).toMatch(/500/);
  });

  it("allows planned work in the future without a Result", () => {
    const { values } = validate(
      validInput({
        status: "PLANNED",
        actionAt: "2026-10-08T03:00:00.000Z",
        result: undefined,
      })
    );

    expect(values?.status).toBe("PLANNED");
    expect(values?.result).toBeNull();
  });

  it("requires a Result once work is completed", () => {
    expect(
      validate(validInput({ status: "COMPLETED", result: null })).errors.result
    ).toMatch(/required/i);
  });

  it("defaults status to COMPLETED", () => {
    expect(validate(validInput()).values?.status).toBe("COMPLETED");
  });

  it("rejects unknown body fields such as performedById", () => {
    const errors: FieldErrors = {};
    readBody({ ...validInput(), performedById: 99 }, CREATE_FIELDS, errors);

    expect(errors.performedById).toBeDefined();
  });

  it("only lets Planned actions be completed or cancelled", () => {
    expect(isActionStatusTransitionAllowed("PLANNED", "COMPLETED")).toBe(true);
    expect(isActionStatusTransitionAllowed("PLANNED", "CANCELLED")).toBe(true);
    expect(isActionStatusTransitionAllowed("COMPLETED", "COMPLETED")).toBe(true);
    expect(isActionStatusTransitionAllowed("COMPLETED", "PLANNED")).toBe(false);
    expect(isActionStatusTransitionAllowed("COMPLETED", "CANCELLED")).toBe(false);
    expect(isActionStatusTransitionAllowed("CANCELLED", "PLANNED")).toBe(false);
  });
});

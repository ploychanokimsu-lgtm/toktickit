import { mkdir } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

import {
  accounts,
  createRequesterTicket,
  expectNoHorizontalOverflow,
  prepareAccount,
  signIn,
  viewports,
} from "./support.js";

// E2E-03 and E2E-04 (docs/lab-04/tests.md): the complete Ticket lifecycle
// through the resolution gate, and the cancel path.

const SCREENSHOTS = "artifacts/lab-04/screenshots/actions-taken";
const stamp = Date.now();

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await mkdir(SCREENSHOTS, { recursive: true });
  await prepareAccount(accounts.daniel);
  await prepareAccount(accounts.jennifer);
});

async function openStaffTicket(page: Page, ticketNumber: string) {
  await expect(page.getByRole("heading", { name: "IT Staff Ticket Queue" })).toBeVisible();

  const search = page.getByLabel("Search");
  await search.fill(ticketNumber);
  await search.press("Enter");

  const results = page.getByRole("region", { name: "Ticket Queue results" });
  await expect(results.getByText(ticketNumber).first()).toBeVisible();
  await results.getByRole("button", { name: "Open Ticket" }).first().click();

  await expect(page.getByRole("heading", { name: ticketNumber })).toBeVisible();
}

function statusSelect(page: Page) {
  return page.locator("#detail-status");
}

async function changeStatus(page: Page, status: string) {
  const select = statusSelect(page);
  await expect(select).toBeEnabled();
  await expect(select.locator(`option[value="${status}"]`)).toBeEnabled();

  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith("/status") && response.request().method() === "PATCH"
  );

  await select.selectOption(status);

  const dialog = page.getByRole("dialog");
  if (status === "CLOSED" || status === "CANCELLED") {
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /^Yes,/ }).click();
  }

  expect((await saved).status()).toBe(200);
  await expect(select).toHaveValue(status);
}

test("E2E-03: a Ticket is resolved only after the gate is met, then closed", async ({ page }) => {
  const ticketNumber = await createRequesterTicket(
    accounts.jennifer,
    `Printer jams on every page (E2E ${stamp})`
  );

  await page.setViewportSize(viewports.desktop);
  await signIn(page, accounts.daniel);
  await openStaffTicket(page, ticketNumber);

  await changeStatus(page, "IN_PROGRESS");

  // Resolved is offered but blocked, with the reasons explained.
  const resolved = statusSelect(page).locator('option[value="RESOLVED"]');
  await expect(resolved).toBeDisabled();

  const gate = page.locator("#workflow-gate");
  await expect(gate).toContainText("Assign a Ticket Owner.");
  await expect(gate).toContainText("Record at least one completed Action Taken.");
  await gate.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SCREENSHOTS}/resolve-blocked.png`, fullPage: true });

  await page.getByRole("button", { name: "Claim Ticket" }).click();
  await expect(gate).not.toContainText("Assign a Ticket Owner.");

  // Recording completed work satisfies the gate.
  await page.getByRole("button", { name: "Add Action" }).click();
  const form = page.getByRole("form", { name: "Add Action Taken" });
  await form.getByLabel(/Action Description/).fill(`Cleared the paper path ${stamp}`);
  await form.getByLabel(/^Result/).fill("Printed 20 test pages without a jam.");
  await form.getByRole("button", { name: "Save Action" }).click();
  await expect(page.getByText("Action recorded.")).toBeVisible();

  await expect(gate).toHaveCount(0);
  await expect(resolved).toBeEnabled();

  await changeStatus(page, "RESOLVED");
  await expect(page.getByTestId("ticket-status-badge")).toHaveText("Status: Resolved");

  await changeStatus(page, "CLOSED");
  await expect(page.getByTestId("ticket-status-badge")).toHaveText("Status: Closed");

  // Closed Tickets keep their Actions Taken read-only.
  await expect(page.getByRole("button", { name: "Add Action" })).toHaveCount(0);
  await expect(page.getByText(/Actions Taken are read-only/)).toBeVisible();
  await expect(statusSelect(page).locator("option")).toHaveText([
    "Closed (current)",
    "Reopened",
  ]);

  await page.setViewportSize(viewports.mobile);
  await expectNoHorizontalOverflow(page);
});

test("E2E-04: a Ticket can be cancelled after confirmation", async ({ page }) => {
  const ticketNumber = await createRequesterTicket(
    accounts.jennifer,
    `Duplicate request, please ignore (E2E ${stamp})`
  );

  await page.setViewportSize(viewports.desktop);
  await signIn(page, accounts.daniel);
  await openStaffTicket(page, ticketNumber);

  // Dismissing the dialog keeps the current status.
  await statusSelect(page).selectOption("CANCELLED");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(statusSelect(page)).toHaveValue("NEW");

  await changeStatus(page, "CANCELLED");

  await expect(page.getByRole("button", { name: "Add Action" })).toHaveCount(0);
  await expect(statusSelect(page).locator("option")).toHaveText([
    "Cancelled (current)",
    "Reopened",
  ]);
});

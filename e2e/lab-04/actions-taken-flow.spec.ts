import { mkdir } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

import {
  accounts,
  createRequesterTicket,
  expectNoHorizontalOverflow,
  prepareAccount,
  signIn,
  signOut,
  viewports,
} from "./support.js";

// E2E-01, E2E-02 and RESP-03 (docs/lab-04/tests.md).
// Each run creates a fresh Ticket as Jennifer Anderson. Daniel Wilson claims it
// and records work; Sarah Johnson then records work on Daniel's Ticket.

let ticketNumber = "";
const SCREENSHOTS = "artifacts/lab-04/screenshots/actions-taken";
const stamp = Date.now();
const danielAction = `E2E Daniel checked mailbox permissions ${stamp}`;
const sarahAction = `E2E Sarah re-added the shared mailbox ${stamp}`;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await mkdir(SCREENSHOTS, { recursive: true });
  await prepareAccount(accounts.daniel);
  await prepareAccount(accounts.sarah);
  await prepareAccount(accounts.jennifer);
  ticketNumber = await createRequesterTicket(
    accounts.jennifer,
    `Shared mailbox missing (E2E ${stamp})`
  );
});

async function openStaffTicket(page: Page) {
  // Lab 4: staff land on the Dashboard; open the queue from the navigation.
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Staff Ticket Queue" })
    .click();
  await expect(page.getByRole("heading", { name: "IT Staff Ticket Queue" })).toBeVisible();

  const search = page.getByLabel("Search");
  await search.fill(ticketNumber);
  await search.press("Enter");

  const results = page.getByRole("region", { name: "Ticket Queue results" });
  await expect(results.getByText(ticketNumber).first()).toBeVisible();
  await results.getByRole("button", { name: "Open Ticket" }).first().click();

  await expect(page.getByRole("heading", { name: ticketNumber })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Actions Taken \(\d+\)/ })).toBeVisible();
}

async function recordAction(page: Page, description: string, result: string) {
  await page.getByRole("button", { name: "Add Action" }).click();

  const form = page.getByRole("form", { name: "Add Action Taken" });
  await form.getByLabel(/Action Description/).fill(description);
  await form.getByLabel(/^Result/).fill(result);
  await form.getByLabel("Attachment Notes").fill("See mailbox-permissions.png in Attachments.");

  const saved = page.waitForResponse(
    (response) =>
      response.url().includes("/actions-taken") && response.request().method() === "POST"
  );

  await form.getByRole("button", { name: "Save Action" }).click();
  expect((await saved).status()).toBe(201);

  await expect(page.getByText("Action recorded.")).toBeVisible();
  await expect(page.getByRole("cell", { name: description })).toBeVisible();
}

test("E2E-01: two IT Staff members record Actions Taken on one Ticket", async ({ page }) => {
  await page.setViewportSize(viewports.desktop);

  await signIn(page, accounts.daniel);
  await openStaffTicket(page);
  await page.getByRole("button", { name: "Claim Ticket" }).click();
  await expect(page.getByLabel("Ticket Owner")).not.toHaveValue("");
  await recordAction(page, danielAction, "Permissions were missing for the Requester.");
  await signOut(page);

  await signIn(page, accounts.sarah);
  await openStaffTicket(page);
  await recordAction(page, sarahAction, "Mailbox visible in Outlook again.");

  // Both actions are listed oldest first with their own performer.
  const rows = page.locator(".tk-actions-table tbody tr");
  const danielRow = rows.filter({ hasText: danielAction });
  const sarahRow = rows.filter({ hasText: sarahAction });

  await expect(danielRow).toContainText("Daniel Wilson");
  await expect(sarahRow).toContainText("Sarah Johnson");
  await expect(sarahRow).toContainText("Latest");
  await expect(rows).toHaveCount(2);
  // Sarah recorded work, but Daniel is still the Ticket Owner (BR-02).
  await expect(
    page.getByLabel("Ticket Owner").locator("option:checked")
  ).toHaveText(/Daniel Wilson/);

  const descriptions = await rows.locator("td:nth-child(2)").allInnerTexts();
  expect(descriptions.indexOf(danielAction)).toBeLessThan(descriptions.indexOf(sarahAction));

  // Sarah did not record Daniel's action and is not its assignee.
  await danielRow.getByRole("button", { name: /View action/ }).click();
  await expect(page.getByRole("region", { name: "Action Taken details" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Close" }).click();

  // Validation feedback for the Follow-up Note rule.
  await page.getByRole("button", { name: "Add Action" }).click();
  const form = page.getByRole("form", { name: "Add Action Taken" });
  await form.getByLabel(/Action Description/).fill("Validation check");
  await form.getByLabel(/^Result/).fill("Not saved");
  await form.getByLabel("Follow-Up Required?").check();
  await form.getByRole("button", { name: "Save Action" }).click();
  await expect(
    form.getByText("Follow-up Note is required when follow-up is needed.")
  ).toBeVisible();
  await form.screenshot({ path: `${SCREENSHOTS}/create-validation.png` });
  await form.getByRole("button", { name: "Cancel" }).click();

  // RESP-03: responsive list layouts.
  for (const [name, size] of Object.entries(viewports)) {
    await page.setViewportSize(size);
    await page.getByRole("heading", { name: /Actions Taken \(\d+\)/ }).scrollIntoViewIfNeeded();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${SCREENSHOTS}/list-${name}.png`, fullPage: true });
  }

  await page.setViewportSize(viewports.desktop);
  await signOut(page);
});

test("E2E-02: the Requester sees Actions Taken read-only", async ({ page }) => {
  await page.setViewportSize(viewports.desktop);

  await signIn(page, accounts.jennifer);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByText("My Tickets", { exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();

  // Recently updated Tickets are listed first, so the Ticket is on page 1.
  await page
    .getByRole("row")
    .filter({ hasText: ticketNumber })
    .getByRole("button", { name: "View", exact: true })
    .click();

  await expect(page.getByRole("heading", { name: /Actions Taken \(\d+\)/ })).toBeVisible();
  await expect(page.getByText(danielAction)).toBeVisible();
  await expect(page.getByText(sarahAction)).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Action" })).toHaveCount(0);

  await page.getByRole("button", { name: /View action/ }).first().click();
  await expect(page.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);

  await page
    .getByRole("heading", { name: /Actions Taken \(\d+\)/ })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SCREENSHOTS}/requester-readonly.png`, fullPage: true });

  await page.setViewportSize(viewports.mobile);
  await expectNoHorizontalOverflow(page);
});

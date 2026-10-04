import { mkdir } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

import {
  accounts,
  expectNoHorizontalOverflow,
  prepareAccount,
  signIn,
  signOut,
  viewports,
} from "./support.js";

// REG-05, A11Y-02 and the console-error check (docs/lab-04/tests.md).
//
// Labs 1-3 regression through the signed-in application: authentication,
// Create Ticket, My Tickets, Ticket Detail, Attachments, Public Comments,
// "Problem Appears Resolved", IT Staff operations, Internal Notes and
// Administrator User Management. This replaces the Lab 2 E2E flow, which
// depends on the Development Requester selector removed in Lab 3.

const SHOTS = "artifacts/lab-04/screenshots/regression";
const ADMIN = "admin@example.com";
const stamp = Date.now();
const summary = `Monitor flickers (regression ${stamp})`;
const comment = `Regression public comment ${stamp}`;
const internalNote = `Regression internal note ${stamp}`;

// 1x1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

let ticketNumber = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await mkdir(SHOTS, { recursive: true });
  await prepareAccount(accounts.jennifer);
  await prepareAccount(accounts.daniel);
  await prepareAccount(ADMIN);
});

// Fails the test on uncaught page errors or console errors. Expected HTTP
// status responses (e.g. 401 before sign-in) are not application errors.
function watchConsole(page: Page): string[] {
  const errors: string[] = [];

  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().startsWith("Failed to load resource")
    ) {
      errors.push(message.text());
    }
  });

  return errors;
}

function nav(page: Page) {
  return page.getByRole("navigation", { name: "Main navigation" });
}

test("REG-05: a Requester creates a Ticket and uses Lab 2-3 features", async ({ page }) => {
  const errors = watchConsole(page);
  await page.setViewportSize(viewports.desktop);
  await signIn(page, accounts.jennifer);

  // Create Ticket (Lab 2).
  await nav(page).getByRole("button", { name: "Create Ticket" }).click();
  await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
  await expect(page.getByText("Filled in from the current Requester account.")).toBeVisible();

  await page.getByLabel(/^Category/).selectOption({ index: 1 });
  await page.getByLabel(/^Related System/).selectOption({ index: 1 });
  await page.getByLabel(/^Ticket Summary/).fill(summary);
  await page
    .getByLabel(/^Description/)
    .fill("The external monitor flickers every few seconds after docking.");
  await page.getByRole("button", { name: "Submit Ticket" }).click();

  await expect(page.getByText("Ticket created successfully.")).toBeVisible();
  ticketNumber = (await page.getByText(/TKT-\d{4}-\d{6}/).first().innerText()).match(
    /TKT-\d{4}-\d{6}/
  )![0];

  // My Tickets and Ticket Detail (Lab 2).
  await nav(page).getByRole("button", { name: "My Tickets" }).click();
  await page.getByLabel("Search").fill(ticketNumber);
  await page.getByRole("button", { name: "Search" }).click();
  await page
    .getByRole("row")
    .filter({ hasText: ticketNumber })
    .getByRole("button", { name: "View", exact: true })
    .click();
  await expect(page.getByText(summary).first()).toBeVisible();

  // Attachment upload (Lab 2).
  await page.getByLabel("Add Attachment").setInputFiles({
    name: "monitor-photo.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await page.getByRole("button", { name: "Upload Attachment" }).click();
  await expect(page.getByText("Attachment uploaded successfully.")).toBeVisible();
  await expect(page.getByText("monitor-photo.png").first()).toBeVisible();

  // Public Comment and "Problem Appears Resolved" (Lab 3).
  await page.getByLabel("Add Public Comment").fill(comment);
  await page.getByRole("button", { name: "Add Public Comment" }).click();
  await expect(page.getByText("Public Comment added successfully.")).toBeVisible();
  await expect(page.getByText(comment)).toBeVisible();

  await page.getByRole("button", { name: "Problem Appears Resolved" }).click();
  await expect(page.getByText(/^Resolution indication recorded/)).toBeVisible();
  // The indication is advisory: the status is unchanged.
  await expect(page.getByText("New", { exact: true }).first()).toBeVisible();

  await page.screenshot({ path: `${SHOTS}/requester-ticket-detail.png`, fullPage: true });
  await page.setViewportSize(viewports.mobile);
  await expectNoHorizontalOverflow(page);

  await signOut(page);
  expect(errors).toEqual([]);
});

test("REG-05: IT Staff see Requester activity and add a private Internal Note", async ({
  page,
}) => {
  const errors = watchConsole(page);
  await page.setViewportSize(viewports.desktop);
  await signIn(page, accounts.daniel);

  await nav(page).getByRole("button", { name: "Staff Ticket Queue" }).click();
  const search = page.getByLabel("Search");
  await search.fill(ticketNumber);
  await search.press("Enter");
  await page
    .getByRole("region", { name: "Ticket Queue results" })
    .getByRole("button", { name: "Open Ticket" })
    .first()
    .click();

  await expect(page.getByRole("heading", { name: ticketNumber })).toBeVisible();
  await expect(page.getByText(comment)).toBeVisible();
  await expect(page.getByText(/monitor-photo\.png/)).toBeVisible();
  await expect(page.getByText("Requester says problem appears resolved")).toBeVisible();

  await page.getByLabel("Add Internal Note").fill(internalNote);
  await page.getByRole("button", { name: "Add Internal Note" }).click();
  await expect(page.getByText(internalNote)).toBeVisible();

  await signOut(page);

  // The Requester never sees Internal Notes.
  await signIn(page, accounts.jennifer);
  await nav(page).getByRole("button", { name: "My Tickets" }).click();
  await page.getByLabel("Search").fill(ticketNumber);
  await page.getByRole("button", { name: "Search" }).click();
  await page
    .getByRole("row")
    .filter({ hasText: ticketNumber })
    .getByRole("button", { name: "View", exact: true })
    .click();
  await expect(page.getByText(comment)).toBeVisible();
  await expect(page.getByText(internalNote)).toHaveCount(0);

  expect(errors).toEqual([]);
});

test("REG-05: Administrators manage users", async ({ page }) => {
  const errors = watchConsole(page);
  await page.setViewportSize(viewports.desktop);
  await signIn(page, ADMIN);

  await nav(page).getByRole("button", { name: "User Management" }).click();
  await page.getByLabel("Search").fill("kevin");
  await page.getByLabel("Search").press("Enter");
  await expect(page.getByText("kevin.patel@example.com")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/user-management.png`, fullPage: true });

  expect(errors).toEqual([]);
});

test("A11Y-02: keyboard users can reach and activate dashboard drill-downs", async ({
  page,
}) => {
  const errors = watchConsole(page);
  await page.setViewportSize(viewports.desktop);
  await signIn(page, accounts.jennifer);
  await expect(page.getByRole("heading", { name: /^Welcome,/ })).toBeVisible();

  const target = "View all: Waiting for Me";
  let reached = false;

  for (let step = 0; step < 40 && !reached; step += 1) {
    await page.keyboard.press("Tab");
    reached = await page.evaluate(
      (label) => document.activeElement?.getAttribute("aria-label") === label,
      target
    );
  }

  expect(reached, `Tab should reach "${target}"`).toBe(true);

  // Focus is visible.
  const outline = await page.evaluate(() => {
    const style = getComputedStyle(document.activeElement as Element);
    return `${style.outlineStyle} ${style.outlineWidth}`;
  });
  expect(outline).not.toMatch(/^none/);

  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  await expect(page.getByLabel("Status")).toHaveValue("WAITING_FOR_REQUESTER");

  expect(errors).toEqual([]);
});

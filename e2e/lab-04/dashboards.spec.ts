import { mkdir } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import {
  accounts,
  expectNoHorizontalOverflow,
  prepareAccount,
  signIn,
  viewports,
} from "./support.js";

// E2E-05, E2E-06, E2E-07, RESP-01 and RESP-02 (docs/lab-04/tests.md).

const REQUESTER_SHOTS = "artifacts/lab-04/screenshots/requester-dashboard";
const EMPTY_REQUESTER = "ploy.srisuk@example.com";
const STAFF_SHOTS = "artifacts/lab-04/screenshots/staff-dashboard";
const ADMIN = "admin@example.com";
const UNASSIGNED_STAFF = "mali.kaewdee@example.com";
const ACTIVE = "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await mkdir(REQUESTER_SHOTS, { recursive: true });
  await mkdir(STAFF_SHOTS, { recursive: true });
  await prepareAccount(accounts.jennifer);
  await prepareAccount(EMPTY_REQUESTER);
  await prepareAccount(accounts.daniel);
  await prepareAccount(ADMIN);
  await prepareAccount(UNASSIGNED_STAFF);
});

test("E2E-05: the Requester dashboard drills down to filtered My Tickets", async ({ page }) => {
  await page.setViewportSize(viewports.desktop);
  await signIn(page, accounts.jennifer);

  // Signed-in Requesters land on the Dashboard.
  await expect(
    page.getByRole("heading", { name: "Welcome, Jennifer Anderson!" })
  ).toBeVisible();

  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(nav.getByRole("button", { name: "Dashboard" })).toHaveAttribute(
    "aria-current",
    "page"
  );

  const waitingCard = page.getByRole("region", { name: "Waiting for Me" });
  const waitingCount = Number(await waitingCard.locator(".tk-metric-value").innerText());
  expect(waitingCount).toBeGreaterThan(0);

  // RESP-01 and screenshots.
  for (const [name, size] of Object.entries(viewports)) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${REQUESTER_SHOTS}/${name}.png`, fullPage: true });
  }
  await page.setViewportSize(viewports.desktop);

  // Drill down: My Tickets opens with the status filter applied and visible.
  await waitingCard.getByRole("button", { name: "View all: Waiting for Me" }).click();

  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  await expect(page.getByLabel("Status")).toHaveValue("WAITING_FOR_REQUESTER");

  const rows = page.locator("table tbody tr");
  await expect(rows).toHaveCount(Math.min(waitingCount, 10));

  for (const text of await rows.allInnerTexts()) {
    expect(text).toContain("Waiting For Requester");
  }

  // Back to the dashboard and open a recent Ticket.
  await nav.getByRole("button", { name: "Dashboard" }).click();

  const recent = page.getByRole("region", { name: "Recently Updated" });
  const firstTicket = recent.locator(".tk-dashboard-ticket-link").first();
  const ticketNumber = await firstTicket.innerText();
  await firstTicket.click();

  await expect(page.getByText(ticketNumber).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /Actions Taken \(\d+\)/ })).toBeVisible();
});

test("E2E-05: a Requester with no Tickets sees zero metrics and empty lists", async ({ page }) => {
  await page.setViewportSize(viewports.desktop);
  await signIn(page, EMPTY_REQUESTER);

  await expect(page.getByRole("heading", { name: "Welcome, Ploy Srisuk!" })).toBeVisible();

  const values = await page.locator(".tk-metric-value").allInnerTexts();
  expect(values).toEqual(["0", "0", "0", "0"]);

  await expect(page.getByText("No tickets updated in the last 7 days.")).toBeVisible();
  await expect(page.getByText("No recently resolved tickets.")).toBeVisible();

  await page.screenshot({ path: `${REQUESTER_SHOTS}/empty.png`, fullPage: true });
});

test("E2E-06: the IT Staff dashboard drills down to the filtered Ticket Queue", async ({ page }) => {
  await page.setViewportSize(viewports.desktop);
  await signIn(page, accounts.daniel);

  await expect(page.getByRole("heading", { name: "Welcome back, Daniel Wilson!" })).toBeVisible();

  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(nav.getByRole("button", { name: "Dashboard" })).toHaveAttribute(
    "aria-current",
    "page"
  );
  await expect(nav.getByRole("button", { name: "User Management" })).toHaveCount(0);

  // RESP-02 and screenshots.
  for (const [name, size] of Object.entries(viewports)) {
    await page.setViewportSize(size);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${STAFF_SHOTS}/${name}.png`, fullPage: true });
  }
  await page.setViewportSize(viewports.desktop);

  // The Unassigned count matches the queue total for the same filter.
  const unassignedCard = page.getByRole("region", { name: "Unassigned" });
  const unassigned = Number(await unassignedCard.locator(".tk-metric-value").innerText());
  expect(unassigned).toBeGreaterThan(0);

  await unassignedCard.getByRole("button", { name: "View in queue: Unassigned" }).click();

  await expect(page.getByRole("heading", { name: "IT Staff Ticket Queue" })).toBeVisible();
  await expect(page.getByLabel("Status")).toHaveValue(ACTIVE);
  await expect(page.getByLabel("Assignment")).toHaveValue("unassigned");
  await expect(page.locator(".tk-queue-summary")).toHaveText(
    `${unassigned} Ticket${unassigned === 1 ? "" : "s"} found`
  );

  // A status chip drills down to that status.
  await nav.getByRole("button", { name: "Dashboard" }).click();
  await page.getByRole("button", { name: /^Resolved: \d+\./ }).click();
  await expect(page.getByLabel("Status")).toHaveValue("RESOLVED");

  // Urgent Tickets open Ticket Detail.
  await nav.getByRole("button", { name: "Dashboard" }).click();
  const urgent = page.getByRole("region", { name: /^Urgent/ });
  const first = urgent.locator(".tk-dashboard-ticket-link").first();
  const ticketNumber = await first.innerText();
  await first.click();
  await expect(page.getByRole("heading", { name: ticketNumber })).toBeVisible();
});

test("E2E-06: a staff member with no assigned Tickets sees zero My Assigned", async ({ page }) => {
  await page.setViewportSize(viewports.desktop);
  await signIn(page, UNASSIGNED_STAFF);

  const myAssigned = page.getByRole("region", { name: "My Assigned" });
  await expect(myAssigned.locator(".tk-metric-value")).toHaveText("0");
});

test("E2E-07: Administrators see user counts, the Ticket Queue and User Management", async ({ page }) => {
  await page.setViewportSize(viewports.desktop);
  await signIn(page, ADMIN);

  await expect(page.getByRole("heading", { name: /^Welcome back,/ })).toBeVisible();

  const users = page.getByRole("region", { name: "Active Users" });
  await expect(users).toBeVisible();
  await page.screenshot({ path: `${STAFF_SHOTS}/admin.png`, fullPage: true });

  const nav = page.getByRole("navigation", { name: "Main navigation" });

  await nav.getByRole("button", { name: "Staff Ticket Queue" }).click();
  await expect(page.getByRole("heading", { name: "IT Staff Ticket Queue" })).toBeVisible();

  await nav.getByRole("button", { name: "Dashboard" }).click();
  await users.getByRole("button", { name: /Manage users/ }).click();
  await expect(nav.getByRole("button", { name: "User Management" })).toHaveAttribute(
    "aria-current",
    "page"
  );
});

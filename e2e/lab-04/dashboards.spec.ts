import { mkdir } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import {
  accounts,
  expectNoHorizontalOverflow,
  prepareAccount,
  signIn,
  viewports,
} from "./support.js";

// E2E-05 and RESP-01 (docs/lab-04/tests.md). Staff dashboard tests are
// added with Issue #60.

const REQUESTER_SHOTS = "artifacts/lab-04/screenshots/requester-dashboard";
const EMPTY_REQUESTER = "ploy.srisuk@example.com";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await mkdir(REQUESTER_SHOTS, { recursive: true });
  await prepareAccount(accounts.jennifer);
  await prepareAccount(EMPTY_REQUESTER);
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

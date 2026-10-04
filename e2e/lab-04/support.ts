import { expect, request, type Page } from "@playwright/test";

// Shared Lab 4 E2E helpers.
//
// Required environment (local test database only, never committed):
//   LAB3_INITIAL_PASSWORD  password the seed gives every account
//   LAB4_E2E_PASSWORD      password the E2E accounts are moved to on first run

const API_URL = "http://localhost:3000";
const CLIENT_ORIGIN = "http://localhost:5173";

export const accounts = {
  daniel: "daniel.wilson@example.com",
  sarah: "sarah.johnson@example.com",
  jennifer: "jennifer.anderson@example.com",
};

export const viewports = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
};

function requireEnvironment(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Set ${name} before running the Lab 4 E2E tests.`);
  }

  return value;
}

export function e2ePassword(): string {
  return requireEnvironment("LAB4_E2E_PASSWORD");
}

/**
 * Makes sure the account can sign in with LAB4_E2E_PASSWORD. A freshly
 * seeded account still has the initial password, so it is changed once
 * through the normal change-password API.
 */
export async function prepareAccount(email: string): Promise<void> {
  const api = await request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: { Origin: CLIENT_ORIGIN },
  });

  try {
    const password = e2ePassword();
    const ready = await api.post("/api/auth/login", { data: { email, password } });

    if (ready.ok()) {
      const body = await ready.json();
      expect(body.requiresPasswordChange).toBe(false);
      return;
    }

    const initialPassword = requireEnvironment("LAB3_INITIAL_PASSWORD");
    const login = await api.post("/api/auth/login", {
      data: { email, password: initialPassword },
    });

    expect(login.ok(), `Unable to sign in as ${email} with either password.`).toBe(true);

    const change = await api.post("/api/auth/change-password", {
      data: {
        currentPassword: initialPassword,
        newPassword: password,
        confirmPassword: password,
      },
    });

    expect(change.ok(), `Unable to set the E2E password for ${email}.`).toBe(true);
  } finally {
    await api.dispose();
  }
}

/**
 * Creates a new Ticket as the Requester through the normal API, so each
 * run works on fresh data instead of piling actions onto seeded Tickets.
 */
export async function createRequesterTicket(
  email: string,
  summary: string
): Promise<string> {
  const api = await request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: { Origin: CLIENT_ORIGIN },
  });

  try {
    const login = await api.post("/api/auth/login", {
      data: { email, password: e2ePassword() },
    });
    expect(login.ok()).toBe(true);

    const categories = (await (await api.get("/api/categories")).json()) as {
      id: number;
    }[];
    const systems = (await (await api.get("/api/related-systems")).json()) as {
      relatedSystems: { id: number }[];
    };

    const created = await api.post("/api/tickets", {
      data: {
        clientSubmissionId: `e2e-lab4-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        categoryId: categories[0].id,
        relatedSystemId: systems.relatedSystems[0].id,
        summary,
        description: "Created by the Lab 4 E2E test to verify Actions Taken.",
        requestedPriority: "MEDIUM",
      },
    });

    expect(created.status(), await created.text()).toBe(201);

    const body = (await created.json()) as { ticket: { ticketNumber: string } };
    return body.ticket.ticketNumber;
  } finally {
    await api.dispose();
  }
}

export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(e2ePassword());
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function signOut(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Sign out|Log out|Logout/i }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );

  expect(overflow).toBeLessThanOrEqual(0);
}

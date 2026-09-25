import {
  expect,
  test,
  type Locator,
  type Page,
} from "@playwright/test";

import {
  mkdir,
} from "node:fs/promises";

const screenshotDirectories = [
  "artifacts/lab-03/screenshots/staff-queue",
  "artifacts/lab-03/screenshots/ticket-detail",
];

test.beforeAll(async () => {
  await Promise.all(
    screenshotDirectories.map(
      (directory) =>
        mkdir(directory, {
          recursive: true,
        })
    )
  );
});

function requireEnvironment(
  name: string
) {
  const value =
    process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Set ${name} before running the Lab 3 E2E test.`
    );
  }

  return value;
}

async function signIn(
  page: Page
) {
  const email =
    process.env.LAB3_E2E_EMAIL?.trim() ??
    "daniel.wilson@example.com";

  const password =
    requireEnvironment(
      "LAB3_E2E_PASSWORD"
    );

  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Sign in",
    })
  ).toBeVisible();

  await page
    .getByLabel("Email")
    .fill(email);

  await page
    .getByLabel("Password")
    .fill(password);

  await page
    .getByRole("button", {
      name: "Sign in",
    })
    .click();

  const initialPasswordHeading =
    page.getByRole("heading", {
      name: "Change initial password",
    });

  if (
    await initialPasswordHeading
      .isVisible()
      .catch(() => false)
  ) {
    throw new Error(
      "The E2E IT Staff account must complete its initial password change before this test runs."
    );
  }

  await expect(
    page.getByRole("heading", {
      name: "IT Staff Ticket Queue",
    })
  ).toBeVisible();
}

async function waitForStaffMutation(
  page: Page
) {
  return page.waitForResponse(
    (response) => {
      const method =
        response
          .request()
          .method();

      return (
        response
          .url()
          .includes(
            "/api/staff/tickets/"
          ) &&
        method !== "GET" &&
        method !== "OPTIONS"
      );
    }
  );
}

async function differentOption(
  select: Locator,
  currentValue: string
) {
  const options =
    await select
      .locator("option")
      .evaluateAll(
        (elements) =>
          elements.map(
            (element) => {
              const option =
                element as HTMLOptionElement;

              return {
                value:
                  option.value,
                disabled:
                  option.disabled,
              };
            }
          )
      );

  return options.find(
    (option) =>
      option.value !== "" &&
      option.value !==
        currentValue &&
      !option.disabled
  )?.value;
}

test(
  "IT Staff completes the authenticated Ticket workflow",
  async ({
    page,
  }) => {
    await page.setViewportSize({
      width: 1440,
      height: 900,
    });

    await signIn(page);

    await page.screenshot({
      path:
        "artifacts/lab-03/screenshots/staff-queue/desktop.png",

      fullPage: true,
    });

    const queueResults =
      page.getByRole("region", {
        name:
          "Ticket Queue results",
      });

    await expect(
      queueResults
    ).toBeVisible();

    const openTicket =
      queueResults
        .getByRole("button", {
          name: "Open Ticket",
        })
        .first();

    await expect(
      openTicket,
      "The test database must contain at least one Ticket."
    ).toBeVisible();

    await openTicket.click();

    const owner =
      page.getByLabel(
        "Ticket Owner"
      );

    const priority =
      page.getByLabel(
        "IT Priority"
      );

    const status =
      page.getByLabel(
        "Status"
      );

    await expect(owner).toBeVisible();
    await expect(priority).toBeVisible();
    await expect(status).toBeVisible();

    const claimButton =
      page.getByRole("button", {
        name: "Claim Ticket",
      });

    if (
      await claimButton
        .isVisible()
        .catch(() => false)
    ) {
      const claimResponsePromise =
        waitForStaffMutation(
          page
        );

      await claimButton.click();

      const claimResponse =
        await claimResponsePromise;

      expect(
        claimResponse.ok()
      ).toBe(true);

      await expect(owner)
        .not.toHaveValue("");
    }

    const currentOwner =
      await owner.inputValue();

    const newOwner =
      await differentOption(
        owner,
        currentOwner
      );

    expect(
      newOwner,
      "A second active operational staff member is required for reassignment."
    ).toBeTruthy();

    const assignmentResponsePromise =
      waitForStaffMutation(
        page
      );

    await owner.selectOption(
      newOwner!
    );

    const assignmentResponse =
      await assignmentResponsePromise;

    expect(
      assignmentResponse.ok()
    ).toBe(true);

    await expect(owner)
      .toHaveValue(newOwner!);

    const currentPriority =
      await priority.inputValue();

    const newPriority =
      currentPriority === "HIGH"
        ? "MEDIUM"
        : "HIGH";

    const priorityResponsePromise =
      waitForStaffMutation(
        page
      );

    await priority.selectOption(
      newPriority
    );

    const priorityResponse =
      await priorityResponsePromise;

    expect(
      priorityResponse.ok()
    ).toBe(true);

    await expect(priority)
      .toHaveValue(newPriority);

    const currentStatus =
      await status.inputValue();

    const nextStatusByCurrent:
      Record<string, string> = {
        NEW: "OPEN",
        OPEN: "IN_PROGRESS",
        IN_PROGRESS:
          "WAITING_FOR_REQUESTER",
        WAITING_FOR_REQUESTER:
          "IN_PROGRESS",
        RESOLVED: "CLOSED",
        CLOSED: "REOPENED",
        REOPENED: "IN_PROGRESS",
      };

    const newStatus =
      nextStatusByCurrent[
        currentStatus
      ];

    if (newStatus) {
      const statusResponsePromise =
        waitForStaffMutation(
          page
        );

      await status.selectOption(
        newStatus
      );

      const statusResponse =
        await statusResponsePromise;

      expect(
        statusResponse.ok()
      ).toBe(true);

      await expect(status)
        .toHaveValue(newStatus);
    }

    const marker =
      Date.now();

    const publicComment =
      `Lab 3 E2E public comment ${marker}`;

    await page
      .getByLabel(
        "Add Public Comment"
      )
      .fill(publicComment);

    const commentResponsePromise =
      waitForStaffMutation(
        page
      );

    await page
      .getByRole("button", {
        name:
          "Add Public Comment",
      })
      .click();

    const commentResponse =
      await commentResponsePromise;

    expect(
      commentResponse.ok()
    ).toBe(true);

    await expect(
      page.getByText(
        publicComment,
        {
          exact: true,
        }
      )
    ).toBeVisible();

    const internalNote =
      `Lab 3 E2E internal note ${marker}`;

    await page
      .getByLabel(
        "Add Internal Note"
      )
      .fill(internalNote);

    const noteResponsePromise =
      waitForStaffMutation(
        page
      );

    await page
      .getByRole("button", {
        name:
          "Add Internal Note",
      })
      .click();

    const noteResponse =
      await noteResponsePromise;

    expect(
      noteResponse.ok()
    ).toBe(true);

    await expect(
      page.getByText(
        internalNote,
        {
          exact: true,
        }
      )
    ).toBeVisible();

    await page.screenshot({
      path:
        "artifacts/lab-03/screenshots/ticket-detail/desktop.png",

      fullPage: true,
    });

    await page
      .getByRole("button", {
        name:
          "Staff Ticket Queue",
      })
      .click();

    await expect(
      page.getByRole("heading", {
        name:
          "IT Staff Ticket Queue",
      })
    ).toBeVisible();

    await page.setViewportSize({
      width: 390,
      height: 844,
    });

    await page.screenshot({
      path:
        "artifacts/lab-03/screenshots/staff-queue/mobile.png",

      fullPage: true,
    });

    const hasQueueOverflow =
      await page.evaluate(
        () =>
          document
            .documentElement
            .scrollWidth >
          document
            .documentElement
            .clientWidth
      );

    expect(
      hasQueueOverflow
    ).toBe(false);

    await page
      .getByRole("region", {
        name:
          "Ticket Queue results",
      })
      .getByRole("button", {
        name: "Open Ticket",
      })
      .first()
      .click();

    await expect(
      page.getByLabel(
        "Ticket Owner"
      )
    ).toBeVisible();

    await page.screenshot({
      path:
        "artifacts/lab-03/screenshots/ticket-detail/mobile.png",

      fullPage: true,
    });

    const hasDetailOverflow =
      await page.evaluate(
        () =>
          document
            .documentElement
            .scrollWidth >
          document
            .documentElement
            .clientWidth
      );

    expect(
      hasDetailOverflow
    ).toBe(false);

    await page
      .getByRole("button", {
        name: "Sign out",
      })
      .click();

    await expect(
      page.getByRole("heading", {
        name: "Sign in",
      })
    ).toBeVisible();
  }
);

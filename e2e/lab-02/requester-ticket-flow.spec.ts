import {
  expect,
  test,
  type Page,
} from "@playwright/test";

import {
  mkdir,
} from "node:fs/promises";

import {
  Buffer,
} from "node:buffer";

const API_URL =
  "http://127.0.0.1:3000";

const screenshotDirectories = [
  "artifacts/lab-02/screenshots/create-ticket",
  "artifacts/lab-02/screenshots/my-tickets",
  "artifacts/lab-02/screenshots/ticket-detail",
];

test.beforeAll(async () => {
  await Promise.all(
    screenshotDirectories.map(
      (directory) =>
        mkdir(
          directory,
          {
            recursive: true,
          }
        )
    )
  );
});

// ============================================================
// Helpers
// ============================================================

async function selectRequester(
  page: Page,
  optionNumber = 1
) {
  await page.goto("/");

  const requesterSelect =
    page.getByLabel(
      /development requester/i
    );

  await expect(
    requesterSelect
  ).toBeVisible();

  const options =
    requesterSelect.locator(
      "option"
    );

  const optionCount =
    await options.count();

  expect(
    optionCount
  ).toBeGreaterThan(
    optionNumber
  );

  const option =
    options.nth(
      optionNumber
    );

  const value =
    await option.getAttribute(
      "value"
    );

  const name =
    (
      await option.textContent()
    )?.trim();

  expect(value).toBeTruthy();
  expect(name).toBeTruthy();

  await requesterSelect.selectOption(
    value!
  );

  await page
    .getByRole(
      "button",
      {
        name:
          /^continue$/i,
      }
    )
    .click();

  await expect(
    page.getByRole(
      "heading",
      {
        name:
          /^create ticket$/i,
      }
    )
  ).toBeVisible();

  return {
    id: value!,
    name: name!,
  };
}

async function chooseFirstRealOption(
  page: Page,
  label: RegExp | string
) {
  const select =
    page.getByLabel(label);

  await expect(
    select
  ).toBeVisible();

  const options =
    select.locator("option");

  /*
   * Category and Related System data are loaded
   * asynchronously after the Create Ticket screen appears.
   *
   * Wait until the placeholder + at least one real option
   * are available instead of checking immediately.
   */
  await expect
    .poll(
      async () =>
        options.count(),
      {
        timeout: 10_000,
      }
    )
    .toBeGreaterThan(1);

  const value =
    await options
      .nth(1)
      .getAttribute("value");

  expect(value).toBeTruthy();

  await select.selectOption(
    value!
  );
}
function getVisibleTicketList(
  page: Page
) {
  const width =
    page.viewportSize()
      ?.width ?? 1280;

  /*
   * App.tsx intentionally renders both:
   *
   * desktop/tablet table:
   *   .d-none.d-md-block
   *
   * mobile cards:
   *   .d-md-none
   *
   * Bootstrap hides one depending on width.
   * Select the correct container explicitly
   * so Playwright never grabs hidden content.
   */
  if (width < 768) {
    return page.locator(
      ".d-md-none"
    );
  }

  return page.locator(
    ".d-none.d-md-block"
  );
}

async function createTicket(
  page: Page,
  summary: string
) {
  await chooseFirstRealOption(
    page,
    /^category/i
  );

  await chooseFirstRealOption(
    page,
    /^related system/i
  );

  await page
    .getByLabel(
      /ticket summary/i
    )
    .fill(summary);

  await page
    .getByLabel(
      /requested priority/i
    )
    .selectOption(
      "HIGH"
    );

  await page
    .getByLabel(
      /^description/i
    )
    .fill(
      "End-to-end Lab 2 test ticket created automatically by Playwright."
    );

  const createResponsePromise =
    page.waitForResponse(
      (response) =>
        response
          .url()
          .endsWith(
            "/api/tickets"
          ) &&
        response
          .request()
          .method() ===
          "POST"
    );

  await page
    .getByRole(
      "button",
      {
        name:
          /submit ticket/i,
      }
    )
    .click();

  const createResponse =
    await createResponsePromise;

  expect(
    createResponse.status()
  ).toBe(201);

  const body =
    (await createResponse.json()) as {
      ticket: {
        id: number;
        ticketNumber: string;
      };
    };

  expect(
    body.ticket.ticketNumber
  ).toMatch(
    /^TKT-\d{4}-\d{6}$/
  );

  await expect(
    page.getByText(
      /ticket created successfully/i
    )
  ).toBeVisible();

  return {
    ticketId:
      body.ticket.id,

    ticketNumber:
      body.ticket
        .ticketNumber,
  };
}

async function openTicketFromMyTickets(
  page: Page,
  summary: string
) {
  await page
    .getByRole(
      "button",
      {
        name:
          /^my tickets$/i,
      }
    )
    .click();

  await expect(
    page.getByRole(
      "heading",
      {
        name:
          /^my tickets$/i,
      }
    )
  ).toBeVisible();

  const search =
    page.getByLabel(
      /^search$/i
    );

  await expect(
    search
  ).toBeVisible();

  await search.fill(
    summary
  );

  await page
    .getByRole(
      "button",
      {
        name:
          /^search$/i,
      }
    )
    .click();

  const ticketList =
    getVisibleTicketList(
      page
    );

  const summaryResult =
    ticketList
      .getByText(
        summary,
        {
          exact: true,
        }
      )
      .first();

  await expect(
    summaryResult
  ).toBeVisible();

  const viewButton =
    ticketList
      .getByRole(
        "button",
        {
          name:
            /^view( ticket)?$/i,
        }
      )
      .first();

  await expect(
    viewButton
  ).toBeVisible();

  await viewButton.click();

  await expect(
    page.getByRole(
      "heading",
      {
        name:
          /^ticket detail$/i,
      }
    )
  ).toBeVisible();
}

async function selectSecondRequester(
  page: Page
) {
  await page
    .getByRole(
      "button",
      {
        name:
          /change requester/i,
      }
    )
    .click();

  const requesterSelect =
    page.getByLabel(
      /development requester/i
    );

  await expect(
    requesterSelect
  ).toBeVisible();

  const options =
    requesterSelect.locator(
      "option"
    );

  const count =
    await options.count();

  expect(count).toBeGreaterThan(
    2
  );

  const secondRequester =
    options.nth(2);

  const value =
    await secondRequester.getAttribute(
      "value"
    );

  expect(value).toBeTruthy();

  await requesterSelect.selectOption(
    value!
  );

  await page
    .getByRole(
      "button",
      {
        name:
          /^continue$/i,
      }
    )
    .click();

  await expect(
    page.getByRole(
      "heading",
      {
        name:
          /^create ticket$/i,
      }
    )
  ).toBeVisible();

  return value!;
}

// ============================================================
// Complete Requester + Attachment Lifecycle
// ============================================================

test(
  "Requester completes Ticket and Attachment lifecycle with ownership isolation",

  async ({
    page,
  }) => {
    const uniqueMarker =
      Date.now();

    const summary =
      `E2E Laptop issue ${uniqueMarker}`;

    // --------------------------------------------------------
    // Select Requester A
    // --------------------------------------------------------

    const requesterA =
      await selectRequester(
        page,
        1
      );

    expect(
      requesterA.id
    ).toBeTruthy();

    // --------------------------------------------------------
    // Create Ticket
    // --------------------------------------------------------

    const {
      ticketId,
      ticketNumber,
    } =
      await createTicket(
        page,
        summary
      );

    // --------------------------------------------------------
    // Find Ticket through My Tickets
    // --------------------------------------------------------

    await openTicketFromMyTickets(
      page,
      summary
    );

    await expect(
      page.getByText(
        ticketNumber,
        {
          exact: true,
        }
      )
    ).toBeVisible();

    // --------------------------------------------------------
    // Upload Attachment
    // --------------------------------------------------------

    const attachmentInput =
      page.getByLabel(
        /add attachment/i
      );

    await expect(
      attachmentInput
    ).toBeVisible();

    await attachmentInput.setInputFiles(
      {
        name:
          "e2e-evidence.pdf",

        mimeType:
          "application/pdf",

        buffer:
          Buffer.from(
            "%PDF-1.4\nTokTickIT Lab 2 E2E evidence\n%%EOF"
          ),
      }
    );

    const uploadResponsePromise =
      page.waitForResponse(
        (response) =>
          response
            .url()
            .endsWith(
              `/api/tickets/${ticketId}/attachments`
            ) &&
          response
            .request()
            .method() ===
            "POST"
      );

    await page
      .getByRole(
        "button",
        {
          name:
            /upload attachment/i,
        }
      )
      .click();

    const uploadResponse =
      await uploadResponsePromise;

    expect(
      uploadResponse.status()
    ).toBe(201);

    const uploadBody =
      (await uploadResponse.json()) as {
        attachment: {
          id: number;
          originalFilename:
            string;
        };
      };

    const attachmentId =
      uploadBody.attachment.id;

    expect(
      attachmentId
    ).toBeGreaterThan(0);

    await expect(
      page.getByText(
        /attachment uploaded successfully/i
      )
    ).toBeVisible();

    await expect(
      page.getByText(
        "e2e-evidence.pdf"
      )
    ).toBeVisible();

    // --------------------------------------------------------
    // Download through the UI
    // --------------------------------------------------------

    const downloadButton =
      page.getByRole(
        "button",
        {
          name:
            /download e2e-evidence\.pdf/i,
        }
      );

    await expect(
      downloadButton
    ).toBeVisible();

    /*
     * The application downloads through:
     *
     * fetch -> Blob -> temporary <a>
     *
     * Waiting for the actual browser "download"
     * event is unnecessarily flaky.
     *
     * Instead verify that clicking the real UI
     * button reaches the protected download API
     * and receives HTTP 200.
     */
    const downloadResponsePromise =
      page.waitForResponse(
        (response) =>
          response
            .url()
            .endsWith(
              `/api/attachments/${attachmentId}/download`
            ) &&
          response
            .request()
            .method() ===
            "GET"
      );

    await downloadButton.click();

    const downloadResponse =
      await downloadResponsePromise;

    expect(
      downloadResponse.status()
    ).toBe(200);

    // --------------------------------------------------------
    // Soft Remove
    // --------------------------------------------------------

    await page
      .getByRole(
        "button",
        {
          name:
            /remove e2e-evidence\.pdf/i,
        }
      )
      .click();

    const reasonInput =
      page.getByLabel(
        /removal reason/i
      );

    await expect(
      reasonInput
    ).toBeVisible();

    await reasonInput.fill(
      "E2E soft removal verification"
    );

    const removalResponsePromise =
      page.waitForResponse(
        (response) =>
          response
            .url()
            .endsWith(
              `/api/attachments/${attachmentId}`
            ) &&
          response
            .request()
            .method() ===
            "DELETE"
      );

    await page
      .getByRole(
        "button",
        {
          name:
            /confirm remove/i,
        }
      )
      .click();

    const removalResponse =
      await removalResponsePromise;

    expect(
      removalResponse.status()
    ).toBe(200);

    await expect(
      page.getByText(
        /removed attachments/i
      )
    ).toBeVisible();

    await expect(
      page.getByText(
        /e2e soft removal verification/i
      )
    ).toBeVisible();

    // Removed file remains as metadata.
    await expect(
      page.getByText(
        "e2e-evidence.pdf"
      )
    ).toBeVisible();

    // But the Download action disappears.
    await expect(
      page.getByRole(
        "button",
        {
          name:
            /download e2e-evidence\.pdf/i,
        }
      )
    ).toHaveCount(0);

    // --------------------------------------------------------
    // Backend must also reject removed-file download
    // --------------------------------------------------------

    const removedDownload =
      await page.request.get(
        `${API_URL}/api/attachments/${attachmentId}/download`,

        {
          headers: {
            "X-Development-Requester-Id":
              requesterA.id,
          },
        }
      );

    expect(
      removedDownload.status()
    ).toBe(404);

    // --------------------------------------------------------
    // Switch to Requester B
    // --------------------------------------------------------

    const requesterBId =
      await selectSecondRequester(
        page
      );

    expect(
      requesterBId
    ).not.toBe(
      requesterA.id
    );

    // --------------------------------------------------------
    // Requester B must not find Requester A's Ticket
    // --------------------------------------------------------

    await page
      .getByRole(
        "button",
        {
          name:
            /^my tickets$/i,
        }
      )
      .click();

    await expect(
      page.getByRole(
        "heading",
        {
          name:
            /^my tickets$/i,
        }
      )
    ).toBeVisible();

    await page
      .getByLabel(
        /^search$/i
      )
      .fill(summary);

    await page
      .getByRole(
        "button",
        {
          name:
            /^search$/i,
        }
      )
      .click();

    await expect(
      page.getByText(
        /no tickets match your current search or filters/i
      )
    ).toBeVisible();

    // --------------------------------------------------------
    // Direct ownership API check
    // --------------------------------------------------------

    const forbiddenTicket =
      await page.request.get(
        `${API_URL}/api/tickets/${ticketId}`,

        {
          headers: {
            "X-Development-Requester-Id":
              requesterBId,
          },
        }
      );

    expect(
      forbiddenTicket.status()
    ).toBe(404);

    const forbiddenAttachment =
      await page.request.get(
        `${API_URL}/api/attachments/${attachmentId}/download`,

        {
          headers: {
            "X-Development-Requester-Id":
              requesterBId,
          },
        }
      );

    expect(
      forbiddenAttachment.status()
    ).toBe(404);
  }
);

// ============================================================
// Responsive Evidence
// ============================================================

const responsiveCases = [
  {
    name:
      "desktop",

    width: 1440,
    height: 900,
  },

  {
    name:
      "tablet",

    width: 820,
    height: 1180,
  },

  {
    name:
      "mobile",

    width: 390,
    height: 844,
  },
];

for (
  const viewport of
  responsiveCases
) {
  test(
    `responsive ${viewport.name} Create Ticket, My Tickets, and Ticket Detail screenshots`,

    async ({
      page,
    }) => {
      await page.setViewportSize(
        {
          width:
            viewport.width,

          height:
            viewport.height,
        }
      );

      const uniqueMarker =
        `${viewport.name}-${Date.now()}`;

      const summary =
        `Responsive ${uniqueMarker}`;

      // ------------------------------------------------------
      // Select Requester
      // ------------------------------------------------------

      await selectRequester(
        page,
        1
      );

      // ------------------------------------------------------
      // Create Ticket screenshot
      // ------------------------------------------------------

      await page.screenshot({
        path:
          `artifacts/lab-02/screenshots/create-ticket/${viewport.name}.png`,

        fullPage: true,
      });

      // ------------------------------------------------------
      // Create Ticket
      // ------------------------------------------------------

      await createTicket(
        page,
        summary
      );

      // ------------------------------------------------------
      // My Tickets
      // ------------------------------------------------------

      await page
        .getByRole(
          "button",
          {
            name:
              /^my tickets$/i,
          }
        )
        .click();

      await expect(
        page.getByRole(
          "heading",
          {
            name:
              /^my tickets$/i,
          }
        )
      ).toBeVisible();

      await page
        .getByLabel(
          /^search$/i
        )
        .fill(summary);

      await page
        .getByRole(
          "button",
          {
            name:
              /^search$/i,
          }
        )
        .click();

      /*
       * Desktop/tablet and mobile ticket layouts
       * both exist in the DOM.
       *
       * Explicitly target whichever Bootstrap
       * layout is visible at this viewport.
       */
      const ticketList =
        getVisibleTicketList(
          page
        );

      const ticketSummary =
        ticketList
          .getByText(
            summary,
            {
              exact: true,
            }
          )
          .first();

      await expect(
        ticketSummary
      ).toBeVisible();

      await page.screenshot({
        path:
          `artifacts/lab-02/screenshots/my-tickets/${viewport.name}.png`,

        fullPage: true,
      });

      // ------------------------------------------------------
      // Open visible Ticket row/card
      // ------------------------------------------------------

      const viewButton =
        ticketList
          .getByRole(
            "button",
            {
              name:
                /^view( ticket)?$/i,
            }
          )
          .first();

      await expect(
        viewButton
      ).toBeVisible();

      await viewButton.click();

      await expect(
        page.getByRole(
          "heading",
          {
            name:
              /^ticket detail$/i,
          }
        )
      ).toBeVisible();

      // ------------------------------------------------------
      // Ticket Detail screenshot
      // ------------------------------------------------------

      await page.screenshot({
        path:
          `artifacts/lab-02/screenshots/ticket-detail/${viewport.name}.png`,

        fullPage: true,
      });

      // ------------------------------------------------------
      // Responsive overflow check
      // ------------------------------------------------------

      const hasHorizontalOverflow =
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
        hasHorizontalOverflow
      ).toBe(false);
    }
  );
}
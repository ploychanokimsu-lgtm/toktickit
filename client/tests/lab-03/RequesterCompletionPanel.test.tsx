import "@testing-library/jest-dom/vitest";

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import RequesterCompletionPanel from "../../src/RequesterCompletionPanel.js";

import {
  addRequesterComment,
  getRequesterComments,
  indicateProblemResolved,
} from "../../src/requester-completion-api.js";

vi.mock(
  "../../src/requester-completion-api.js",
  () => ({
    getRequesterComments: vi.fn(),
    addRequesterComment: vi.fn(),
    indicateProblemResolved:
      vi.fn(),
  })
);

const mockedGetComments =
  vi.mocked(getRequesterComments);

const mockedAddComment =
  vi.mocked(addRequesterComment);

const mockedIndicateResolved =
  vi.mocked(indicateProblemResolved);

const existingComment = {
  id: 1,
  ticketId: 42,
  content:
    "The IT team is investigating.",
  createdAt:
    "2026-09-28T01:00:00.000Z",
  author: {
    id: 10,
    name: "Daniel Wilson",
    role: "IT_STAFF" as const,
  },
};

describe(
  "RequesterCompletionPanel",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();

      mockedGetComments.mockResolvedValue([
        existingComment,
      ]);
    });

    it(
      "loads safe Public Comments",
      async () => {
        render(
          <RequesterCompletionPanel
            ticketId={42}
            initialResolutionIndicatedAt={
              null
            }
            onResolutionRecorded={
              vi.fn()
            }
          />
        );

        expect(
          await screen.findByText(
            "The IT team is investigating."
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            "Daniel Wilson"
          )
        ).toBeInTheDocument();

        expect(
          screen.queryByText(
            /Internal Note/i
          )
        ).not.toBeInTheDocument();

        expect(
          mockedGetComments
        ).toHaveBeenCalledWith(42);
      }
    );

    it(
      "adds a trimmed Public Comment",
      async () => {
        mockedAddComment.mockResolvedValue({
          id: 2,
          ticketId: 42,
          content:
            "Thank you for the update.",
          createdAt:
            "2026-09-28T02:00:00.000Z",
          author: {
            id: 20,
            name: "Test Requester",
            role: "REQUESTER",
          },
        });

        render(
          <RequesterCompletionPanel
            ticketId={42}
            initialResolutionIndicatedAt={
              null
            }
            onResolutionRecorded={
              vi.fn()
            }
          />
        );

        await screen.findByText(
          "The IT team is investigating."
        );

        fireEvent.change(
          screen.getByLabelText(
            "Add Public Comment"
          ),
          {
            target: {
              value:
                "  Thank you for the update.  ",
            },
          }
        );

        fireEvent.click(
          screen.getByRole("button", {
            name:
              "Add Public Comment",
          })
        );

        await waitFor(() => {
          expect(
            mockedAddComment
          ).toHaveBeenCalledWith(
            42,
            "Thank you for the update."
          );
        });

        expect(
          await screen.findByText(
            "Public Comment added successfully."
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            "Thank you for the update."
          )
        ).toBeInTheDocument();
      }
    );

    it(
      "records that the problem appears resolved",
      async () => {
        const recordedAt =
          "2026-09-28T03:00:00.000Z";

        mockedIndicateResolved
          .mockResolvedValue(
            recordedAt
          );

        const onResolutionRecorded =
          vi.fn();

        render(
          <RequesterCompletionPanel
            ticketId={42}
            initialResolutionIndicatedAt={
              null
            }
            onResolutionRecorded={
              onResolutionRecorded
            }
          />
        );

        fireEvent.click(
          screen.getByRole("button", {
            name:
              "Problem Appears Resolved",
          })
        );

        await waitFor(() => {
          expect(
            mockedIndicateResolved
          ).toHaveBeenCalledWith(42);

          expect(
            onResolutionRecorded
          ).toHaveBeenCalledWith(
            recordedAt
          );
        });

        expect(
          screen.getByText(
            /Resolution indication recorded/
          )
        ).toBeInTheDocument();
      }
    );

    it(
      "shows an existing resolution indication without another action button",
      async () => {
        render(
          <RequesterCompletionPanel
            ticketId={42}
            initialResolutionIndicatedAt=
              "2026-09-28T03:00:00.000Z"
            onResolutionRecorded={
              vi.fn()
            }
          />
        );

        expect(
          screen.getByText(
            /Resolution indication recorded/
          )
        ).toBeInTheDocument();

        expect(
          screen.queryByRole(
            "button",
            {
              name:
                "Problem Appears Resolved",
            }
          )
        ).not.toBeInTheDocument();
      }
    );
  }
);
